import { mapDecoder } from "../define";

/** Transposição colunar (decifra). A ordem das colunas vem da chave (campo chave). */
export const decoders = mapDecoder({
  id: "columnar",
  name: "Transposição colunar",
  category: "classical",
  decode(input, ctx) {
    const key = (ctx.key || "").trim();
    const cipher = input.toUpperCase().replace(/[^A-Z]/g, "");
    const cols = key.length;
    if (cols < 2 || cipher.length < cols) return null;

    const rows = Math.ceil(cipher.length / cols);
    const rem = cipher.length % cols; // 0 = grade cheia
    const colLen = (c: number) => (rem === 0 || c < rem ? rows : rows - 1);
    const order = [...Array(cols).keys()].sort((a, b) =>
      key[a] < key[b] ? -1 : key[a] > key[b] ? 1 : a - b,
    );

    const colChars: string[] = new Array(cols).fill("");
    let p = 0;
    for (const c of order) {
      const len = colLen(c);
      colChars[c] = cipher.slice(p, p + len);
      p += len;
    }

    let out = "";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r < colChars[c].length) out += colChars[c][r];
      }
    }
    return { output: out, label: `chave: ${key.toUpperCase()}` };
  },
});
