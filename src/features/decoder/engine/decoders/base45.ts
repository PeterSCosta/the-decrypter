import { mapDecoder } from "../define";
import { bytesToText } from "../util";

// Base45 (RFC 9285) — usado em QR Codes (ex.: certificados COVID).
const B45 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

export const decoders = mapDecoder({
  id: "base45",
  name: "Base45",
  category: "encoding",
  decode(input) {
    const s = input.trim().toUpperCase();
    if (s.length < 2 || ![...s].every((c) => B45.includes(c))) return null;
    const out: number[] = [];
    for (let i = 0; i < s.length; ) {
      const left = s.length - i;
      if (left >= 3) {
        const n = B45.indexOf(s[i]) + B45.indexOf(s[i + 1]) * 45 + B45.indexOf(s[i + 2]) * 2025;
        if (n > 0xffff) return null;
        out.push((n >> 8) & 0xff, n & 0xff);
        i += 3;
      } else if (left === 2) {
        const n = B45.indexOf(s[i]) + B45.indexOf(s[i + 1]) * 45;
        if (n > 0xff) return null;
        out.push(n & 0xff);
        i += 2;
      } else return null;
    }
    return bytesToText(Uint8Array.from(out));
  },
});
