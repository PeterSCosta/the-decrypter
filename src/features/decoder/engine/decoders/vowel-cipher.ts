import { defineDecoder } from "../define";
import type { DecodeCandidate, DecoderCategory } from "../types";
import { isUseful, shiftLetter, stripDiacritics } from "../util";

const ID = "vowel-cipher";
const NAME = "Cifra vocálica (deslocamento com sinal)";
const CATEGORY: DecoderCategory = "classical";
const VOWELS = "AEIOU";

/**
 * O portão é o **sinal explícito**: `+11 -4` entra, `11 4` não. Sem ele esta
 * cifra brigaria com o `a1z26` (`ciphers.ts`), que já responde por listas de
 * números nus — e passaria a opinar sobre toda entrada numérica da bancada.
 * Aceita o menos tipográfico (−, –) porque folha de prova impressa usa os dois.
 */
const SIGNED = /^[+\-−–]\d{1,2}$/;

function parseShifts(raw: string): number[] | null {
  const tokens = raw
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (tokens.length < 2 || !tokens.every((t) => SIGNED.test(t))) return null;
  return tokens.map((t) => (t[0] === "+" ? Number(t.slice(1)) : -Number(t.slice(1))));
}

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

/** Letra base sem acento, preservando a caixa; "" quando não é letra A–Z. */
function asLetter(ch: string): string {
  const base = stripDiacritics(ch);
  return base.length === 1 && /[a-zA-Z]/.test(base) ? base : "";
}

/** Índice da vogal (0..4) ignorando acento e caixa; -1 se não for vogal. */
function vowelIndex(ch: string): number {
  const base = asLetter(ch);
  return base === "" ? -1 : VOWELS.indexOf(base.toUpperCase());
}

/** Cada vogal do texto recebe o deslocamento da sua posição em A E I O U. */
function substituteVowels(text: string, shifts: number[]): string {
  let out = "";
  for (const ch of text) {
    const i = vowelIndex(ch);
    out += i < 0 ? ch : shiftLetter(asLetter(ch), shifts[i]);
  }
  return out;
}

/** Deslocamento posição a posição (GIA-26): a n-ésima letra usa o n-ésimo valor. */
function shiftByPosition(text: string, shifts: number[]): string {
  let out = "";
  let i = 0;
  for (const ch of text) {
    const base = asLetter(ch);
    if (base === "") out += ch;
    else out += shiftLetter(base, shifts[i++ % shifts.length]);
  }
  return out;
}

/**
 * Lista de deslocamentos COM SINAL, em duas leituras.
 *
 * 1. **Imagens das vogais** — cinco deslocamentos aplicados a A E I O U dentro
 *    do alfabeto completo. É a saída principal, e é a resposta da prova: em
 *    GIA-22 (*I lingii di i*) o texto de vogal única é veículo didático, o que
 *    se entrega é a concatenação das imagens — `+11 -4 +7 -6 -2` → LAPIS.
 * 2. **Posição a posição** — a n-ésima letra do texto anda o n-ésimo valor,
 *    que é o César de direção sinalizada de GIA-26 (*Legado Mundial*).
 *
 * A lista pode estar na entrada (é assim que vem impressa na folha) ou no campo
 * de chave, com o texto na entrada. Soma-se o deslocamento, não se subtrai: o
 * acervo escreve A+11=L, então o valor impresso já é a ida.
 */
export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: CATEGORY,
  inputs: {
    key: { label: "Deslocamentos com sinal — ou o texto, se a lista já está na entrada" },
  },
  decode(input, ctx) {
    const key = ctx.key ?? "";
    const fromInput = parseShifts(input);
    const shifts = fromInput ?? parseShifts(key);
    if (!shifts) return [];

    // A lista mora num dos dois campos; o texto, quando existe, mora no outro.
    const other = fromInput ? key : input;
    const text = /[a-zA-Z]/.test(stripDiacritics(other)) ? other : "";

    const base = { decoderId: ID, decoderName: NAME, category: CATEGORY };
    const out: DecodeCandidate[] = [];

    if (shifts.length === VOWELS.length) {
      const word = [...VOWELS].map((v, i) => shiftLetter(v, shifts[i])).join("");
      out.push({
        ...base,
        label: "imagens das vogais A E I O U",
        output: word,
        notes: [...VOWELS]
          .map((v, i) => `${v}${fmt(shifts[i])}=${shiftLetter(v, shifts[i])}`)
          .join(" · "),
        forcedScore: 0.85,
      });
      if (text) {
        out.push({
          ...base,
          label: "texto com as vogais deslocadas",
          output: substituteVowels(text, shifts),
          notes: `vogais A E I O U → ${shifts.map(fmt).join(" ")}`,
        });
      }
    }

    if (text) {
      out.push({
        ...base,
        label: "posição a posição",
        output: shiftByPosition(text, shifts),
        notes: `${shifts.length} deslocamentos: ${shifts.map(fmt).join(" ")}`,
      });
    }

    const seen = new Set<string>();
    return out.filter((c) => {
      if (!isUseful(c.output, input) || seen.has(c.output)) return false;
      seen.add(c.output);
      return true;
    });
  },
});
