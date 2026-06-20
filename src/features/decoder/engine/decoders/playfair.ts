import { mapDecoder } from "../define";

function buildSquare(key: string): string {
  const seen = new Set<string>();
  let sq = "";
  for (const ch of `${key}ABCDEFGHIKLMNOPQRSTUVWXYZ`.toUpperCase().replace(/J/g, "I")) {
    if (ch >= "A" && ch <= "Z" && !seen.has(ch)) {
      seen.add(ch);
      sq += ch;
    }
  }
  return sq; // 25 chars (I/J unidos)
}

/** Playfair (decifra digramas). Chave vem do campo de chave. */
export const decoders = mapDecoder({
  id: "playfair",
  name: "Playfair",
  category: "classical",
  decode(input, ctx) {
    const key = (ctx.key || "").replace(/[^a-zA-Z]/g, "");
    if (!key) return null;
    const sq = buildSquare(key);
    const text = input
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .replace(/J/g, "I");
    if (text.length < 2 || text.length % 2 !== 0) return null;

    let out = "";
    for (let i = 0; i < text.length; i += 2) {
      const a = sq.indexOf(text[i]);
      const b = sq.indexOf(text[i + 1]);
      const ra = Math.floor(a / 5);
      const ca = a % 5;
      const rb = Math.floor(b / 5);
      const cb = b % 5;
      if (ra === rb) {
        out += sq[ra * 5 + ((ca + 4) % 5)] + sq[rb * 5 + ((cb + 4) % 5)];
      } else if (ca === cb) {
        out += sq[((ra + 4) % 5) * 5 + ca] + sq[((rb + 4) % 5) * 5 + cb];
      } else {
        out += sq[ra * 5 + cb] + sq[rb * 5 + ca];
      }
    }
    return { output: out, label: `chave: ${key.toUpperCase()}` };
  },
});
