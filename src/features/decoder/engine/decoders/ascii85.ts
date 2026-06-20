import { mapDecoder } from "../define";
import { bytesToText } from "../util";

/** Ascii85 / Base85 (estilo Adobe, com ou sem delimitadores <~ ~>). */
export const decoders = mapDecoder({
  id: "ascii85",
  name: "Ascii85 / Base85",
  category: "encoding",
  decode(input) {
    let s = input.trim();
    const delimited = /^<~[\s\S]*~>$/.test(s);
    s = s.replace(/^<~/, "").replace(/~>$/, "").replace(/\s+/g, "");
    // sem delimitadores, exige um tamanho mínimo p/ evitar falsos positivos
    if (s.length < (delimited ? 2 : 10)) return null;

    const out: number[] = [];
    let tuple = 0;
    let count = 0;
    for (const ch of s) {
      if (ch === "z" && count === 0) {
        out.push(0, 0, 0, 0);
        continue;
      }
      const v = ch.charCodeAt(0) - 33;
      if (v < 0 || v > 84) return null;
      tuple = tuple * 85 + v;
      if (++count === 5) {
        out.push((tuple >>> 24) & 0xff, (tuple >>> 16) & 0xff, (tuple >>> 8) & 0xff, tuple & 0xff);
        tuple = 0;
        count = 0;
      }
    }
    if (count === 1) return null; // resto inválido
    if (count > 0) {
      for (let i = count; i < 5; i++) tuple = tuple * 85 + 84;
      const b = [(tuple >>> 24) & 0xff, (tuple >>> 16) & 0xff, (tuple >>> 8) & 0xff, tuple & 0xff];
      for (let i = 0; i < count - 1; i++) out.push(b[i]);
    }
    return bytesToText(Uint8Array.from(out));
  },
});
