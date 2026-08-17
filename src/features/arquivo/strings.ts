/**
 * Texto legível dentro do binário.
 *
 * É a ferramenta mais antiga da forense (`strings` existe desde os anos 70) e
 * ainda é a que mais resolve prova: senha esquecida num metadado, nome de
 * arquivo original, comentário de quem montou, URL.
 *
 * ── O FALSO POSITIVO QUE ESTE MÓDULO EXISTE PARA NÃO COMETER ───────────────
 *
 * A leitura UTF-16LE procura `XX 00 XX 00` — que é exatamente a forma do PCM de
 * 16 bits em trecho de baixa amplitude. Um WAV com qualquer passagem silenciosa
 * produz MILHARES de "strings UTF-16", e esta bancada nasce colada num motor de
 * áudio: seria o falso positivo mais provável do sistema inteiro.
 *
 * Duas defesas, e as duas são necessárias:
 *  1. `regioesDeAmostras` — o chamador informa onde ficam as amostras de áudio
 *     (o chunk `data` de um WAV), e ali a leitura UTF-16 não roda.
 *  2. Mesmo fora dessas regiões, UTF-16 exige o dobro de evidência: o corte é
 *     maior, e a cadeia precisa de variedade — `A\0A\0A\0…` é silêncio, não
 *     texto.
 */

export type Codificacao = "ascii" | "utf16le";

export interface TrechoDeTexto {
  texto: string;
  offset: number;
  codificacao: Codificacao;
}

const IMPRIMIVEL = (b: number) => (b >= 0x20 && b < 0x7f) || b === 0x09;

/**
 * Corte mínimo, pela mesma correção de comparações múltiplas do `lsb.ts`: num
 * fluxo aleatório a chance de um byte ser imprimível é 0,375, então os falsos
 * esperados são M × 0,375^L. Resolvendo para menos de 0,01 falso.
 */
export function corteDeTexto(bytesExaminados: number, piso = 6): number {
  if (bytesExaminados <= 0) return piso;
  const l = Math.log(0.01 / bytesExaminados) / Math.log(96 / 256);
  return Math.max(piso, Math.ceil(l));
}

/**
 * Uma cadeia de caracteres iguais não é texto.
 *
 * `AAAAAAAAAAAAAAAA` passa em qualquer teste de "imprimível" e não diz nada —
 * e é a forma que o silêncio digital toma quando lido como texto. Exigir um
 * mínimo de caracteres distintos custa nada e mata a família inteira.
 */
function temVariedade(s: string, minimoDistintos = 5): boolean {
  return new Set(s).size >= minimoDistintos;
}

export interface OpcoesDeBusca {
  /**
   * Faixas `[inicio, fim)` que contêm amostras de áudio/pixels. A leitura
   * UTF-16LE não roda dentro delas — ver o cabeçalho deste módulo.
   */
  regioesDeAmostras?: [number, number][];
  /** Sobrescreve o corte calculado. */
  corte?: number;
  /** Teto de trechos devolvidos, para não travar a tela. */
  max?: number;
}

function dentroDeRegiao(pos: number, regioes: [number, number][]): boolean {
  for (const [a, b] of regioes) if (pos >= a && pos < b) return true;
  return false;
}

export function acharTextos(bytes: Uint8Array, opcoes: OpcoesDeBusca = {}): TrechoDeTexto[] {
  const regioes = opcoes.regioesDeAmostras ?? [];
  const max = opcoes.max ?? 500;
  const corteAscii = opcoes.corte ?? corteDeTexto(bytes.length);
  // UTF-16 varre metade dos bytes como caracteres, mas o padrão `XX 00` é bem
  // mais provável de aparecer por acaso que uma corrida imprimível — daí o
  // acréscimo fixo em cima do corte já calculado.
  const corteUtf16 = corteAscii + 4;

  const achados: TrechoDeTexto[] = [];

  // ── ASCII ────────────────────────────────────────────────────────────────
  let corrida = "";
  let inicio = 0;
  for (let i = 0; i <= bytes.length; i++) {
    const ok = i < bytes.length && IMPRIMIVEL(bytes[i]);
    if (ok) {
      if (corrida === "") inicio = i;
      corrida += String.fromCharCode(bytes[i]);
    } else {
      if (corrida.length >= corteAscii && temVariedade(corrida)) {
        achados.push({ texto: corrida, offset: inicio, codificacao: "ascii" });
        if (achados.length >= max) return achados;
      }
      corrida = "";
    }
  }

  // ── UTF-16LE, com as duas defesas ────────────────────────────────────────
  corrida = "";
  inicio = 0;
  for (let i = 0; i + 1 <= bytes.length; i += 2) {
    const dentro = dentroDeRegiao(i, regioes);
    const ok = !dentro && i + 1 < bytes.length && IMPRIMIVEL(bytes[i]) && bytes[i + 1] === 0;
    if (ok) {
      if (corrida === "") inicio = i;
      corrida += String.fromCharCode(bytes[i]);
    } else {
      if (corrida.length >= corteUtf16 && temVariedade(corrida)) {
        achados.push({ texto: corrida, offset: inicio, codificacao: "utf16le" });
        if (achados.length >= max) return achados;
      }
      corrida = "";
    }
  }

  return achados.sort((a, b) => a.offset - b.offset);
}

/**
 * Blocos que parecem base64 — o esconderijo textual mais comum.
 *
 * Exige tamanho múltiplo de 4 e variedade, porque `AAAAAAAA` é base64 válido e
 * decodifica para zeros.
 */
export function acharBase64(bytes: Uint8Array, minimo = 24): TrechoDeTexto[] {
  const B64 = (b: number) =>
    (b >= 0x41 && b <= 0x5a) ||
    (b >= 0x61 && b <= 0x7a) ||
    (b >= 0x30 && b <= 0x39) ||
    b === 0x2b ||
    b === 0x2f ||
    b === 0x3d;
  const achados: TrechoDeTexto[] = [];
  let corrida = "";
  let inicio = 0;
  for (let i = 0; i <= bytes.length; i++) {
    const ok = i < bytes.length && B64(bytes[i]);
    if (ok) {
      if (corrida === "") inicio = i;
      corrida += String.fromCharCode(bytes[i]);
    } else {
      if (corrida.length >= minimo && corrida.length % 4 === 0 && temVariedade(corrida, 8)) {
        achados.push({ texto: corrida, offset: inicio, codificacao: "ascii" });
      }
      corrida = "";
    }
  }
  return achados;
}
