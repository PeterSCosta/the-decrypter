import { bruteDecoder, mapDecoder } from "./define";
import type { Decoder } from "./types";
import { mod, shiftLetter } from "./util";

function caesarShift(input: string, n: number): string {
  let out = "";
  for (const ch of input) out += shiftLetter(ch, n);
  return out;
}

// ---- Caesar / ROT-N (every shift, best surfaced) -------------------------
const caesar = bruteDecoder({
  id: "caesar",
  name: "César / ROT-N",
  keep: 3,
  variants(input) {
    const out: { label: string; output: string }[] = [];
    for (let n = 1; n <= 25; n++) {
      if (n === 13) continue; // ROT13 has its own decoder
      out.push({ label: `deslocamento ${n}`, output: caesarShift(input, n) });
    }
    return out;
  },
});

const rot13 = mapDecoder({
  id: "rot13",
  name: "ROT13",
  category: "classical",
  decode: (input) => caesarShift(input, 13),
});

// ---- Atbash ---------------------------------------------------------------
const atbash = mapDecoder({
  id: "atbash",
  name: "Atbash (alfabeto invertido A↔Z)",
  category: "classical",
  decode(input) {
    let out = "";
    for (const ch of input) {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) out += String.fromCharCode(90 - (c - 65));
      else if (c >= 97 && c <= 122) out += String.fromCharCode(122 - (c - 97));
      else out += ch;
    }
    return out;
  },
});

// ---- Vigenère (keyed) -----------------------------------------------------
const vigenere = mapDecoder({
  id: "vigenere",
  name: "Vigenère",
  category: "classical",
  decode(input, ctx) {
    const key = (ctx.key || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (key.length === 0) return null;
    let out = "";
    let ki = 0;
    for (const ch of input) {
      const c = ch.charCodeAt(0);
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
        out += shiftLetter(ch, -(key.charCodeAt(ki % key.length) - 97));
        ki++;
      } else out += ch;
    }
    return { output: out, label: `chave: ${key.toUpperCase()}` };
  },
});

// ---- A1Z26 (numbers → letters) -------------------------------------------
const a1z26 = mapDecoder({
  id: "a1z26",
  name: "A1Z26 (número→letra)",
  category: "classical",
  decode(input) {
    const tokens = input
      .trim()
      .split(/[\s,;.\-_/]+/)
      .filter(Boolean);
    if (tokens.length === 0 || !tokens.every((t) => /^\d{1,2}$/.test(t))) return null;
    const nums = tokens.map(Number);
    if (!nums.every((n) => n >= 1 && n <= 26)) return null;
    return nums.map((n) => String.fromCharCode(96 + n)).join("");
  },
});

// ---- A1Z26 inverso (letras → números) ------------------------------------
const a1z26Encode = mapDecoder({
  id: "a1z26-encode",
  name: "A1Z26 (letra→número)",
  category: "classical",
  decode(input) {
    if (!/[a-zA-Z]/.test(input)) return null;
    return input
      .split(/(\s+)/) // keep word breaks
      .map((tok) =>
        /^\s+$/.test(tok)
          ? " "
          : [...tok]
              .map((ch) => {
                const c = ch.toLowerCase().charCodeAt(0);
                return c >= 97 && c <= 122 ? String(c - 96) : ch;
              })
              .join(" "),
      )
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  },
});

// ---- Rail fence (zig-zag transposition) ----------------------------------
export function railFenceDecrypt(text: string, rails: number): string {
  if (rails < 2 || rails >= text.length) return text;
  const pattern: number[] = [];
  let r = 0;
  let dir = 1;
  for (let i = 0; i < text.length; i++) {
    pattern.push(r);
    if (r === 0) dir = 1;
    else if (r === rails - 1) dir = -1;
    r += dir;
  }
  const order = Array.from({ length: text.length }, (_, i) => i).sort(
    (a, b) => pattern[a] - pattern[b] || a - b,
  );
  const res = new Array<string>(text.length);
  order.forEach((pos, k) => {
    res[pos] = text[k];
  });
  return res.join("");
}

const railFence = bruteDecoder({
  id: "railfence",
  name: "Cerca (rail fence)",
  keep: 2,
  variants(input) {
    if (input.trim().length < 4) return [];
    const out: { label: string; output: string }[] = [];
    for (let rails = 2; rails <= 6; rails++) {
      out.push({ label: `${rails} trilhos`, output: railFenceDecrypt(input, rails) });
    }
    return out;
  },
});

