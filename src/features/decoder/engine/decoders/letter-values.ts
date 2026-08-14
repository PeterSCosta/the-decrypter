import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";
import { isUseful, stripDiacritics } from "../util";

/**
 * Valor das letras — a família A10 do acervo ("alfabetos exóticos"), no único
 * recorte que vira ferramenta: **letra ↔ número por tabela**. Três esquemas:
 *
 * 1. **gematria clássica** — A=1…I=9, J=10…R=90, S=100…Z=800 (unidades, dezenas,
 *    centenas);
 * 2. **redução 1–9** — a raiz digital pitagórica: A=1…I=9, J=1, K=2…;
 * 3. **primos** — A=2, B=3, C=5 … Z=101, que é o que a *Scotland Yard* (CG 2019,
 *    "primos + gematria") usou.
 *
 * O **ordinal simples** (A=1…Z=26) fica de fora de propósito: já é o
 * `a1z26-encode`, e o dedup por output de `runDecoders` mataria um dos dois
 * cartões. Pela mesma razão, qualquer esquema cuja saída **coincida** com o
 * ordinal (acontece em palavra só de A–I) é descartado aqui — o cartão do
 * A1Z26 é quem responde por ela.
 *
 * Ruído: no sentido letra→número a saída é uma lista de números, que o
 * `scorePlaintext` afunda; daí o `forcedScore` 0.5 — que, por estar acima do
 * corte de 0.35, entraria na área provável em CADA frase digitada. Por isso o
 * portão é uma **palavra só**: sem espaço, sem dígito, sem pontuação, 2 a 24
 * letras. Digitar uma palavra solta já é o gesto de "transforma isto"; digitar
 * um endereço não é. No modo "uma cifra só" (`ctx.only`) o usuário já escolheu,
 * então aí vale frase inteira.
 *
 * No sentido inverso (número→letra) a saída é texto: **sem** `forcedScore`, para
 * o realce de palavra real do `scorePlaintext` decidir sozinho.
 */

const ID = "letter-values";
const NAME = "Valor das letras";

/** Gematria clássica: unidades A–I, dezenas J–R, centenas S–Z. */
const GEMATRIA = Array.from({ length: 26 }, (_, i) =>
  i < 9 ? i + 1 : i < 18 ? (i - 8) * 10 : (i - 17) * 100,
);

/** Raiz digital: o alfabeto dá três voltas de 1 a 9 (A=1, J=1, S=1). */
const REDUCAO = Array.from({ length: 26 }, (_, i) => (i % 9) + 1);

/** Os 26 primeiros primos — A=2 … Z=101. */
// biome-ignore format: a tabela cabe numa linha por dezena.
const PRIMOS = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29,
  31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
  73, 79, 83, 89, 97, 101,
];

/** Ordinal A1Z26 — não vira cartão, serve só para detectar a colisão. */
const ORDINAL = Array.from({ length: 26 }, (_, i) => i + 1);

interface Scheme {
  label: string;
  values: number[];
  /** No inverso, uma lista pequena é indistinguível do A1Z26 — ver `invert`. */
  inverse: boolean;
}

const SCHEMES: Scheme[] = [
  { label: "primos (A=2, B=3, C=5…)", values: PRIMOS, inverse: true },
  { label: "gematria clássica (A=1, J=10, S=100)", values: GEMATRIA, inverse: true },
  // A redução não tem inverso útil: cada dígito 1–9 volta como três letras
  // (1 = A/J/S), e oferecer 3ⁿ leituras é ruído, não resposta.
  { label: "redução 1–9 (raiz digital)", values: REDUCAO, inverse: false },
];

/** Letras da palavra, no máximo, fora do modo "uma cifra só". */
const MAX_LETTERS = 24;
/** No modo solo o usuário pediu esta cifra; só o teto de sanidade permanece. */
const MAX_LETTERS_ONLY = 120;
/** Duas letras já dão soma; uma letra é só a tabela. */
const MIN_LETTERS = 2;

/**
 * Palavras em A–Z (o acento cai: "AÇÃO" → "ACAO"), ou null quando a entrada não
 * é "uma palavra" — dígito, pontuação, mais de uma palavra fora do modo solo. É
 * este portão que impede o decoder de acender enquanto se digita um endereço ou
 * um enunciado.
 */
