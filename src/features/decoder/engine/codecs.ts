import { BRAILLE_TO_LETTER, LETTER_TO_BRAILLE } from "@/features/reference/braille";
import { type DecodeResult, mapDecoder } from "./define";
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
/**
 * Código de Morse → letra.
 *
 * Exportado porque o Pollux e o Morbit precisam da MESMA tabela: elas não são
 * outra cifra, são o Morse escrito em dígito. Uma segunda cópia divergiria na
 * primeira pontuação acrescentada, e a divergência sairia como silêncio.
 */
export const MORSE_PARA_LETRA: Record<string, string> = {
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
/**
 * Traços e pontos que não são ASCII, e de onde eles vêm.
 *
 * O portão do Morse é literal de propósito — só ponto, traço e separador — e é
 * ele que impede o decoder de disparar em qualquer texto. O problema é que a
 * prova não chega digitada: ela chega colada de um PDF ou de uma imagem com
 * OCR, e aí o traço vira travessão (`—`), o ponto vira ponto médio (`·`) e a
 * ENTRADA INTEIRA é recusada por um caractere. A bancada cala numa cifra que
 * ela sabe ler.
 *
 * Isto é normalização de ENTRADA, não afrouxamento do portão: depois do
 * `replace` o portão continua exatamente o mesmo, e texto que não é Morse
 * segue sendo recusado.
 */
const MORSE_SINONIMOS: Record<string, string> = {
  "\u00b7": ".", // · ponto médio — o mais comum em PDF
  "\u2022": ".", // • marcador
  "\u2027": ".", // ‧ ponto de hifenização
  "\u2219": ".", // ∙ operador
  "\u22c5": ".", // ⋅ ponto de multiplicação
  "\uff0e": ".", // ． ponto de largura plena
  "\u2010": "-", // ‐ hífen tipográfico
  "\u2011": "-", // ‑ hífen não separável
  "\u2012": "-", // ‒ traço de algarismo
  "\u2013": "-", // – meia-risca
  "\u2014": "-", // — travessão
  "\u2015": "-", // ― barra horizontal
  "\u2212": "-", // − sinal de menos
  "\uff0d": "-", // － hífen de largura plena
  "\u30fc": "-", // ー prolongamento katakana (sai de OCR japonês)
};
const RE_MORSE_SINONIMOS = new RegExp(`[${Object.keys(MORSE_SINONIMOS).join("")}]`, "g");

/** Troca traço/ponto tipográfico pelo ASCII. Ver `MORSE_SINONIMOS`. */
export function normalizaMorse(input: string): string {
  return input.replace(RE_MORSE_SINONIMOS, (c) => MORSE_SINONIMOS[c] ?? c);
}

function decodeMorse(raw: string): string | null {
  const input = normalizaMorse(raw);
  if (!/^[.\-/\s|]+$/.test(input.trim()) || !/[.\-]/.test(input)) return null;
  const words = input.trim().split(/\s*[/|]\s*|\s{3,}/);
  const out = words
    .map((w) =>
      w
        .trim()
        .split(/\s+/)
        .map((sym) => MORSE_PARA_LETRA[sym] ?? (sym ? "?" : ""))
        .join(""),
    )
    .join(" ");
  return out.replace(/\?+/g, "").trim() ? out : null;
}

// ---- Braille (Grade 1, letters) ------------------------------------------
// O mapa vive em `reference/braille.ts` — compartilhado com o inspetor de
// espaços em branco, que monta a mesma célula a partir das linhas do texto.
/**
 * Braille Grade 1, com os dois PREFIXOS que mudam o que vem depois.
 *
 * `⠼` (U+283C) diz "o que segue é número" e `⠠` (U+2820) diz "a próxima letra é
 * maiúscula". Sem tratá-los, a leitura não ficava incompleta — ficava ERRADA e
 * com cara de certa: `⠼⠁⠃⠉` (o número 123) saía `?abc`, e o `?` era descartado
 * na linha de baixo, entregando "abc" como se fosse a resposta.
 *
 * As dez primeiras letras são os dez dígitos, nessa ordem — é a mesma célula, e
 * o prefixo é a única coisa que as distingue. O estado de número vale até o
 * próximo caractere que não seja letra de a..j; o de maiúscula vale para uma
 * letra só. Célula desconhecida continua virando `?` e continua reprovando a
 * saída inteira, como antes.
 */
const BRAILLE_NUMERO = "⠼";
const BRAILLE_MAIUSCULA = "⠠";
const DIGITO_DE = "abcdefghij"; // a→1 … i→9, j→0

function decodeBraille(input: string): string | null {
  if (!/[⠀-⣿]/.test(input)) return null;
  let out = "";
  let modoNumero = false;
  let proximaMaiuscula = false;
  for (const ch of input) {
    if (ch === BRAILLE_NUMERO) {
      modoNumero = true;
      continue;
    }
    if (ch === BRAILLE_MAIUSCULA) {
      proximaMaiuscula = true;
      modoNumero = false;
      continue;
    }
    const letra = BRAILLE_TO_LETTER[ch];
    if (letra === undefined) {
      // Fora do bloco Braille o caractere passa (espaço, pontuação do texto ao
      // redor) e o modo número morre; dentro do bloco vira `?`.
      modoNumero = false;
      out += ch.codePointAt(0)! >= 0x2800 ? "?" : ch;
      continue;
    }
    const i = DIGITO_DE.indexOf(letra);
    if (modoNumero && i >= 0) {
      out += String((i + 1) % 10);
      continue;
    }
    modoNumero = false;
    out += proximaMaiuscula ? letra.toUpperCase() : letra;
    proximaMaiuscula = false;
  }
  return out.replace(/\?+/g, "").trim() ? out : null;
}

// ==== Codificadores (inverso) =============================================
const utf8 = (s: string) => new TextEncoder().encode(s);
const TEXT_TO_MORSE = Object.fromEntries(Object.entries(MORSE_PARA_LETRA).map(([k, v]) => [v, k]));

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
  [...s.toLowerCase()].map((ch) => LETTER_TO_BRAILLE[ch] ?? "").join("");

// ---- Onda 6: os quatro de assinatura literal ---------------------------------

/**
 * Punycode (`xn--`) — o nome de domínio internacionalizado.
 *
 * Assinatura literal e medida: **100,00% de rejeição** nos dois corpora
 * (13.144 entradas reais de prova e 20.000 sintéticas). O prefixo `xn--` não
 * aparece em nada que não seja isto.
 *
 * ── O DEFEITO ALHEIO QUE NÃO SE COPIA ──────────────────────────────────────
 * A implementação da Equipe Arromba devolve **card vazio a 0,75** para a
 * entrada `xn--` sozinha — o prefixo sem nada depois. Um card em branco no topo
 * da lista é pior que card nenhum: quem lê acha que a bancada resolveu e não
 * mostrou. Aqui a saída tem de ser não vazia e diferente da entrada.
 */
function decodePunycode(input: string): DecodeResult | null {
  const t = input.trim().toLowerCase();
  if (!/^(?:xn--)?[a-z0-9-]+(?:\.[a-z0-9-]+)*$/.test(t) || !t.includes("xn--")) return null;

  const partes = t.split(".").map((p) => {
    if (!p.startsWith("xn--")) return p;
    const decodificado = punydecode(p.slice(4));
    return decodificado ?? p;
  });
  const saida = partes.join(".");
  // Ver o bloco acima: vazio ou igual à entrada não é resposta.
  return saida && saida !== t ? { output: saida, forcedScore: NOTA_LITERAL } : null;
}

/**
 * A NOTA DOS QUATRO — e por que ela não pode vir do `scorePlaintext`.
 *
 * Estes decoders têm assinatura LITERAL, com 100,00% de rejeição medida: quando
 * disparam, dispararam certo. Só que a nota padrão vem da legibilidade da saída,
 * e isso os afunda quando o resultado não é português — medido, `xn--80akhbyknj4f`
 * decodifica para `испытание` e **perdia o topo para o `bifid`**, que é palpite
 * puro sobre a mesma entrada.
 *
 * 0,88: acima de qualquer cifra clássica adivinhada, abaixo de acerto
 * pré-resolvido em base de dados real, que é evidência de outra natureza.
 */
const NOTA_LITERAL = 0.88;

/** RFC 3492, o miolo do Punycode. Sem dependência — são 30 linhas. */
function punydecode(entrada: string): string | null {
  const BASE = 36;
  const TMIN = 1;
  const TMAX = 26;
  const SKEW = 38;
  const DAMP = 700;
  const INICIAL_BIAS = 72;
  const INICIAL_N = 128;

  const corte = entrada.lastIndexOf("-");
  const saida: number[] = [];
  for (const c of corte > 0 ? entrada.slice(0, corte) : "") saida.push(c.codePointAt(0) ?? 0);

  let n = INICIAL_N;
  let i = 0;
  let bias = INICIAL_BIAS;
  let pos = corte > 0 ? corte + 1 : 0;

  const adapta = (delta: number, num: number, primeiro: boolean) => {
    let d = primeiro ? Math.floor(delta / DAMP) : delta >> 1;
    d += Math.floor(d / num);
    let k = 0;
    while (d > ((BASE - TMIN) * TMAX) >> 1) {
      d = Math.floor(d / (BASE - TMIN));
      k += BASE;
    }
    return k + Math.floor(((BASE - TMIN + 1) * d) / (d + SKEW));
  };

  while (pos < entrada.length) {
    const anterior = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (pos >= entrada.length) return null;
      const c = entrada.charCodeAt(pos++);
      const digito = c - 48 < 10 ? c - 22 : c - 97 < 26 ? c - 97 : BASE;
      if (digito >= BASE) return null;
      i += digito * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digito < t) break;
      w *= BASE - t;
    }
    bias = adapta(i - anterior, saida.length + 1, anterior === 0);
    n += Math.floor(i / (saida.length + 1));
    i %= saida.length + 1;
    saida.splice(i++, 0, n);
  }
  return String.fromCodePoint(...saida);
}

