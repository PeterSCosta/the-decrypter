import { mapDecoder } from "./define";
import type { Decoder } from "./types";
import { bytesToText } from "./util";

const stripWs = (s: string) => s.replace(/\s+/g, "");

// ---- Base64 ---------------------------------------------------------------
function decodeBase64(input: string): string | null {
  const s = stripWs(input).replace(/-/g, "+").replace(/_/g, "/"); // tolerate base64url
  if (s.length < 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return null;
  try {
    const bin = atob(s);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return bytesToText(bytes);
  } catch {
    return null;
  }
}

// ---- Base32 (RFC 4648) ----------------------------------------------------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function decodeBase32(input: string): string | null {
  const s = stripWs(input).toUpperCase().replace(/=+$/, "");
  if (s.length < 2 || !/^[A-Z2-7]+$/.test(s)) return null;
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of s) {
    const idx = B32.indexOf(ch);
    if (idx < 0) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return bytesToText(Uint8Array.from(out));
}

// ---- Hex ------------------------------------------------------------------
function decodeHex(input: string): string | null {
  const s = stripWs(input).replace(/0x/gi, "");
  if (s.length < 2 || s.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(s)) return null;
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 2) out.push(Number.parseInt(s.slice(i, i + 2), 16));
  return bytesToText(Uint8Array.from(out));
}

// ---- Binary (8-bit) -------------------------------------------------------
function decodeBinary(input: string): string | null {
  const groups = input.trim().split(/\s+/);
  const bitstr = groups.join("");
  if (!/^[01]+$/.test(bitstr)) return null;
  if (bitstr.length % 8 !== 0) return null;
  const out: number[] = [];
  for (let i = 0; i < bitstr.length; i += 8) out.push(Number.parseInt(bitstr.slice(i, i + 8), 2));
  return bytesToText(Uint8Array.from(out));
}

// ---- Decimal / Octal char codes ------------------------------------------
function decodeRadixCodes(input: string, radix: number): string | null {
  const parts = input
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (parts.length === 0) return null;
  const re = radix === 8 ? /^[0-7]+$/ : /^\d+$/;
  const codes: number[] = [];
  for (const p of parts) {
    if (!re.test(p)) return null;
    const n = Number.parseInt(p, radix);
    if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return null;
    codes.push(n);
  }
  try {
    return String.fromCodePoint(...codes);
  } catch {
    return null;
  }
}

// ---- ROT47 ----------------------------------------------------------------
function rot47(input: string): string {
  let out = "";
  for (const ch of input) {
    const c = ch.charCodeAt(0);
    out += c >= 33 && c <= 126 ? String.fromCharCode(33 + ((c - 33 + 47) % 94)) : ch;
  }
  return out;
}

// ---- HTML entities --------------------------------------------------------
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  eacute: "é",
  aacute: "á",
  atilde: "ã",
  ccedil: "ç",
  otilde: "õ",
  ocirc: "ô",
};
function decodeHtml(input: string): string | null {
  if (!/&(#x?[0-9a-f]+|[a-z]+);/i.test(input)) return null;
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1].toLowerCase() === "x"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return m;
      }
    }
    return NAMED[body.toLowerCase()] ?? m;
  });
}

