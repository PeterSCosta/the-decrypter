import { mapDecoder } from "../define";
import { stripDiacritics } from "../util";

/**
 * Cifra Bifid (Delastelle): combina o quadrado de Políbio 5×5 (I/J juntos) com
 * transposição fracionada. Versão sem período (mensagem inteira). Quadrado opcional
 * com chave via `ctx.key`. Decifra a mensagem inteira de uma vez.
 */
export function bifidSquare(key: string): string {
  let s = "";
  for (const ch of `${key}ABCDEFGHIKLMNOPQRSTUVWXYZ`.toUpperCase().replace(/J/g, "I")) {
    if (ch >= "A" && ch <= "Z" && !s.includes(ch)) s += ch;
  }
  return s; // 25 letras
}

export const decoders = mapDecoder({
  id: "bifid",
  name: "Bifid",
  category: "classical",
  decode(input, ctx) {
    const letters = stripDiacritics(input)
      .toUpperCase()
      .replace(/J/g, "I")
      .replace(/[^A-Z]/g, "");
    const n = letters.length;
    if (n < 4) return null;
    const key = (ctx.key || "").replace(/[^a-zA-Z]/g, "");
    const sq = bifidSquare(key);

    // Sequência de coordenadas: por letra cifrada, [linha, coluna] intercalados.
    const seq: number[] = [];
    for (const ch of letters) {
      const idx = sq.indexOf(ch);
      if (idx < 0) return null;
      seq.push(Math.floor(idx / 5), idx % 5);
    }
    // Na cifragem a sequência era [todas as linhas, depois todas as colunas].
    const rows = seq.slice(0, n);
    const cols = seq.slice(n);
    let out = "";
    for (let i = 0; i < n; i++) out += sq[rows[i] * 5 + cols[i]];
    return { output: out, label: key ? `chave: ${key.toUpperCase()}` : "sem chave" };
  },
});
