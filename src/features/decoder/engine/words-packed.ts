/**
 * Serialização compacta do vocabulário do score.
 *
 * POR QUE ISTO EXISTE: as duas wordlists custavam **1,5 MB gzip baixados em toda
 * sessão** e ~192 ms de main thread montando o conjunto — e o desperdício era
 * estrutural, porque baixávamos o texto acentuado só para jogar o acento fora em
 * runtime. Aqui a dobra é feita no build (`scripts/build-words.ts`) e o
 * navegador recebe o vocabulário já pronto: **1.098 KB gzip e 85 ms**.
 *
 * POR QUE NÃO É CONSULTADO DIRETO NOS BYTES: a primeira versão fazia bissecção
 * no buffer, sem nunca materializar as 451 mil strings — 2 MB de heap em vez de
 * 32 MB. Medido, não se pagou: `gluedCoverage` faz ~1.000 consultas por token
 * colado e o fan-out roda ~450 candidatos por tecla, então a busca em bytes
 * custava **+32 ms a cada tecla** (2,5× no `scorePlaintext`) para economizar
 * 192 ms uma vez só. Trocar um custo pontual por um recorrente, justamente ao
 * colar o texto longo que é o uso principal da bancada, é o negócio errado.
 * Ficou a serialização; a consulta continua num `Set`.
 *
 * FORMATO (tudo little-endian):
 *
 *   magic   u32          "DCW1"
 *   count   u32          nº de palavras
 *   bucket  u32          palavras por balde
 *   nBuck   u32          nº de baldes
 *   offs    u32 × nBuck  início de cada balde dentro de `data`
 *   data    bytes        os baldes
 *
 * Cada balde guarda a **primeira palavra inteira** (`u8 len` + bytes) e as
 * seguintes como diferença da anterior (`u8` com o prefixo compartilhado no
 * nibble alto e o tamanho do sufixo no baixo, depois os bytes do sufixo). O
 * balde sobrou do desenho com bissecção; mantê-lo custa ~50 KB e deixa a porta
 * aberta para leitura parcial, caso um dia valha a pena.
 *
 * Os dois nibbles só cabem porque o vocabulário é limitado a 15 letras
 * (`scripts/build-words.ts`, `^[a-z]{2,15}$`). Se esse teto subir, o encoder
 * falha **no build** com mensagem explícita, em vez de gravar lixo que só
 * apareceria como palavra não encontrada no navegador.
 */

/** "DCW1" lido como u32 little-endian. */
const MAGIC = 0x31574344;
const BUCKET = 32;
const HEADER = 16;
/** Teto defensivo do reconstrutor; o vocabulário vai até 15 letras. */
const MAX_WORD = 64;
/** Limite dos nibbles do byte de diferença. */
const MAX_DIFF = 15;

/**
 * O contrato que o score consome — só pertinência. `Set<string>` o satisfaz, e é
 * o que roda tanto em produção quanto nos testes que montam um conjunto à mão.
 */
export interface WordLookup {
  has(word: string): boolean;
}

/** Serializa o vocabulário **já ordenado e deduplicado** (`buildVocabulary`). */
export function encodeWordIndex(sorted: readonly string[]): Uint8Array {
  const count = sorted.length;
  const nBuck = Math.ceil(count / BUCKET);
  let bytes = 0;
  for (const w of sorted) {
    if (w.length > MAX_WORD) throw new Error(`palavra longa demais para o índice: ${w}`);
    if (!/^[a-z]+$/.test(w)) throw new Error(`palavra fora de a–z no índice: ${w}`);
    bytes += w.length + 2;
  }

  const out = new Uint8Array(HEADER + nBuck * 4 + bytes);
  const view = new DataView(out.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, count, true);
  view.setUint32(8, BUCKET, true);
  view.setUint32(12, nBuck, true);

  const dataStart = HEADER + nBuck * 4;
  let pos = dataStart;

  for (let b = 0; b < nBuck; b++) {
    view.setUint32(HEADER + b * 4, pos - dataStart, true);
    const first = b * BUCKET;
    const last = Math.min(first + BUCKET, count);
    let prev = "";
    for (let i = first; i < last; i++) {
      const w = sorted[i];
      if (i === first) {
        out[pos++] = w.length;
        for (let k = 0; k < w.length; k++) out[pos++] = w.charCodeAt(k);
      } else {
        let shared = 0;
        const max = Math.min(prev.length, w.length, MAX_DIFF);
        while (shared < max && prev.charCodeAt(shared) === w.charCodeAt(shared)) shared++;
        const sufLen = w.length - shared;
        if (sufLen > MAX_DIFF) {
          throw new Error(
            `sufixo de ${sufLen} letras não cabe no nibble (máx ${MAX_DIFF}) em "${w}" — o vocabulário passou de 15 letras; reveja o formato em words-packed.ts`,
          );
        }
        out[pos++] = (shared << 4) | sufLen;
        for (let k = shared; k < w.length; k++) out[pos++] = w.charCodeAt(k);
      }
      prev = w;
    }
  }

  return out.subarray(0, pos);
}

/** Lê o índice de volta para a lista de palavras, na ordem gravada. */
export function decodeWordIndex(buffer: ArrayBuffer): string[] {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) {
    throw new Error("índice de palavras inválido (magic não confere)");
  }
  const count = view.getUint32(4, true);
  const bucket = view.getUint32(8, true);
  const nBuck = view.getUint32(12, true);
  const dataStart = HEADER + nBuck * 4;

  const out: string[] = new Array(count);
  const scratch = new Uint8Array(MAX_WORD);
  let n = 0;
  for (let b = 0; b < nBuck; b++) {
    let p = dataStart + view.getUint32(HEADER + b * 4, true);
    const first = b * bucket;
    const last = Math.min(first + bucket, count);
    let len = 0;
    for (let i = first; i < last; i++) {
      if (i === first) {
        len = bytes[p++];
        for (let k = 0; k < len; k++) scratch[k] = bytes[p + k];
        p += len;
      } else {
        const diff = bytes[p++];
        const shared = diff >> 4;
        const sufLen = diff & 0x0f;
        for (let k = 0; k < sufLen; k++) scratch[shared + k] = bytes[p + k];
        p += sufLen;
        len = shared + sufLen;
      }
      let w = "";
      for (let k = 0; k < len; k++) w += String.fromCharCode(scratch[k]);
      out[n++] = w;
    }
  }
  return out;
}
