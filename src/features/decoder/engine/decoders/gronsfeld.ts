import { mapDecoder } from "../define";

/** Gronsfeld: Vigenère com chave numérica (dígitos). Usa os dígitos da chave. */
export const decoders = mapDecoder({
  id: "gronsfeld",
  name: "Gronsfeld",
  category: "classical",
  decode(input, ctx) {
    const key = (ctx.key || "").replace(/\D/g, "");
    if (key.length === 0) return null;
    let out = "";
    let ki = 0;
    for (const ch of input) {
      const c = ch.charCodeAt(0);
      const lower = c >= 97 && c <= 122;
      const upper = c >= 65 && c <= 90;
      if (lower || upper) {
        const base = lower ? 97 : 65;
        const shift = Number(key[ki % key.length]);
        out += String.fromCharCode(((c - base - shift + 26) % 26) + base);
        ki++;
      } else out += ch;
    }
    return { output: out, label: `chave: ${key}` };
  },
});
