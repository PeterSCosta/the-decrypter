import { mapDecoder } from "../define";
import { bytesToText } from "../util";

// Base32 "extended hex" (RFC 4648 §7) — alfabeto 0-9 A-V.
const B32HEX = "0123456789ABCDEFGHIJKLMNOPQRSTUV";

export const decoders = mapDecoder({
  id: "base32hex",
  name: "Base32 (hex extendido)",
  category: "encoding",
  decode(input) {
    const s = input.trim().toUpperCase().replace(/=+$/, "");
    if (s.length < 2 || !/^[0-9A-V]+$/.test(s)) return null;
    let bits = 0;
    let value = 0;
    const out: number[] = [];
    for (const ch of s) {
      value = (value << 5) | B32HEX.indexOf(ch);
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        out.push((value >>> bits) & 0xff);
      }
    }
    return bytesToText(Uint8Array.from(out));
  },
});
