/** Resolvedor de anagramas: rearranja as letras da entrada em palavras do dicionário. */

/** Menor palavra aceita (o dicionário pt tem 161 chaves de 2 letras — "um" é uma delas). */
const MIN_WORD = 2;
/**
 * Só a PRIMEIRA palavra do par varre um bucket; ela é sempre a metade menor.
 * Acima de 12 letras a entrada precisaria ter 26+ letras, que o gate já recusa.
 * Não bucketizar as chaves longas poupa ~30 mil entradas de índice.
 */
const MAX_BUCKET_LEN = 12;
/** Teto de letras da entrada: acima disso a busca por par vira força bruta cara. */
export const MAX_INPUT_LETTERS = 24;
/** Teto da sobra. Além de 2 letras a "sobra" deixa de ser pista e vira ruído. */
export const MAX_LEFTOVER = 2;
/**
 * Orçamento da busca por par, em unidades: 1 por chave varrida, `PESO_MATCH`
 * por candidato que sobrevive (esse custa um lookup e uma chave montada). Uma
 * entrada longa e cheia de vogais comuns tem dezenas de milhares de divisões
 * válidas; a busca desiste e devolve o que já achou, porque travar a digitação
 * é pior que uma lista incompleta que ninguém ia ler até o fim.
 */
const MAX_WORK = 2_500_000;
const PESO_MATCH = 250;

/** Remove acentos e baixa caixa (para a chave do anagrama). */
export function fold(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFD")) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x300 || c > 0x36f) out += ch;
  }
  return out.toLowerCase();
}

/** Chave canônica: letras a–z ordenadas (acento some, não conta letra). "Roma" → "amor". */
export function anagramKey(word: string): string {
  return [...fold(word)]
    .filter((c) => c >= "a" && c <= "z")
    .sort()
    .join("");
}

interface LenBucket {
  /** Chaves canônicas daquele comprimento. */
  keys: string[];
  /** bit i = letra i presente. Recusa um candidato impossível em uma operação. */
  masks: Int32Array;
}

export interface AnagramIndex {
  /** chave canônica → palavras exibíveis (mesmas letras). */
  byKey: Map<string, string[]>;
  /** nº de letras → bucket, para a varredura da primeira palavra do par. */
  byLen: Map<number, LenBucket>;
}

function maskOf(key: string): number {
  let m = 0;
  for (let i = 0; i < key.length; i++) m |= 1 << (key.charCodeAt(i) - 97);
  return m;
}

/** Vetor de 26 posições com a contagem de cada letra da chave. */
function countsOf(key: string): Int8Array {
  const v = new Int8Array(26);
  for (let i = 0; i < key.length; i++) v[key.charCodeAt(i) - 97]++;
  return v;
}

/**
 * Vetor de contagens → chave canônica (letras ordenadas). É a operação mais
 * quente da busca por par (uma por candidato que sobrevive), então monta os
 * códigos num buffer reusado em vez de concatenar 26 pedaços de string.
 */
const codeBuf = new Array<number>(MAX_INPUT_LETTERS);
function keyOfCounts(v: Int8Array): string {
  let len = 0;
  for (let i = 0; i < 26; i++) for (let n = v[i]; n > 0; n--) codeBuf[len++] = 97 + i;
  return String.fromCharCode(...codeBuf.slice(0, len));
}

/**
 * `alvo` − `key`, escrito em `out`. Falsa quando alguma posição ficaria negativa
 * (a palavra usa uma letra que a entrada não tem, ou usa demais). A chave é
 * percorrida caractere a caractere em vez de guardarmos um vetor por chave:
 * mesma complexidade, ~5 MB de heap a menos no índice completo.
 */
function subtractKey(alvo: Int8Array, key: string, out: Int8Array): boolean {
  out.set(alvo);
  for (let i = 0; i < key.length; i++) {
    const idx = key.charCodeAt(i) - 97;
    if (--out[idx] < 0) return false;
  }
  return true;
}

