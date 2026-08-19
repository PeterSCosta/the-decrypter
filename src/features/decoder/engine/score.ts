import { stripDiacritics } from "./util";
import type { WordLookup } from "./words-packed";

/**
 * Plausibility scoring (0..1): how much does `text` look like real
 * Portuguese/English plaintext vs. gibberish? Used to rank decoder outputs.
 *
 * Blend of: a printable-character gate, letter-frequency cosine similarity
 * (best of pt/en), a common-word/stopword hit rate, and a vowel-structure
 * check. None are perfect alone; together they reliably float readable text
 * to the top and sink random bytes to the bottom.
 */

// Relative letter frequencies (%). a–z, accents folded out.
const PT_FREQ: Record<string, number> = {
  a: 14.6,
  b: 1.0,
  c: 3.9,
  d: 5.0,
  e: 12.6,
  f: 1.0,
  g: 1.3,
  h: 1.3,
  i: 6.2,
  j: 0.4,
  k: 0.02,
  l: 2.8,
  m: 4.7,
  n: 5.0,
  o: 10.7,
  p: 2.5,
  q: 1.2,
  r: 6.5,
  s: 7.8,
  t: 4.3,
  u: 4.6,
  v: 1.7,
  w: 0.01,
  x: 0.3,
  y: 0.01,
  z: 0.5,
};
const EN_FREQ: Record<string, number> = {
  a: 8.2,
  b: 1.5,
  c: 2.8,
  d: 4.3,
  e: 12.7,
  f: 2.2,
  g: 2.0,
  h: 6.1,
  i: 7.0,
  j: 0.15,
  k: 0.8,
  l: 4.0,
  m: 2.4,
  n: 6.7,
  o: 7.5,
  p: 1.9,
  q: 0.1,
  r: 6.0,
  s: 6.3,
  t: 9.1,
  u: 2.8,
  v: 1.0,
  w: 2.4,
  x: 0.15,
  y: 2.0,
  z: 0.07,
};

// High-frequency words that strongly signal real text.
const STOPWORDS = new Set([
  // pt
  "a",
  "o",
  "e",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "que",
  "em",
  "um",
  "uma",
  "para",
  "com",
  "nao",
  "os",
  "as",
  "no",
  "na",
  "se",
  "por",
  "mais",
  "como",
  "mas",
  "ao",
  "ele",
  "ela",
  "voce",
  "isso",
  "sim",
  "ser",
  "ter",
  "foi",
  "sua",
  "seu",
  "pela",
  "pelo",
  "este",
  "esta",
  "isso",
  "aqui",
  "onde",
  "quando",
  "muito",
  "bem",
  // en
  "the",
  "and",
  "of",
  "to",
  "in",
  "is",
  "it",
  "you",
  "that",
  "he",
  "was",
  "for",
  "on",
  "are",
  "with",
  "as",
  "his",
  "they",
  "be",
  "at",
  "this",
  "have",
  "from",
  "or",
  "had",
  "by",
  "not",
  "but",
  "what",
  "all",
  "were",
  "when",
  "your",
  "can",
  "said",
  "there",
  "use",
  "an",
  "each",
  "which",
  "she",
  "do",
  "how",
  "their",
]);

const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");

function cosineToFreq(
  counts: Record<string, number>,
  total: number,
  freq: Record<string, number>,
): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const ch of ALPHA) {
    const a = (counts[ch] ?? 0) / total;
    const b = (freq[ch] ?? 0) / 100;
    dot += a * b;
    na += a * a;
    nb += b * b;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const PRINTABLE = /[A-Za-z0-9 .,!?;:'"()\-\n\r\t/@#%&+]/;

function printableGate(text: string): number {
  if (text.length === 0) return 0;
  let ok = 0;
  let control = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c < 9 || (c > 13 && c < 32) || c === 127) control++;
    if (PRINTABLE.test(ch)) ok++;
  }
  if (control > 0) return Math.max(0, 0.15 - control * 0.05);
  const ratio = ok / text.length;
  return ratio ** 3; // punish non-printable-heavy output hard
}

function wordScore(folded: string): number {
  const tokens = folded.split(/[^a-z]+/).filter((t) => t.length >= 1);
  if (tokens.length === 0) return 0;
  let stop = 0;
  let vowelOk = 0;
  for (const t of tokens) {
    if (STOPWORDS.has(t)) stop++;
    if (t.length < 2 || /[aeiouy]/.test(t)) vowelOk++;
  }
  const stopRate = Math.min(1, stop / Math.max(1, tokens.length * 0.22));
  const vowelRate = vowelOk / tokens.length;
  return 0.6 * stopRate + 0.4 * vowelRate;
}