/**
 * Quoted-Printable (`=C3=A9`) — o e-mail cru, como sai de um cabeçalho salvo.
 *
 * Rejeição medida: **100,00%** nos dois corpora.
 *
 * ── O DEFEITO ALHEIO QUE NÃO SE COPIA ──────────────────────────────────────
 * A implementação da Equipe Arromba decodifica com `charCodeAt(i) & 0xff`, e
 * isso **corrompe todo não-ASCII que já estava certo** na entrada. Medido:
 * `Blumenau =C3=A9 =C3=B3timo` sai `Blumenau é ótimo` com o defeito, em vez de
 * `Blumenau é ótimo`. Aqui a decodificação é feita sobre BYTES: os `=XX` viram
 * bytes, o resto do texto vira UTF-8, e o `TextDecoder` lê o conjunto.
 */
/** O miolo, que devolve texto — o `mime-word` reusa por dentro. */
function qpTexto(input: string): string | null {
  const t = input.replace(/=\r?\n/g, ""); // quebra suave
  if (!/=[0-9A-Fa-f]{2}/.test(t)) return null;

  const bytes: number[] = [];
  const cru = new TextEncoder();
  for (let i = 0; i < t.length; i++) {
    const m = t.slice(i, i + 3).match(/^=([0-9A-Fa-f]{2})$/);
    if (m) {
      bytes.push(Number.parseInt(m[1], 16));
      i += 2;
      continue;
    }
    // Ver o bloco acima: o resto vai como UTF-8, não como code unit truncado.
    for (const b of cru.encode(t[i])) bytes.push(b);
  }
  try {
    const saida = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    return saida && saida !== input ? saida : null;
  } catch {
    return null;
  }
}

