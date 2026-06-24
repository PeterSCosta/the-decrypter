import { mapDecoder } from "../define";
import { bytesToText } from "../util";

/**
 * XOR de chave repetida: clássico de CTF. Interpreta a entrada como bytes (hex,
 * se for hex par; senão UTF-8) e aplica XOR com a `ctx.key` repetida. Só mostra
 * resultado se for majoritariamente imprimível (texto plausível).
 */
function toBytes(text: string): Uint8Array {
  const hex = text.replace(/\s+/g, "");
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0 && hex.length >= 4) {
    return Uint8Array.from(hex.match(/.{2}/g) ?? [], (h) => Number.parseInt(h, 16));
  }
  return new TextEncoder().encode(text);
}

export const decoders = mapDecoder({
  id: "xor-key",
  name: "XOR (com chave)",
  category: "transform",
  decode(input, ctx) {
    const key = ctx.key ?? "";
    if (!key) return null;
    const bytes = toBytes(input.trim());
    if (bytes.length === 0) return null;
    const kb = new TextEncoder().encode(key);
    const out = bytes.map((b, i) => b ^ kb[i % kb.length]);
    const decoded = bytesToText(out);
    if (decoded == null) return null;
    const printable = [...decoded].filter((c) => c >= " " || c === "\n" || c === "\t").length;
    if (printable / decoded.length < 0.85) return null;
    return { output: decoded, label: `XOR chave: ${key}` };
  },
});