/** Penalise improbably long consonant runs (e.g. "bcdfg"). */
function consonantPenalty(folded: string): number {
  const run = folded.match(/[bcdfghjklmnpqrstvwxz]{5,}/g);
  return run ? Math.min(0.5, run.length * 0.2) : 0;
}

/**
 * 0..1 multiplier rewarding "clean" text. Real plaintext is mostly letters and
 * spaces and doesn't sprinkle digits or random capitals mid-word — which is
 * exactly what a wrong Caesar/affine of an encoded blob looks like. Uniform
 * ALL-CAPS (common in puzzle plaintext) is NOT penalised: only lower→UPPER
 * transitions inside words count as "messy".
 */
function tidiness(text: string): number {
  if (text.length === 0) return 0;
  let alphaSpace = 0;
  let messyCaps = 0;
  let prevLower = false;
  for (const ch of text) {
    const isUpper = ch >= "A" && ch <= "Z";
    const isLower = ch >= "a" && ch <= "z";
    if (isUpper || isLower || ch === " ") alphaSpace++;
    if (isUpper && prevLower) messyCaps++;
    prevLower = isLower;
  }
  const cleanRatio = alphaSpace / text.length;
  const capPenalty = Math.min(0.6, (messyCaps / Math.max(1, alphaSpace)) * 2);
  return cleanRatio ** 2 * (1 - capPenalty);
}

// Most-common letter pairs across pt-BR + English. Real words are built almost
// entirely from these; gibberish (e.g. "nctte oajhe") barely hits them — this is
// the single best discriminator of readable text.
// biome-ignore format: keep the bigram table compact.
const COMMON_BIGRAMS = new Set([
  "th","he","in","er","an","re","on","at","en","nd","ti","es","or","te","of","ed","is","it",
  "al","ar","st","to","nt","ng","se","ha","as","ou","io","le","ve","co","me","de","hi","ri",
  "ro","ic","ne","ea","ra","ce","li","ch","ll","be","ma","si","om","ur","ca","el","ta","la",
  "ns","di","so","et","em","mo","no","na","da","do","os","ad","ci","vi","po","pa","tr","pr",
  "qu","un","mu","lo","um","ço","ao","sa","ir","ec","ol","mi","fo","ho","ss","tu","us","im",
]);

function bigramScore(folded: string): number {
  let total = 0;
  let common = 0;
  for (const word of folded.split(/[^a-z]+/)) {
    for (let i = 0; i < word.length - 1; i++) {
      total++;
      if (COMMON_BIGRAMS.has(word.slice(i, i + 2))) common++;
    }
  }
  return total === 0 ? 0 : common / total;
}

/**
 * Wordlist do realce de palavra real. É um **singleton de módulo**, não um
 * campo de `DecodeContext`, por um motivo estrutural: `bruteDecoder` chama
 * `scorePlaintext` sem ctx (`define.ts`) para eleger suas melhores variantes —
 * é justamente ali (César, afim, railfence) que o realce mais importa.
 *
 * Enquanto for `null`, o score é **bit-a-bit o de antes**: a bancada degrada
 * para o comportamento histórico enquanto as listas carregam.
 */
let WORDS: WordLookup | null = null;

/**
 * Aceita qualquer coisa que responda `has` — o índice compactado em produção,
 * um `Set` literal nos testes. `Set<string>` satisfaz `WordLookup`
 * estruturalmente, então os testes que montam um conjunto à mão seguem valendo.
 */
/**
 * A lista de palavras já chegou?
 *
 * Existe para quem precisa PUNIR uma leitura sem palavra real: sem este sinal,
 * o decoder puniria também no instante em que a lista ainda não carregou — e
 * puniria sempre nos testes, onde ela nunca carrega. A regra é "só cobre o que
 * dá para conferir".
 */
export function wordsProntas(): boolean {
  return WORDS !== null;
}

export function setWordSet(set: WordLookup | null): void {
  WORDS = set;
}

/** Piso de token para contar como palavra (ver `words.ts`). */
const MIN_HIT_LEN = 4;
/** Piso para segmentar um token colado: pedaço menor que isto é ruído. */
const MIN_PIECE_LEN = 4;
/** Acima disto, um token sem espaço vira candidato a texto colado. */
const GLUED_MIN = 8;
/** Teto de trabalho da segmentação — protege o custo por tecla. */
const GLUED_MAX = 64;

/**
 * Quebra um token colado nas palavras reais que ele contém e devolve quantas
 * letras ficaram cobertas.
 *
 * Por que isto existe: a resposta que a bancada procura chega **sem espaços**
 * ("PARACUMPRIRESSAPROVA…"). Sem segmentar, ela é um token só, fora do
 * dicionário, cobertura zero — e perdia o topo para um acróstico de 4 letras que
 * por acaso é palavra. Programação dinâmica: `dp[i]` = maior nº de letras
 * cobertas nos primeiros `i` caracteres.
 */
