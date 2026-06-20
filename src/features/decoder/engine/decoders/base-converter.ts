import { mapDecoder } from "../define";

/** Mostra um número em decimal, hexadecimal, octal e binário. */
export const decoders = mapDecoder({
  id: "base-converter",
  name: "Conversor de base",
  category: "transform",
  decode(input) {
    const s = input.trim();
    let n: number | null = null;
    if (/^0x[0-9a-f]+$/i.test(s)) n = Number.parseInt(s.slice(2), 16);
    else if (/^0b[01]+$/i.test(s)) n = Number.parseInt(s.slice(2), 2);
    else if (/^\d+$/.test(s)) n = Number.parseInt(s, 10);
    else return null;
    if (n === null || !Number.isSafeInteger(n)) return null;
    return {
      output: `dec ${n} · hex ${n.toString(16).toUpperCase()} · oct ${n.toString(8)} · bin ${n.toString(2)}`,
      forcedScore: 0.45,
    };
  },
});