/** Índice de anagramas a partir de uma lista de palavras/expressões. */
export function buildIndex(words: string[]): AnagramIndex {
  const byKey = new Map<string, string[]>();
  for (const w of words) {
    const k = anagramKey(w);
    if (!k) continue;
    const arr = byKey.get(k);
    if (arr) arr.push(w);
    else byKey.set(k, [w]);
  }

  // Bucketiza por comprimento: a busca de duas palavras varre só o tamanho que
  // interessa (ex.: 161 chaves de 2 letras) em vez das 212 mil chaves do pt.
  const grouped = new Map<number, string[]>();
  for (const k of byKey.keys()) {
    if (k.length > MAX_BUCKET_LEN) continue;
    const g = grouped.get(k.length);
    if (g) g.push(k);
    else grouped.set(k.length, [k]);
  }
  const byLen = new Map<number, LenBucket>();
  for (const [len, keys] of grouped) {
    const masks = new Int32Array(keys.length);
    for (let i = 0; i < keys.length; i++) masks[i] = maskOf(keys[i]);
    byLen.set(len, { keys, masks });
  }

  return { byKey, byLen };
}

/**
 * Todas as maneiras distintas de tirar `r` letras da chave (que já vem ordenada).
 * Conjuntos, não sequências: {a,b} sai uma vez só.
 */
function removals(key: string, r: number): { rest: string; gone: string }[] {
  if (r <= 0) return [{ rest: key, gone: "" }];
  const out: { rest: string; gone: string }[] = [];
  for (let i = 0; i < key.length; i++) {
    if (i > 0 && key[i] === key[i - 1]) continue; // mesma letra ⇒ mesmo conjunto
    const gone = key[i];
    const rest = key.slice(0, i) + key.slice(i + 1); // segue ordenada
    if (r === 1) {
      out.push({ rest, gone });
      continue;
    }
    for (const deeper of removals(rest, r - 1)) {
      if (deeper.gone[0] < gone) continue; // só sequências não-decrescentes
      out.push({ rest: deeper.rest, gone: gone + deeper.gone });
    }
  }
  return out;
}

export interface AnagramHit {
  /** Uma ou duas palavras que consomem as letras (a mais curta primeiro). */
  words: string[];
  /**
   * Letras que sobraram, em ordem alfabética; "" quando o anagrama é exato.
   * No acervo a letra que sobra costuma ser o índice da camada seguinte, então
   * ela é resultado, não erro — por isso vem no hit, não num booleano.
   */
  leftover: string;
}

export interface SolveOptions {
  /** 0 = exato (padrão). Até 2 letras podem sobrar. */
  maxLeftover?: number;
  /** Procura pares de palavras (GIA-18 "Arte sem Nome": as contagens dão "um mapa"). */
  twoWords?: boolean;
  /** Teto de hits devolvidos (já ordenados). */
  limit?: number;
}

export interface SolveResult {
  hits: AnagramHit[];
  /** A lista não é exaustiva: bateu no teto de hits ou no orçamento de busca. */
  truncated: boolean;
}

/**
 * Palavras funcionais curtas. Num dicionário exaustivo o par certo ("um mapa")
 * afunda no meio de dezenas de "mm apuã" — a única coisa que separa os dois é
 * a palavrinha ser de uso corrente. Lista curta e curada de propósito: ela só
 * ordena, nunca filtra.
 */
const COMUNS = new Set([
  "um",
  "uma",
  "uns",
  "umas",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "ao",
  "aos",
  "os",
  "as",
  "com",
  "sem",
  "por",
  "para",
  "que",
  "se",
  "eu",
  "ele",
  "ela",
  "meu",
  "sua",
  "seu",
  "mais",
  "mas",
  "the",
  "a",
  "an",
  "of",
  "in",
  "on",
  "at",
  "to",
  "is",
  "it",
  "and",
  "for",
  "my",
  "no",
  "one",
  "two",
]);

const temComum = (h: AnagramHit) => (h.words.some((w) => COMUNS.has(fold(w))) ? 0 : 1);

/**
 * Cada concessão custa o mesmo: uma letra sobrando ou uma palavra a mais. Sem
 * isso "giz · nos" (que usa tudo) passaria na frente de "signo +Z", e é a
 * segunda que resolve a prova.
 */
const custo = (h: AnagramHit) => h.leftover.length + h.words.length - 1;

/** Ordena: menos concessões, menos palavras, palavra de uso corrente, palavra longa. */
function compareHits(a: AnagramHit, b: AnagramHit): number {
  if (custo(a) !== custo(b)) return custo(a) - custo(b);
  if (a.words.length !== b.words.length) return a.words.length - b.words.length;
  const ca = temComum(a);
  const cb = temComum(b);
  if (ca !== cb) return ca - cb;
  const la = Math.max(...a.words.map((w) => w.length));
  const lb = Math.max(...b.words.map((w) => w.length));
  if (la !== lb) return lb - la;
  return a.words.join(" ").localeCompare(b.words.join(" "), "pt-BR");
}

