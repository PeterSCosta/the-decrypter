import { bruteDecoder, defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

const firstChars = (parts: string[]) =>
  parts.map((p) => p.match(/[\p{L}\p{N}]/u)?.[0] ?? "").join("");

function cand(label: string, output: string): DecodeCandidate {
  return { decoderId: "acrostic", decoderName: "Acróstico", category: "transform", label, output };
}

/** Primeira letra de cada palavra / de cada linha (mensagem escondida). */
const initials = defineDecoder({
  id: "acrostic",
  name: "Acróstico",
  category: "transform",
  decode(input) {
    const words = input.trim().split(/\s+/).filter(Boolean);
    if (words.length < 3) return [];

    const out: DecodeCandidate[] = [cand("iniciais das palavras", firstChars(words))];

    const lines = input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length >= 2) {
      const byLine = firstChars(lines);
      if (byLine !== out[0].output) out.push(cand("iniciais das linhas", byLine));
    }
    return out.filter((c) => c.output.length >= 2);
  },
});

/**
 * Letras da unidade. Espaço e pontuação não contam e um acentuado vale 1 — é
 * assim que as provas contam, então qualquer normalização (`stripDiacritics`,
 * NFD) antes de indexar desloca a posição e devolve a letra errada.
 */
const letters = (s: string) => s.match(/\p{L}/gu) ?? [];

/** k-ésima letra de cada unidade, contada do início ou do fim. */
function nth(units: string[], k: number, fromEnd: boolean): string | null {
  let out = "";
  for (const u of units) {
    const ls = letters(u);
    // Quem monta a ficha garante a k-ésima letra em TODAS as unidades; uma
    // unidade curta é o sinal barato de que essa não é a leitura certa.
    if (ls.length < k) return null;
    out += fromEnd ? ls[ls.length - k] : ls[k - 1];
  }
  return out;
}

/** Iniciais só das unidades ímpares (ou só das pares) — a leitura alternada. */
const alternating = (units: string[], odd: boolean) =>
  nth(
    units.filter((_, i) => (i % 2 === 0) === odd),
    1,
    false,
  );

/**
 * Junção nome↔sobrenome. Em GIA-28 a última letra do nome e a primeira do
 * sobrenome COINCIDEM — por isso são duas variantes separadas e não um par
 * concatenado, que duplicaria cada letra da mensagem.
 */
function nameJoin(lines: string[], tail: boolean): string | null {
  let out = "";
  for (const line of lines) {
    const words = line.split(/\s+/).filter((w) => letters(w).length > 0);
    if (words.length < 2) return null;
    for (const w of tail ? words.slice(0, -1) : words.slice(1)) {
      const ls = letters(w);
      out += tail ? ls[ls.length - 1] : ls[0];
    }
  }
  return out;
}

const MAX_K = 5;

/** k-ésima letra (do início ou do fim) de cada linha/palavra, e a alternância. */
const positional = bruteDecoder({
  id: "acrostic-nth",
  name: "Acróstico posicional",
  category: "transform",
  // 2, não 4: em prosa qualquer, este decoder produz strings curtas só de
  // letras — exatamente o que o scorer superestima — e quatro delas entulhavam
  // o topo do ranking sem significar nada. Duas bastam para a leitura certa
  // aparecer quando existe.
  keep: 2,
  variants(input) {
    const out: { label: string; output: string }[] = [];
    const seen = new Set<string>();
    // Duas leituras que dão a mesma mensagem gastariam dois dos quatro cartões
    // — e em GIA-28 elas só diferem na caixa (fernandO vs. Osório).
    const push = (label: string, value: string | null) => {
      const key = value?.toLowerCase() ?? "";
      if (!value || value.length < 3 || seen.has(key)) return;
      seen.add(key);
      out.push({ label, output: value });
    };

    const lines = input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => letters(l).length > 0);
    const words = input
      .trim()
      .split(/\s+/)
      .filter((w) => letters(w).length > 0);

    if (lines.length >= 3) {
      for (let k = 1; k <= MAX_K; k++) {
        // k=1 do início é o acróstico de iniciais, que o decoder irmão já emite.
        if (k > 1) push(`${k}ª letra de cada linha`, nth(lines, k, false));
        push(`${k}ª letra do fim de cada linha`, nth(lines, k, true));
      }
      push("iniciais das linhas ímpares", alternating(lines, true));
      push("iniciais das linhas pares", alternating(lines, false));
      push("última letra do nome (por linha)", nameJoin(lines, true));
      push("primeira letra do sobrenome (por linha)", nameJoin(lines, false));
    }

    if (words.length >= 4) {
      for (let k = 1; k <= MAX_K; k++) {
        if (k > 1) push(`${k}ª letra de cada palavra`, nth(words, k, false));
        push(`${k}ª letra do fim de cada palavra`, nth(words, k, true));
      }
      push("iniciais das palavras ímpares", alternating(words, true));
      push("iniciais das palavras pares", alternating(words, false));
    }

    return out;
  },
});

export const decoders = [initials, positional];