function decodeQuotedPrintable(input: string): DecodeResult | null {
  const t = qpTexto(input);
  return t ? { output: t, forcedScore: NOTA_LITERAL } : null;
}

/**
 * MIME encoded-word (`=?UTF-8?B?…?=`) — o assunto de e-mail codificado.
 *
 * Vem no mesmo papel colado que o Quoted-Printable: as duas formas aparecem
 * juntas num cabeçalho salvo, e separá-las seria entregar meia leitura. O `B`
 * encadeia no Base64 que já existe; o `Q` é Quoted-Printable com `_` valendo
 * espaço, que é a única diferença da RFC 2047.
 */
function decodeMimeWord(input: string): DecodeResult | null {
  const RE = /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g;
  if (!RE.test(input)) return null;
  RE.lastIndex = 0;

  let mudou = false;
  const saida = input.replace(RE, (inteiro, _cs, tipo, dado) => {
    try {
      if (tipo.toUpperCase() === "B") {
        const bin = atob(dado);
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        mudou = true;
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      }
      // No `Q` o sublinhado é espaço — é a única diferença para o QP puro.
      const q = qpTexto(String(dado).replace(/_/g, " "));
      if (q === null) return inteiro;
      mudou = true;
      return q;
    } catch {
      return inteiro;
    }
  });
  return mudou && saida !== input ? { output: saida, forcedScore: NOTA_LITERAL } : null;
}

/**
 * Escapes de código-fonte: `\uXXXX`, `\xNN` e `%uXXXX`.
 *
 * Entra de carona, nunca sozinho — o valor dele é pequeno e a forma é literal.
 * Aparece quando alguém copia uma string de dentro de um JS ou de um log.
 */
function decodeEscapes(input: string): DecodeResult | null {
  if (!/\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}|%u[0-9a-fA-F]{4}/.test(input)) return null;
  const saida = input
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(Number.parseInt(h, 16)))
    .replace(/%u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(Number.parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(Number.parseInt(h, 16)));
  return saida !== input ? { output: saida, forcedScore: NOTA_LITERAL } : null;
}

