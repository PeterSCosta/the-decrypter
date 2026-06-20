import { mapDecoder } from "../define";

const VALUES: [string, number][] = [
  ["M", 1000],
  ["CM", 900],
  ["D", 500],
  ["CD", 400],
  ["C", 100],
  ["XC", 90],
  ["L", 50],
  ["XL", 40],
  ["X", 10],
  ["IX", 9],
  ["V", 5],
  ["IV", 4],
  ["I", 1],
];

function intToRoman(n: number): string {
  let r = "";
  let x = n;
  for (const [s, v] of VALUES) {
    while (x >= v) {
      r += s;
      x -= v;
    }
  }
  return r;
}

function romanToInt(s: string): number | null {
  let n = 0;
  let i = 0;
  for (const [sym, v] of VALUES) {
    while (s.startsWith(sym, i)) {
      n += v;
      i += sym.length;
    }
  }
  // válido só se reconstrói exatamente (rejeita "IIII", "VX", etc.)
  return i === s.length && intToRoman(n) === s ? n : null;
}

export const decoders = mapDecoder({
  id: "roman",
  name: "Números romanos",
  category: "transform",
  decode(input) {
    const s = input.trim();
    if (/^[IVXLCDM]+$/i.test(s)) {
      const n = romanToInt(s.toUpperCase());
      return n === null ? null : { output: `${s.toUpperCase()} = ${n}`, forcedScore: 0.75 };
    }
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (n < 1 || n > 3999) return null;
      return { output: `${n} = ${intToRoman(n)}`, forcedScore: 0.6 };
    }
    return null;
  },
});
