/**
 * Extrai "mensagens escondidas" de um texto pelas técnicas da coluna TEXTO do
 * gabarito da Equipe Arromba: primeiras/últimas letras de linhas e palavras,
 * maiúsculas, letras após pontuação, espelhamento, leitura em coluna/diagonal,
 * letras/palavras repetidas e contagens. Tudo são funções puras (testáveis).
 */
const RE_LETTER = /\p{L}/u;
const isLetter = (ch: string) => RE_LETTER.test(ch);
const lettersOf = (s: string): string[] => s.match(/\p{L}/gu) ?? [];

/** Linhas não vazias (trimadas). */
export const splitLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/** Palavras (separadas por espaço). */
export const splitWords = (text: string): string[] =>
  text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

const firstLetter = (s: string): string => lettersOf(s)[0] ?? "";
const lastLetter = (s: string): string => {
  const l = lettersOf(s);
  return l[l.length - 1] ?? "";
};

export const firstOfLines = (text: string): string => splitLines(text).map(firstLetter).join("");
export const lastOfLines = (text: string): string => splitLines(text).map(lastLetter).join("");
export const firstOfWords = (text: string): string => splitWords(text).map(firstLetter).join("");
export const lastOfWords = (text: string): string => splitWords(text).map(lastLetter).join("");

/** Todas as maiúsculas, na ordem (mensagem escondida em caps). */
export const capitals = (text: string): string => (text.match(/\p{Lu}/gu) ?? []).join("");

/** Primeira letra depois de cada `. , ; : ! ?`. */
export function afterPunctuation(text: string): string {
  const chars = [...text];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    if (!/[.,;:!?]/.test(chars[i])) continue;
    let j = i + 1;
    while (j < chars.length && /\s/.test(chars[j])) j++;
    if (j < chars.length && isLetter(chars[j])) out += chars[j];
  }
  return out;
}

/** Texto todo de trás pra frente. */
export const reversedAll = (text: string): string => [...text].reverse().join("");
/** Cada palavra espelhada, mantendo a ordem das palavras. */
export const reversedWords = (text: string): string =>
  text.replace(/\p{L}+/gu, (w) => [...w].reverse().join(""));

/** Leitura em coluna (de cima pra baixo, coluna a coluna) das linhas. */
export function columnRead(text: string): string {
  const ls = splitLines(text);
  if (ls.length < 2) return "";
  const max = Math.max(...ls.map((l) => l.length));
  let out = "";
  for (let c = 0; c < max; c++) {
    for (const l of ls) {
      const ch = l[c];
      if (ch?.trim()) out += ch;
    }
  }
  return out;
}

/** Diagonal principal: caractere i da linha i. */
export function diagonalRead(text: string): string {
  const ls = splitLines(text);
  let out = "";
  for (let i = 0; i < ls.length; i++) {
    const ch = ls[i][i];
    if (ch?.trim()) out += ch;
  }
  return out;
}

/** Palavras que se repetem, com a contagem ("casa (2) · sol (3)"). */
export function repeatedWords(text: string): string {
  const counts = new Map<string, number>();
  for (const w of splitWords(text)) {
    const k = lettersOf(w.toLowerCase()).join("");
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([w, n]) => `${w} (${n})`)
    .join(" · ");
}

export interface TextStats {
  letters: number;
  words: number;
  sentences: number;
  lines: number;
}

export function textStats(text: string): TextStats {
  return {
    letters: lettersOf(text).length,
    words: splitWords(text).length,
    sentences: text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean).length,
    lines: splitLines(text).length,
  };
}

export interface Extraction {
  id: string;
  label: string;
  value: string;
}

/** Todas as extrações da coluna TEXTO, em ordem de utilidade. */
export function extractText(text: string): Extraction[] {
  return [
    { id: "first-lines", label: "1ª letra de cada linha", value: firstOfLines(text) },
    { id: "last-lines", label: "última letra de cada linha", value: lastOfLines(text) },
    { id: "first-words", label: "1ª letra de cada palavra", value: firstOfWords(text) },
    { id: "last-words", label: "última letra de cada palavra", value: lastOfWords(text) },
    { id: "capitals", label: "maiúsculas (na ordem)", value: capitals(text) },
    { id: "after-punct", label: "letra após pontuação", value: afterPunctuation(text) },
    { id: "column", label: "leitura em coluna", value: columnRead(text) },
    { id: "diagonal", label: "diagonal principal", value: diagonalRead(text) },
    { id: "reversed", label: "texto espelhado", value: reversedAll(text) },
    { id: "reversed-words", label: "palavras espelhadas", value: reversedWords(text) },
    { id: "repeated", label: "palavras repetidas", value: repeatedWords(text) },
  ];
}
