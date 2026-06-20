import { mapDecoder } from "../define";

/**
 * Example custom decoder. Polybius square (5×5, I/J share a cell): pairs of
 * digits 1–5 → letters. "23 15 31 31 34" → "HELLO". Accepts spaced pairs or a
 * continuous even-length run of 1–5 digits.
 */
const SQUARE = "ABCDEFGHIKLMNOPQRSTUVWXYZ"; // 25 letters, J folded into I

export const decoders = mapDecoder({
  id: "polybius",
  name: "Quadrado de Políbio",
  category: "classical",
  decode(input) {
    const tokens = input
      .trim()
      .split(/[^1-5]+/)
      .filter(Boolean);
    if (tokens.length === 0) return null;

    let pairs: string[];
    if (tokens.every((t) => t.length === 2)) {
      pairs = tokens;
    } else {
      const joined = tokens.join("");
      if (joined.length < 2 || joined.length % 2 !== 0) return null;
      pairs = joined.match(/.{2}/g) ?? [];
    }

    let out = "";
    for (const p of pairs) {
      const idx = (Number(p[0]) - 1) * 5 + (Number(p[1]) - 1);
      out += SQUARE[idx] ?? "?";
    }
    return out.includes("?") || out.length === 0 ? null : out;
  },
});
