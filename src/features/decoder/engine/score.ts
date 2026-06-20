import { stripDiacritics } from "./util";

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
  return Math.max(0, Math.min(1, score));
}