// ---- URL percent-encoding -------------------------------------------------
function decodeUrl(input: string): string | null {
  if (!/%[0-9a-fA-F]{2}|\+/.test(input)) return null;
  try {
    return decodeURIComponent(input.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

// ---- Morse ----------------------------------------------------------------
const MORSE: Record<string, string> = {
  ".-": "A",
  "-...": "B",
  "-.-.": "C",
  "-..": "D",
  ".": "E",
  "..-.": "F",
  "--.": "G",
  "....": "H",
  "..": "I",
  ".---": "J",
  "-.-": "K",
  ".-..": "L",
  "--": "M",
  "-.": "N",
  "---": "O",
  ".--.": "P",
  "--.-": "Q",
  ".-.": "R",
  "...": "S",
  "-": "T",
  "..-": "U",
  "...-": "V",
  ".--": "W",
  "-..-": "X",
  "-.--": "Y",
  "--..": "Z",
  "-----": "0",
  ".----": "1",
  "..---": "2",
  "...--": "3",
  "....-": "4",
  ".....": "5",
  "-....": "6",
  "--...": "7",
  "---..": "8",
  "----.": "9",
  ".-.-.-": ".",
  "--..--": ",",
  "..--..": "?",
  "-..-.": "/",
  "-....-": "-",
};
function decodeMorse(input: string): string | null {
  if (!/^[.\-/\s|]+$/.test(input.trim()) || !/[.\-]/.test(input)) return null;
  const words = input.trim().split(/\s*[/|]\s*|\s{3,}/);
  const out = words
    .map((w) =>
      w
        .trim()
        .split(/\s+/)
        .map((sym) => MORSE[sym] ?? (sym ? "?" : ""))
        .join(""),
    )
    .join(" ");
  return out.replace(/\?+/g, "").trim() ? out : null;
}

// ---- Braille (Grade 1, letters) ------------------------------------------
const BRAILLE: Record<string, string> = {
  "⠁": "a",
  "⠃": "b",
  "⠉": "c",
  "⠙": "d",
  "⠑": "e",
  "⠋": "f",
  "⠛": "g",
  "⠓": "h",
  "⠊": "i",
  "⠚": "j",
  "⠅": "k",
  "⠇": "l",
  "⠍": "m",
  "⠝": "n",
  "⠕": "o",
  "⠏": "p",
  "⠟": "q",
  "⠗": "r",
  "⠎": "s",
  "⠞": "t",
  "⠥": "u",
  "⠧": "v",
  "⠺": "w",
  "⠭": "x",
  "⠽": "y",
  "⠵": "z",
  "⠀": " ",
};
function decodeBraille(input: string): string | null {
  if (!/[⠀-⣿]/.test(input)) return null;
  let out = "";
  for (const ch of input) out += BRAILLE[ch] ?? (ch.codePointAt(0)! >= 0x2800 ? "?" : ch);
  return out.replace(/\?+/g, "").trim() ? out : null;
}

// ==== Codificadores (inverso) =============================================
const utf8 = (s: string) => new TextEncoder().encode(s);
const TEXT_TO_MORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const TEXT_TO_BRAILLE = Object.fromEntries(Object.entries(BRAILLE).map(([k, v]) => [v, k]));

const encodeBase64 = (s: string) => btoa(String.fromCharCode(...utf8(s)));

function encodeBase32(s: string): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of utf8(s)) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += B32[(value >>> bits) & 31];
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += "=";
  return out;
}

const encodeHex = (s: string) => [...utf8(s)].map((b) => b.toString(16).padStart(2, "0")).join("");

const encodeBinary = (s: string) =>
  [...utf8(s)].map((b) => b.toString(2).padStart(8, "0")).join(" ");

const encodeRadixCodes = (s: string, radix: number) =>
  [...s].map((ch) => (ch.codePointAt(0) ?? 0).toString(radix)).join(" ");

const HTML_ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const encodeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESC[c]);

const encodeMorse = (s: string) =>
  s
    .toUpperCase()
    .split(/\s+/)
    .map((w) =>
      [...w]
        .map((ch) => TEXT_TO_MORSE[ch] ?? "")
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join(" / ");

const encodeBraille = (s: string) =>
  [...s.toLowerCase()].map((ch) => TEXT_TO_BRAILLE[ch] ?? "").join("");

const single = (
  id: string,
  name: string,
  category: Decoder["category"],
  fn: (input: string) => string | null,
  encode?: (input: string) => string | null,
): Decoder => mapDecoder({ id, name, category, decode: fn, encode });

export const codecDecoders: Decoder[] = [
  single("base64", "Base64", "encoding", decodeBase64, encodeBase64),
  single("base32", "Base32", "encoding", decodeBase32, encodeBase32),
  single("hex", "Hexadecimal", "encoding", decodeHex, encodeHex),
  single("binary", "Binário", "encoding", decodeBinary, encodeBinary),
  single(
    "decimal",
    "Decimal (códigos ASCII)",
    "encoding",
    (s) => decodeRadixCodes(s, 10),
    (s) => encodeRadixCodes(s, 10),
  ),
  single(
    "octal",
    "Octal",
    "encoding",
    (s) => decodeRadixCodes(s, 8),
    (s) => encodeRadixCodes(s, 8),
  ),
  single("url", "URL (percent-encoding)", "encoding", decodeUrl, (s) => encodeURIComponent(s)),
  single("html", "Entidades HTML", "encoding", decodeHtml, encodeHtml),
  single("morse", "Código Morse", "encoding", decodeMorse, encodeMorse),
  single("braille", "Braille", "encoding", decodeBraille, encodeBraille),
  single("rot47", "ROT47", "transform", rot47, rot47),
  single(
    "reverse",
    "Texto invertido",
    "transform",
    (s) => [...s].reverse().join(""),
    (s) => [...s].reverse().join(""),
  ),
];
