import { mapDecoder } from "../define";

const rot5 = (input: string) => input.replace(/[0-9]/g, (d) => String((Number(d) + 5) % 10));

function rot18(input: string): string {
  let out = "";
  for (const ch of input) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) out += String.fromCharCode(((c - 65 + 13) % 26) + 65);
    else if (c >= 97 && c <= 122) out += String.fromCharCode(((c - 97 + 13) % 26) + 97);
    else if (c >= 48 && c <= 57) out += String((Number(ch) + 5) % 10);
    else out += ch;
  }
  return out;
}

export const decoders = [
  mapDecoder({ id: "rot5", name: "ROT5 (dígitos)", category: "transform", decode: rot5 }),
  mapDecoder({
    id: "rot18",
    name: "ROT18 (letras + dígitos)",
    category: "transform",
    decode: rot18,
  }),
];
