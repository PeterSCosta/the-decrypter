/**
 * Braille Grade 1 (letras) — mapa único do projeto.
 *
 * Mora aqui, e não dentro de `engine/codecs.ts`, porque duas frentes precisam
 * dos mesmos pontos: o codec `braille` (texto ⇄ caractere U+28xx) e o inspetor
 * de espaços em branco, que monta a célula fileira a fileira a partir das
 * linhas do texto. Convenção de pontos divergente entre os dois = decodificação
 * silenciosamente errada, e ninguém percebe.
 */
export const BRAILLE_TO_LETTER: Record<string, string> = {
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

/** Inverso, para codificar texto em pontos. */
export const LETTER_TO_BRAILLE: Record<string, string> = Object.fromEntries(
  Object.entries(BRAILLE_TO_LETTER).map(([cell, letter]) => [letter, cell]),
);

/** Início do bloco Braille Patterns; a máscara dos 6 pontos vai nos bits baixos. */
export const BRAILLE_BASE = 0x2800;

/**
 * Bit de cada ponto (1..6) dentro do caractere Unicode. A numeração do Braille é
 * por COLUNA — 1-2-3 descendo à esquerda, 4-5-6 descendo à direita —, e não por
 * fileira. É a fonte de confusão mais comum ao montar a célula a partir de
 * linhas de texto, que chegam fileira a fileira.
 */
const DOT_BIT = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20];

/** Ordem de leitura (fileira a fileira, esquerda→direita) → número do ponto. */
const READING_ORDER = [1, 4, 2, 5, 3, 6];

/**
 * Seis bits em ORDEM DE LEITURA (fileira 1 esquerda, fileira 1 direita, fileira
 * 2 esquerda, …) → a célula Unicode. É a ordem que sai naturalmente de ler um
 * texto de cima para baixo, duas colunas por linha.
 */
export function cellFromRowBits(bits: string): string | null {
  if (!/^[01]{6}$/.test(bits)) return null;
  let mask = 0;
  for (let i = 0; i < 6; i++) {
    if (bits[i] === "1") mask |= DOT_BIT[READING_ORDER[i] - 1];
  }
  return String.fromCodePoint(BRAILLE_BASE + mask);
}

/**
 * Como `cellFromRowBits`, mas já resolvida à letra. `null` quando a célula
 * existe mas não é letra (pontuação, número, sinal composto) — o chamador usa
 * isso para descartar a leitura inteira em vez de emitir "?" no meio da palavra.
 */
export function letterFromRowBits(bits: string): string | null {
  const cell = cellFromRowBits(bits);
  return cell ? (BRAILLE_TO_LETTER[cell] ?? null) : null;
}
