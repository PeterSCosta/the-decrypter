import { type Unit, countUnits } from "./extract";

/**
 * ZIP de listas paralelas: N fontes × 1 índice cada. É a forma real da mecânica
 * "letra por posição indexada" — 13 das 15 provas do acervo indexam UMA letra em
 * CADA fonte (6 imperadores, 13 candidatos, 12 cores), enquanto `extract.ts` só
 * sabe fazer 1 texto × N posições.
 *
 * REGRA INEGOCIÁVEL, conferida em quatro provas independentes (E Agora, CRJA,
 * Sinfonia Silenciosa, Faber-Castell): a contagem ignora espaços e pontuação e o
 * acentuado vale UM caractere. "Capitão Caverna"[10] só dá V se o "ã" ocupar a
 * 6ª casa — por isso `\p{L}` (via `countUnits`) e jamais `stripDiacritics`.
 */

export interface ZipPick {
  /** A fonte de onde a letra saiu, como veio (para rotular a linha na tela). */
  source: string;
  /** Índice 1-based pedido, já em valor absoluto. */
  position: number;
  fromEnd: boolean;
  /** "" quando o índice cai fora da fonte. */
  char: string;
  /** Índice no texto da fonte (para destacar); -1 quando não há letra. */
  index: number;
}

export interface ZipResult {
  picks: ZipPick[];
  result: string;
  /** Quantos índices pedidos caíram fora — o sinal de que a leitura está errada. */
  misses: number;
}

/** Um índice pedido pela chave; `source` só existe no par A{n}L{m} / 33.9. */
export interface IndexSpec {
  position: number;
  fromEnd: boolean;
  /** 1-based, quando a chave diz de QUAL fonte tirar a letra. */
  source?: number;
}

function pickAt(units: Unit[], k: number, fromEnd: boolean): Unit | null {
  // Índice negativo é o mesmo pedido que `fromEnd`: "a 5ª de trás pra frente".
  const back = fromEnd || k < 0;
  const n = Math.abs(Math.trunc(k));
  if (!Number.isFinite(n) || n < 1) return null;
  return (back ? units[units.length - n] : units[n - 1]) ?? null;
}

function pick(source: string, k: number, fromEnd: boolean, onlyLetters: boolean): ZipPick {
  const u = pickAt(countUnits(source, onlyLetters), k, fromEnd);
  return {
    source,
    position: Math.abs(Math.trunc(k)),
    fromEnd: fromEnd || k < 0,
    char: u?.char ?? "",
    index: u?.index ?? -1,
  };
}

function collect(picks: ZipPick[]): ZipResult {
  return {
    picks,
    result: picks.map((p) => p.char).join(""),
    misses: picks.filter((p) => p.char === "").length,
  };
}

/** A k-ésima letra de uma fonte ("" se não existe); `fromEnd` conta do fim. */
export function letterAt(source: string, k: number, fromEnd = false, onlyLetters = true): string {
  return pick(source, k, fromEnd, onlyLetters).char;
}

/**
 * Listas paralelas: a i-ésima fonte com o i-ésimo índice.
 * 6 imperadores × [1,5,2,4,4,3] → LOUROS. Sobra de um dos lados é descartada.
 */
export function zipIndex(sources: string[], positions: number[], onlyLetters = true): ZipResult {
  const n = Math.min(sources.length, positions.length);
  const picks: ZipPick[] = [];
  for (let i = 0; i < n; i++) picks.push(pick(sources[i], positions[i], false, onlyLetters));
  return collect(picks);
}

/** O MESMO índice em todas as fontes ("a 5ª letra de cada título, do fim"). */
export function constIndex(
  sources: string[],
  k: number,
  fromEnd = false,
  onlyLetters = true,
): ZipResult {
  return collect(sources.map((s) => pick(s, k, fromEnd, onlyLetters)));
}

/**
 * Pares fonte→letra: `A3L6` (artigo 3, letra 6) e `33.9` (atração 33, letra 9).
 * Aqui a ordem das fontes não acompanha a dos índices — a chave escolhe a fonte.
 */
export function pairIndex(sources: string[], specs: IndexSpec[], onlyLetters = true): ZipResult {
  return collect(
    specs.map((s) => {
      const src = sources[(s.source ?? 0) - 1];
      return src === undefined
        ? { source: "", position: s.position, fromEnd: s.fromEnd, char: "", index: -1 }
        : pick(src, s.position, s.fromEnd, onlyLetters);
    }),
  );
}

const ROMAN: [string, number][] = [
  ["M", 1000],
  ["CM", 900],
  ["D", 500],
  ["CD", 400],
  ["C", 100],
  ["XC", 90],
  ["L", 50],
  ["XL", 40],
  ["X", 10],
  ["IX", 9],
  ["V", 5],
  ["IV", 4],
  ["I", 1],
];

function intToRoman(n: number): string {
  let r = "";
  let x = n;
  for (const [s, v] of ROMAN) {
    while (x >= v) {
      r += s;
      x -= v;
    }
  }
  return r;
}

/** Romano canônico → número; null p/ qualquer outra coisa (rejeita "IIII", "MIL"). */
export function romanValue(s: string): number | null {
  const up = s.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(up)) return null;
  let n = 0;
  let i = 0;
  for (const [sym, v] of ROMAN) {
    while (up.startsWith(sym, i)) {
      n += v;
      i += sym.length;
    }
  }
  return i === up.length && intToRoman(n) === up ? n : null;
}

const PAIR = /^[A-Za-z]?(\d+)[A-Za-z](\d+)$/; // A3L6, P2L5
const DOTTED = /^(\d+)\.(\d+)$/; // 33.9 (mapa da Oktoberfest)

function parseToken(raw: string): IndexSpec | null {
  const pair = PAIR.exec(raw) ?? DOTTED.exec(raw);
  if (pair) return { source: Number(pair[1]), position: Number(pair[2]), fromEnd: false };
  if (/^-?\d+$/.test(raw)) {
    const n = Number(raw);
    if (n === 0) return null;
    return { position: Math.abs(n), fromEnd: n < 0 };
  }
  const roman = romanValue(raw);
  return roman === null ? null : { position: roman, fromEnd: false };
}

/**
 * Lê a chave de índices: "1 5 2 4 4 3", "I V II IV IV III", "-5", "A3L6 A35L31".
 * Devolve **null** se qualquer pedaço não for um índice — é esse tudo-ou-nada
 * que serve de porta de entrada do decoder (chave de Vigenère não passa).
 */
export function parseIndexSpecs(raw: string): IndexSpec[] | null {
  const tokens = raw.split(/[\s,;|/]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const specs: IndexSpec[] = [];
  for (const t of tokens) {
    const spec = parseToken(t);
    if (!spec) return null;
    specs.push(spec);
  }
  return specs;
}