// ---- Bacon (24-letter, A/B or 0/1) ---------------------------------------
const BACON: Record<string, string> = {};
(() => {
  const letters = "ABCDEFGHIKLMNOPQRSTUWXYZ"; // 24-letter (I=J, U=V)
  for (let i = 0; i < 24; i++) BACON[i.toString(2).padStart(5, "0")] = letters[i];
})();
const bacon = mapDecoder({
  id: "bacon",
  name: "Cifra de Bacon",
  category: "classical",
  decode(input) {
    let s = input.toLowerCase().replace(/[^ab01]/g, "");
    if (s.length < 5) return null;
    s = s.replace(/a/g, "0").replace(/b/g, "1");
    if (!/^[01]+$/.test(s) || s.length % 5 !== 0) return null;
    let out = "";
    for (let i = 0; i < s.length; i += 5) out += BACON[s.slice(i, i + 5)] ?? "?";
    return out.includes("?") ? null : out;
  },
});

// ---- Affine (brute force valid a, b) -------------------------------------
function modInverse(a: number, m: number): number | null {
  for (let x = 1; x < m; x++) if (mod(a * x, m) === 1) return x;
  return null;
}
const affine = bruteDecoder({
  id: "affine",
  name: "Afim (affine)",
  keep: 2,
  variants(input) {
    const coprime = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
    const out: { label: string; output: string }[] = [];
    for (const a of coprime) {
      const ai = modInverse(a, 26);
      if (ai === null) continue;
      for (let b = 0; b < 26; b++) {
        let res = "";
        for (const ch of input) {
          const c = ch.charCodeAt(0);
          const upper = c >= 65 && c <= 90;
          const lower = c >= 97 && c <= 122;
          if (upper || lower) {
            const x = lower ? c - 97 : c - 65;
            res += String.fromCharCode(mod(ai * (x - b), 26) + (lower ? 97 : 65));
          } else res += ch;
        }
        out.push({ label: `a=${a}, b=${b}`, output: res });
      }
    }
    return out;
  },
});

// ---- NATO phonetic alphabet ----------------------------------------------
const NATO: Record<string, string> = {
  alfa: "A",
  alpha: "A",
  bravo: "B",
  charlie: "C",
  delta: "D",
  echo: "E",
  foxtrot: "F",
  golf: "G",
  hotel: "H",
  india: "I",
  juliett: "J",
  juliet: "J",
  kilo: "K",
  lima: "L",
  mike: "M",
  november: "N",
  oscar: "O",
  papa: "P",
  quebec: "Q",
  romeo: "R",
  sierra: "S",
  tango: "T",
  uniform: "U",
  victor: "V",
  whiskey: "W",
  xray: "X",
  "x-ray": "X",
  yankee: "Y",
  zulu: "Z",

  /**
   * ── OS DÍGITOS FALTAVAM, E UMA PROVA REAL PRECISOU DELES ─────────────────
   * A tabela tinha 29 chaves, todas LETRAS. A p12-E3 do Itajaí Challenge 2024
   * dita por rádio `TWO FIVE JULIET ROMEO PLUS PAPA EIGHT`, que é o Plus Code
   * `25JR+P8` — e a bancada devolvia nada: 3 acertos em 7 palavras = 43%,
   * abaixo do portão de 60%. A cifra mais previsível de uma prova de rádio.
   *
   * `niner` entra junto porque é a forma que se usa no ar de verdade: "nine"
   * confunde com "five" em rádio ruim, e a aviação padronizou o alongamento.
   * `PLUS` não é do alfabeto fonético — é o separador do Plus Code, ditado como
   * palavra, e sem ele a leitura do código quebra no meio.
   */
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  tree: "3",
  four: "4",
  fower: "4",
  five: "5",
  fife: "5",
  six: "6",
  seven: "7",
  eight: "8",
  ait: "8",
  nine: "9",
  niner: "9",
  plus: "+",
};
const nato = mapDecoder({
  id: "nato",
  name: "Alfabeto fonético (NATO)",
  category: "classical",
  decode(input) {
    const words = input
      .trim()
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean);
    if (words.length === 0) return null;
    const hit = words.filter((w) => w in NATO).length;
    if (hit / words.length < 0.6) return null;
    return words.map((w) => NATO[w] ?? "?").join("");
  },
});

// ---- Keyboard shift (QWERTY ±1) ------------------------------------------
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
function keyboardShift(input: string, delta: number): string {
  let out = "";
  for (const ch of input) {
    const low = ch.toLowerCase();
    let moved = ch;
    for (const row of ROWS) {
      const i = row.indexOf(low);
      if (i >= 0) {
        const j = i + delta;
        if (j >= 0 && j < row.length) moved = ch === low ? row[j] : row[j].toUpperCase();
        break;
      }
    }
    out += moved;
  }
  return out;
}
const keyboard = bruteDecoder({
  id: "keyboard",
  name: "Deslocamento de teclado (QWERTY)",
  keep: 1,
  variants: (input) => [
    { label: "← 1 tecla", output: keyboardShift(input, -1) },
    { label: "→ 1 tecla", output: keyboardShift(input, 1) },
  ],
});

export const cipherDecoders: Decoder[] = [
  caesar,
  rot13,
  atbash,
  vigenere,
  a1z26,
  a1z26Encode,
  railFence,
  bacon,
  affine,
  nato,
  keyboard,
];