function words(input: string, only: boolean): string[] | null {
  const clean = stripDiacritics(input).trim();
  if (!clean || /\d/.test(clean)) return null;
  if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(clean)) return null;
  const toks = clean
    .toUpperCase()
    .split(/[\s'-]+/)
    .filter(Boolean);
  const letters = toks.reduce((n, t) => n + t.length, 0);
  if (letters < MIN_LETTERS) return null;
  if (only) return letters <= MAX_LETTERS_ONLY ? toks : null;
  // Fora do solo: uma palavra e ponto — "Bar do Tala" é endereço, não gematria.
  return toks.length === 1 && letters <= MAX_LETTERS ? toks : null;
}

const letterValue = (ch: string, values: number[]) => values[ch.charCodeAt(0) - 65];

/** "SCOTLAND" → "67 5 47 71 37 2 43 7"; palavras separadas por " / ". */
function spell(toks: string[], values: number[]): string {
  return toks.map((w) => [...w].map((ch) => letterValue(ch, values)).join(" ")).join(" / ");
}

const wordSum = (w: string, values: number[]) =>
  [...w].reduce((n, ch) => n + letterValue(ch, values), 0);

/** Raiz digital do total — a leitura que a numerologia (e a prova) costuma pedir. */
const digitalRoot = (n: number) => (n === 0 ? 0 : 1 + ((n - 1) % 9));

function sumNote(toks: string[], values: number[]): string {
  const parts = toks.map((w) => wordSum(w, values));
  const total = parts.reduce((a, b) => a + b, 0);
  const perWord = parts.length > 1 ? ` (${parts.join(" + ")})` : "";
  return `soma ${total}${perWord} · raiz digital ${digitalRoot(total)}`;
}

/** Mínimo de tokens no inverso: com dois números qualquer tabela "acerta". */
const MIN_TOKENS = 3;
const MAX_TOKENS = 40;

/** Lista de números 1–3 dígitos, ou null. Um token só é um documento, não lista. */
function numbers(input: string): number[] | null {
  const toks = input
    .trim()
    .split(/[\s,;.\-_/]+/)
    .filter(Boolean);
  if (toks.length < MIN_TOKENS || toks.length > MAX_TOKENS) return null;
  if (!toks.every((t) => /^\d{1,3}$/.test(t))) return null;
  return toks.map(Number);
}

/**
 * Números → letras. Devolve null se um valor sequer estiver fora da tabela — é o
 * que faz um CEP ou um telefone não virar cartão. E, quando todos os valores
 * cabem em 1–26, a leitura já é a do `a1z26`: só o esquema que usa números fora
 * dessa faixa (primos, gematria) tem o que acrescentar.
 */
function invert(nums: number[], values: number[]): string | null {
  const back = new Map(values.map((v, i) => [v, String.fromCharCode(97 + i)]));
  const out: string[] = [];
  for (const n of nums) {
    const ch = back.get(n);
    if (!ch) return null;
    out.push(ch);
  }
  const ordinal = nums.map((n) => (n >= 1 && n <= 26 ? String.fromCharCode(96 + n) : "")).join("");
  const word = out.join("");
  return word === ordinal ? null : word;
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "classical",
  decode(input, ctx) {
    const out: DecodeCandidate[] = [];
    const push = (c: DecodeCandidate) => {
      if (!isUseful(c.output, input)) return;
      if (out.some((prev) => prev.output === c.output)) return;
      out.push(c);
    };

    const toks = words(input, ctx.only === ID);
    if (toks) {
      const ordinal = spell(toks, ORDINAL);
      for (const s of SCHEMES) {
        const output = spell(toks, s.values);
        // Coincidiu com o A1Z26 (palavra só de A–I): o cartão é dele.
        if (output === ordinal) continue;
        push({
          decoderId: ID,
          decoderName: NAME,
          category: "classical",
          label: s.label,
          output,
          notes: sumNote(toks, s.values),
          forcedScore: 0.5,
        });
      }
      return out;
    }

    const nums = numbers(input);
    if (!nums) return out;
    for (const s of SCHEMES) {
      if (!s.inverse) continue;
      const word = invert(nums, s.values);
      if (!word) continue;
      push({
        decoderId: ID,
        decoderName: NAME,
        category: "classical",
        label: `${s.label} → letras`,
        output: word,
      });
    }
    return out;
  },
});
