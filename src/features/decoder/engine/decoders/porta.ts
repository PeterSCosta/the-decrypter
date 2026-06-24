import { mapDecoder } from "../define";
import { mod } from "../util";

/**
 * Cifra de Della Porta: polialfabética RECÍPROCA (cifrar == decifrar) com chave.
 * A letra-chave escolhe uma de 13 linhas (A/B=0, C/D=1, …, Y/Z=12). Reusa a
 * `ctx.key`, como Vigenère/Playfair. Por ser recíproca, o mesmo decoder cifra e
 * decifra — o resultado é o texto claro quando a chave está certa.
 */
export function portaLetter(ch: string, kRow: number): string {
  const c = ch.charCodeAt(0);
  const lower = c >= 97 && c <= 122;
  const upper = c >= 65 && c <= 90;
  if (!lower && !upper) return ch;
  const idx = lower ? c - 97 : c - 65;
  const out = idx < 13 ? 13 + mod(idx + kRow, 13) : mod(idx - 13 - kRow, 13);
  return String.fromCharCode(out + (lower ? 97 : 65));
}

export const decoders = mapDecoder({
  id: "porta",
  name: "Porta (Della Porta)",
  category: "classical",
  decode(input, ctx) {
    const key = (ctx.key || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (!key) return null;
    let ki = 0;
    let out = "";
    for (const ch of input) {
      if (/[a-zA-Z]/.test(ch)) {
        const kRow = Math.floor((key.charCodeAt(ki % key.length) - 97) / 2);
        out += portaLetter(ch, kRow);
        ki++;
      } else {
        out += ch;
      }
    }
    return { output: out, label: `chave: ${key.toUpperCase()}` };
  },
});