/**
 * Busca no índice as palavras que usam as letras de `input`.
 *
 * Três modos, combináveis: exato (padrão), com sobra de 1–2 letras e em duas
 * palavras. Os dois últimos são portões explícitos porque multiplicam o número
 * de saídas — quem não pediu continua vendo só o anagrama exato.
 */
export function solveAll(index: AnagramIndex, input: string, opts: SolveOptions = {}): SolveResult {
  const key = anagramKey(input);
  const n = key.length;
  if (n < MIN_WORD || n > MAX_INPUT_LETTERS) return { hits: [], truncated: false };

  const maxLeftover = Math.min(Math.max(opts.maxLeftover ?? 0, 0), MAX_LEFTOVER);
  const limit = opts.limit ?? 300;
  const hits: AnagramHit[] = [];
  const seen = new Set<string>();

  const push = (words: string[], leftover: string) => {
    const id = `${words.join(" ")}|${leftover}`;
    if (seen.has(id)) return;
    seen.add(id);
    hits.push({ words, leftover });
  };

  // A sobra sai PRIMEIRO: cada conjunto de letras descartadas vira uma entrada
  // exata, e tanto a palavra única quanto o par trabalham em cima dela. O
  // caminho contrário (descontar a sobra por candidato) custava ~50 lookups
  // por candidato em vez de um — 800 ms numa entrada de 17 letras comuns.
  const rem = new Int8Array(26);
  let work = 0;

  for (let r = 0; r <= maxLeftover && n - r >= MIN_WORD; r++) {
    for (const { rest, gone } of removals(key, r)) {
      const words = index.byKey.get(rest);
      if (words) for (const w of words) push([w], gone);

      if (!opts.twoWords || work > MAX_WORK) continue;
      const counts = countsOf(rest);
      const restMask = maskOf(rest);
      const avail = rest.length;
      // A primeira palavra é sempre a metade menor: o par (a,b) sai uma vez só.
      const maxFirst = Math.min(Math.floor(avail / 2), MAX_BUCKET_LEN);
      for (let len1 = MIN_WORD; len1 <= maxFirst && work <= MAX_WORK; len1++) {
        const len2 = avail - len1;
        if (len2 < MIN_WORD) continue;
        if (len1 === MIN_WORD && len2 === MIN_WORD) continue; // "aa bb" é ruído puro
        const bucket = index.byLen.get(len1);
        if (!bucket) continue;
        work += bucket.keys.length;
        for (let i = 0; i < bucket.keys.length; i++) {
          if ((bucket.masks[i] & ~restMask) !== 0) continue; // mata o grosso em 1 op
          const k1 = bucket.keys[i];
          if (!subtractKey(counts, k1, rem)) continue;
          const first = index.byKey.get(k1);
          if (!first) continue;
          work += PESO_MATCH;
          if (work > MAX_WORK) break; // entrada patológica: devolve o que achou
          const second = index.byKey.get(keyOfCounts(rem));
          if (!second) continue;
          for (const a of first) {
            for (const b of second) {
              const swap = len1 === len2 && b.localeCompare(a, "pt-BR") < 0;
              push(swap ? [b, a] : [a, b], gone);
            }
          }
        }
      }
    }
  }

  hits.sort(compareHits);
  return {
    hits: hits.length > limit ? hits.slice(0, limit) : hits,
    truncated: work > MAX_WORK || hits.length > limit,
  };
}

/** Só os hits (o caso comum: exato, sem estouro de orçamento). */
export function solve(index: AnagramIndex, input: string, opts: SolveOptions = {}): AnagramHit[] {
  return solveAll(index, input, opts).hits;
}

/** Junta hits de índices diferentes (ex.: pt + en) sem repetir e na mesma ordem. */
export function mergeHits(lists: AnagramHit[][], limit = 300): AnagramHit[] {
  const seen = new Set<string>();
  const out: AnagramHit[] = [];
  for (const list of lists) {
    for (const h of list) {
      const id = `${h.words.join(" ")}|${h.leftover}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(h);
    }
  }
  out.sort(compareHits);
  return out.length > limit ? out.slice(0, limit) : out;
}

/** Anagramas exatos de `input` em uma palavra (usam todas as letras). */
export function solveAnagram(index: AnagramIndex, input: string): string[] {
  return solve(index, input).map((h) => h.words[0]);
}
