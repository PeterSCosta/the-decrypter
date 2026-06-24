import { bruteDecoder } from "../define";
import { letterCount, shiftLetter } from "../util";

/**
 * Cifra de Trithemius: César progressivo SEM chave — a i-ésima letra é deslocada
 * por `i` (A=+0, B=+1, …), contando só letras. Decifrar desloca por `-i`. Como
 * não tem chave, roda no fan-out automático e o scorePlaintext escolhe a direção
 * legível. (Equivale a um Vigenère com chave "ABCDEFG…".)
 */
export function trithemius(input: string, dir: 1 | -1): string {
  let i = 0;
  let out = "";
  for (const ch of input) {
    const isLetter = /[a-zA-Z]/.test(ch);
    out += isLetter ? shiftLetter(ch, dir * i) : ch;
    if (isLetter) i++;
  }
  return out;
}

export const decoders = bruteDecoder({
  id: "trithemius",
  name: "Trithemius (César progressivo)",
  category: "classical",
  keep: 2,
  variants: (input) => {
    if (letterCount(input) < 3) return [];
    return [
      { label: "decifrar (−posição)", output: trithemius(input, -1) },
      { label: "cifrar (+posição)", output: trithemius(input, 1) },
    ];
  },
});
