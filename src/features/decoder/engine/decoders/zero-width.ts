import { mapDecoder } from "../define";

/**
 * Detecta texto escondido em caracteres invisíveis (zero-width). Convenção
 * comum: ZERO WIDTH SPACE (U+200B) = 0, ZERO WIDTH NON-JOINER (U+200C) = 1.
 */
const ZW_CODES = new Set([0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x2060, 0xfeff]);
const isZw = (ch: string) => ZW_CODES.has(ch.codePointAt(0) ?? -1);

export const decoders = mapDecoder({
  id: "zero-width",
  name: "Caracteres invisíveis (zero-width)",
  category: "encoding",
  decode(input) {
    if (![...input].some(isZw)) return null;

    let bits = "";
    for (const c of input) {
      const code = c.codePointAt(0);
      if (code === 0x200b) bits += "0";
      else if (code === 0x200c) bits += "1";
    }

    if (bits.length >= 8) {
      let out = "";
      for (let i = 0; i + 8 <= bits.length; i += 8) {
        out += String.fromCharCode(Number.parseInt(bits.slice(i, i + 8), 2));
      }
      if (/^[\x20-\x7e\s]+$/.test(out)) {
        return { output: out, notes: "texto oculto em caracteres invisíveis", forcedScore: 0.95 };
      }
      return { output: `bits ocultos: ${bits}`, forcedScore: 0.7 };
    }

    const count = [...input].filter(isZw).length;
    return { output: `${count} caractere(s) invisível(is) detectado(s).`, forcedScore: 0.6 };
  },
});