/** RFC 3492, o lado de ida. Espelha o `punydecode`. */
function punyencode(entrada: string): string | null {
  const BASE = 36;
  const TMIN = 1;
  const TMAX = 26;
  const SKEW = 38;
  const DAMP = 700;
  const INICIAL_BIAS = 72;
  const INICIAL_N = 128;
  const pontos = [...entrada].map((c) => c.codePointAt(0) ?? 0);
  const basicos = pontos.filter((c) => c < INICIAL_N);
  let saida = basicos.map((c) => String.fromCharCode(c)).join("");
  let h = basicos.length;
  const b = h;
  if (h > 0) saida += "-";

  let n = INICIAL_N;
  let delta = 0;
  let bias = INICIAL_BIAS;
  const adapta = (d0: number, num: number, primeiro: boolean) => {
    let d = primeiro ? Math.floor(d0 / DAMP) : d0 >> 1;
    d += Math.floor(d / num);
    let k = 0;
    while (d > ((BASE - TMIN) * TMAX) >> 1) {
      d = Math.floor(d / (BASE - TMIN));
      k += BASE;
    }
    return k + Math.floor(((BASE - TMIN + 1) * d) / (d + SKEW));
  };

  while (h < pontos.length) {
    const m = Math.min(...pontos.filter((c) => c >= n));
    delta += (m - n) * (h + 1);
    n = m;
    for (const c of pontos) {
      if (c < n) delta++;
      if (c !== n) continue;
      let q = delta;
      for (let k = BASE; ; k += BASE) {
        const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
        if (q < t) break;
        const dig = t + ((q - t) % (BASE - t));
        saida += String.fromCharCode(dig < 26 ? dig + 97 : dig + 22);
        q = Math.floor((q - t) / (BASE - t));
      }
      saida += String.fromCharCode(q < 26 ? q + 97 : q + 22);
      bias = adapta(delta, h + 1, h === b);
      delta = 0;
      h++;
    }
    delta++;
    n++;
  }
  return saida;
}

/** Texto → Punycode, rótulo a rótulo. Só marca `xn--` no que de fato mudou. */
function encodePunycode(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const partes = t.split(".").map((p) => {
    // Rótulo já ASCII não vira Punycode — a RFC só codifica o que precisa.
    if (!/[^\u0000-\u007f]/.test(p)) return p;
    const cod = punyencode(p);
    return cod ? `xn--${cod}` : p;
  });
  const saida = partes.join(".");
  return saida !== t ? saida : null;
}

/** Texto → Quoted-Printable. Byte não imprimível ou não-ASCII vira `=XX`. */
function encodeQuotedPrintable(input: string): string | null {
  const bytes = new TextEncoder().encode(input);
  let out = "";
  for (const b of bytes) {
    out +=
      (b >= 33 && b <= 60) || (b >= 62 && b <= 126) || b === 32 || b === 9
        ? String.fromCharCode(b)
        : `=${b.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return out !== input ? out : null;
}

/** Texto → MIME encoded-word na forma B, que é a mais comum em assunto. */
function encodeMimeWord(input: string): string | null {
  if (!input.trim()) return null;
  const bytes = new TextEncoder().encode(input);
  const bin = String.fromCharCode(...bytes);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}

/** Texto → `\uXXXX`. Fora do BMP vira o par substituto, como no JS. */
function encodeEscapes(input: string): string | null {
  if (!input) return null;
  let out = "";
  for (let i = 0; i < input.length; i++) {
    out += `\\u${input.charCodeAt(i).toString(16).padStart(4, "0")}`;
  }
  return out;
}

const single = (
  id: string,
  name: string,
  category: Decoder["category"],
  /**
   * A saída pode ser a string (pontuada pela legibilidade, que é o padrão) ou
   * um objeto com `forcedScore` — o caminho dos codecs de assinatura literal,
   * cuja nota não pode depender de o resultado ser português. Ver `NOTA_LITERAL`.
   */
  fn: (input: string) => DecodeResult,
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
  single("punycode", "Punycode (xn--)", "encoding", decodePunycode, encodePunycode),
  single(
    "quoted-printable",
    "Quoted-Printable",
    "encoding",
    decodeQuotedPrintable,
    encodeQuotedPrintable,
  ),
  single("mime-word", "MIME encoded-word", "encoding", decodeMimeWord, encodeMimeWord),
  single("escapes", "Escapes (\\uXXXX, \\xNN)", "encoding", decodeEscapes, encodeEscapes),
  single("rot47", "ROT47", "transform", rot47, rot47),
  single(
    "reverse",
    "Texto invertido",
    "transform",
    (s) => [...s].reverse().join(""),
    (s) => [...s].reverse().join(""),
  ),
];
