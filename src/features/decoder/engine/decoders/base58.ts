import { mapDecoder } from "../define";
import { bytesToText } from "../util";

// Base58 (alfabeto do Bitcoin: sem 0, O, I, l).
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const decoders = mapDecoder({
  id: "base58",
  name: "Base58",
  category: "encoding",
  decode(input) {
    const s = input.trim();
    // precisa de ao menos 1 letra (p/ não casar com números puros) e charset válido
    if (s.length < 3 || !/[A-Za-z]/.test(s) || ![...s].every((c) => ALPHABET.includes(c))) {
      return null;
    }
    const bytes = [0];
    for (const c of s) {
      let carry = ALPHABET.indexOf(c);
      for (let j = 0; j < bytes.length; j++) {
        carry += bytes[j] * 58;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    for (const c of s) {
      if (c === "1") bytes.push(0);
      else break;
    }
    return bytesToText(Uint8Array.from(bytes.reverse()));
  },
});
