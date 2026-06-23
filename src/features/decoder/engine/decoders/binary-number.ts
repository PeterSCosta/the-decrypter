import { mapDecoder } from "../define";

/**
 * Interpreta uma sequência só de 0/1 como número binário → decimal/hex/octal.
 * Complementa o `base-converter` (que lê o número como decimal) e o codec
 * `binary` (binário → texto ASCII, de 8 em 8 bits). Ex.: 100101010 → dec 298.
 */
export const decoders = mapDecoder({
  id: "binary-number",
  name: "Binário → número",
  category: "transform",
  decode(input) {
    const s = input.trim().replace(/[\s.]/g, "");
    // só 0/1; ≥3 bits (evita "10" trivial) e ≤53 (limite do inteiro seguro)
    if (!/^[01]{3,53}$/.test(s)) return null;
    const n = Number.parseInt(s, 2);
    if (!Number.isSafeInteger(n)) return null;
    return {
      output: `dec ${n} · hex ${n.toString(16).toUpperCase()} · oct ${n.toString(8)}`,
      forcedScore: 0.5,
    };
  },
});
