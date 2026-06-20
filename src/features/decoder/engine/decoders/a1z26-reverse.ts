import { mapDecoder } from "../define";

/**
 * A1Z26 invertido: número → letra usando o alfabeto ao contrário.
 * 1 = Z, 2 = Y, …, 26 = A. Ex.: "1 2 3" → "zyx".
 */
export const decoders = mapDecoder({
  id: "a1z26-reverse",
  name: "A1Z26 invertido (1=Z)",
  category: "classical",
  decode(input) {
    const tokens = input
      .trim()
      .split(/[\s,;.\-_/]+/)
      .filter(Boolean);
    if (tokens.length === 0 || !tokens.every((t) => /^\d{1,2}$/.test(t))) return null;
    const nums = tokens.map(Number);
    if (!nums.every((n) => n >= 1 && n <= 26)) return null;
    // 1→z(122) … 26→a(97):  char = 123 - n
    return nums.map((n) => String.fromCharCode(123 - n)).join("");
  },
});
