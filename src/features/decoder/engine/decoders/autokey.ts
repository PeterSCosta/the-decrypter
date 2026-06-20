import { mapDecoder } from "../define";

/** Vigenère autokey (decifra): a chave é o primer + o próprio texto decifrado. */
export const decoders = mapDecoder({
  id: "autokey",
  name: "Vigenère autokey",
  category: "classical",
  decode(input, ctx) {
    const primer = (ctx.key || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (!primer) return null;

    const ks: number[] = [...primer].map((c) => c.charCodeAt(0) - 97);
    let out = "";
    let ki = 0;
    for (const ch of input) {
      const c = ch.charCodeAt(0);
      const lower = c >= 97 && c <= 122;
      const upper = c >= 65 && c <= 90;
      if (lower || upper) {
        const base = lower ? 97 : 65;
        const p = (c - base - ks[ki] + 26) % 26;
        out += String.fromCharCode(p + base);
        ks.push(p); // texto decifrado estende a chave
        ki++;
      } else out += ch;
    }
    return { output: out, label: `chave: ${primer.toUpperCase()}` };
  },
});
