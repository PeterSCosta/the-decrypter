import { mapDecoder } from "../define";

/** Cifra de Beaufort (recíproca): P = K − C (mod 26). Usa a chave do campo. */
export const decoders = mapDecoder({
  id: "beaufort",
  name: "Beaufort",
  category: "classical",
  decode(input, ctx) {
    const key = (ctx.key || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (key.length === 0) return null;
    let out = "";
    let ki = 0;
    for (const ch of input) {
      const c = ch.charCodeAt(0);
      const lower = c >= 97 && c <= 122;
      const upper = c >= 65 && c <= 90;
      if (lower || upper) {
        const base = lower ? 97 : 65;
        const p = (key.charCodeAt(ki % key.length) - 97 - (c - base) + 26) % 26;
        out += String.fromCharCode(p + base);
        ki++;
      } else out += ch;
    }
    return { output: out, label: `chave: ${key.toUpperCase()}` };
  },
});
