import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

const firstChars = (parts: string[]) =>
  parts.map((p) => p.match(/[\p{L}\p{N}]/u)?.[0] ?? "").join("");

function cand(label: string, output: string): DecodeCandidate {
  return { decoderId: "acrostic", decoderName: "Acróstico", category: "transform", label, output };
}

/** Primeira letra de cada palavra / de cada linha (mensagem escondida). */
export const decoders = defineDecoder({
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
