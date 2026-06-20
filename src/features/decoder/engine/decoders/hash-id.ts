import { mapDecoder } from "../define";

// Comprimento (em hex) → tipos de hash prováveis.
const BY_LEN: Record<number, string> = {
  8: "CRC-32",
  32: "MD5 / MD4 / NTLM",
  40: "SHA-1 / RIPEMD-160",
  56: "SHA-224",
  64: "SHA-256",
  96: "SHA-384",
  128: "SHA-512",
};

export const decoders = mapDecoder({
  id: "hash-id",
  name: "Identificador de hash",
  category: "transform",
  decode(input) {
    const s = input.trim();
    if (!/^[0-9a-f]+$/i.test(s)) return null;
    const guess = BY_LEN[s.length];
    return guess ? { output: `Possível ${guess} (${s.length} hex)`, forcedScore: 0.5 } : null;
  },
});