function gluedCoverage(token: string, words: WordLookup): number {
  if (token.length < GLUED_MIN) return 0;
  // Acima do teto, analisa o começo em vez de desistir. Devolver 0 fazia uma
  // resposta colada de 65 caracteres — um a mais que o teto — pontuar como
  // lixo, enquanto a de 64 pontuava no topo: um degrau invisível bem no meio do
  // formato que a bancada mais recebe. O teto continua protegendo o custo por
  // tecla; o que muda é que ele passa a truncar, não a zerar.
  const n = Math.min(token.length, GLUED_MAX);
  const dp = new Int32Array(n + 1);
  for (let i = 1; i <= n; i++) {
    dp[i] = dp[i - 1]; // pular este caractere (letra não coberta)
    const from = Math.max(0, i - 18); // maior palavra plausível em pt-BR
    for (let j = from; j <= i - MIN_PIECE_LEN; j++) {
      if (words.has(token.slice(j, i))) {
        const cand = dp[j] + (i - j);
        if (cand > dp[i]) dp[i] = cand;
      }
    }
  }
  return dp[n];
}

/** Letras cobertas por palavra real, e o total de letras. */
/**
 * Quanto do texto o dicionário reconhece — incluindo o caso COLADO.
 *
 * Exportada porque `realWords` sozinho não serve de portão para cifra sem
 * espaços: ele só reporta token INTEIRO que está no dicionário, e texto colado
 * é um token gigante. Medido: o `vigenere-crack` achava a chave CERTA de uma
 * cifra colada de 267 letras e deixava o card em 0,34, na gaveta — a chave é a
 * resposta da prova, e ela estava certa.
 */
export function coverage(text: string): { covered: number; total: number; hits: string[] } {
  const hits: string[] = [];
  let covered = 0;
  let total = 0;
  if (!WORDS) return { covered, total, hits };
  for (const token of stripDiacritics(text)
    .toLowerCase()
    .split(/[^a-z]+/)) {
    if (!token) continue;
    total += token.length;
    if (token.length >= MIN_HIT_LEN && WORDS.has(token)) {
      covered += token.length;
      hits.push(token);
    } else {
      covered += gluedCoverage(token, WORDS);
    }
  }
  return { covered, total, hits };
}

/**
 * Palavras reais encontradas na saída, na ordem. Vazio quando a lista ainda não
 * carregou — a UI usa isto para o selo "palavra real: LAPIS".
 */
export function realWords(text: string): string[] {
  return coverage(text).hits;
}

export function scorePlaintext(text: string): number {
  const gate = printableGate(text);
  if (gate <= 0) return 0;

  const folded = stripDiacritics(text).toLowerCase();
  const counts: Record<string, number> = {};
  let total = 0;
  for (const ch of folded) {
    if (ch >= "a" && ch <= "z") {
      counts[ch] = (counts[ch] ?? 0) + 1;
      total++;
    }
  }
  if (total === 0) return gate * 0.1; // digits/punctuation only

  const freq = Math.max(cosineToFreq(counts, total, PT_FREQ), cosineToFreq(counts, total, EN_FREQ));
  const words = wordScore(folded);
  const bigrams = bigramScore(folded);

  // Short outputs are noisier — temper confidence a little.
  const lenConf = Math.min(1, 0.4 + total / 12);

  // Bigrams carry the most signal; frequency and stopwords refine it.
  const base = 0.5 * bigrams + 0.3 * freq + 0.2 * words;
  const score = gate * lenConf * tidiness(text) * base - consonantPenalty(folded);
  const clamped = Math.max(0, Math.min(1, score));

  // Realce de palavra real: **puxa para 1** em vez de somar, para nunca estourar
  // o teto nem inverter a ordem entre duas saídas igualmente reconhecíveis.
  //
  // A cobertura sozinha NÃO basta, e isto custou uma regressão medida: como ela
  // é razão, um lixo de 4 letras que por acaso está na lista cobre 100% e ganha
  // o realce máximo — a lista tem 7.402 palavras de 4 letras, ou seja 1 em ~57
  // strings aleatórias "é palavra". Por isso o realce é amortecido pela
  // EVIDÊNCIA ABSOLUTA: 4 letras casadas valem meio realce, 8 ou mais valem
  // inteiro. Uma resposta colada de 28 caracteres que se decompõe em palavras
  // reais ganha o realce cheio; "vaea" ganha um empurrão modesto.
  const cov = coverage(text);
  if (cov.covered === 0 || cov.total === 0) return clamped;
  const evidence = Math.min(1, cov.covered / 8);
  const lift = 0.6 * (cov.covered / cov.total) * evidence;
  return clamped + lift * (1 - clamped);
}
