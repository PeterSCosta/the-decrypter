import { mapDecoder } from "../define";

// Teclado de celular (multitap): cada tecla repetida = posição da letra.
const KEYS: Record<string, string> = {
  "2": "abc",
  "3": "def",
  "4": "ghi",
  "5": "jkl",
  "6": "mno",
  "7": "pqrs",
  "8": "tuv",
  "9": "wxyz",
};

export const decoders = mapDecoder({
  id: "t9-multitap",
  name: "Teclado T9 (multitap)",
  category: "encoding",
  decode(input) {
    const tokens = input.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return null;
    let out = "";
    for (const t of tokens) {
      if (t === "0") {
        out += " ";
        continue;
      }
      const d = t[0];
      const letters = KEYS[d];
      // o token tem que ser o MESMO dígito repetido (ex.: "777" = r)
      if (!letters || !/^(\d)\1*$/.test(t) || t.length > letters.length) return null;
      out += letters[t.length - 1];
    }
    return out;
  },
});
