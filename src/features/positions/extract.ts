/**
 * Extrai caracteres de um texto por posição (1-based). Dois modos:
 *  - passo fixo: posições N, 2N, 3N … até o fim ("conte de 7 em 7").
 *  - lista: posições específicas, na ordem pedida ("3 7 12").
 *
 * "Apenas letras" numera só as letras (ignora espaços/pontuação ao contar),
 * que é o mais comum em enigmas; desligado, conta todos os caracteres.
 */
export type CountMode = "step" | "list";

export interface Unit {
  char: string;
  /** Índice (em code points) do caractere no texto original — usado p/ destacar. */
  index: number;
}

export interface PositionPick {
  position: number; // 1-based, dentro das unidades contadas
  char: string;
  index: number; // índice no texto original
}

export interface ExtractResult {
  picks: PositionPick[];
  result: string;
  totalUnits: number;
  pickedIndices: Set<number>;
}

const isLetter = (ch: string) => /\p{L}/u.test(ch);

/** Sequência de unidades contáveis, cada uma com seu índice no texto original. */
export function countUnits(text: string, onlyLetters: boolean): Unit[] {
  const out: Unit[] = [];
  [...text].forEach((char, index) => {
    if (!onlyLetters || isLetter(char)) out.push({ char, index });
  });
  return out;
}

/** Posições 1-based geradas por um passo fixo: step, 2·step, 3·step … ≤ total. */
export function stepPositions(step: number, total: number): number[] {
  const s = Math.floor(step);
  if (!Number.isFinite(s) || s < 1) return [];
  const out: number[] = [];
  for (let p = s; p <= total; p += s) out.push(p);
  return out;
}

/** "3, 7, 12" / "3 7 12" → [3, 7, 12] (ignora não-dígitos, descarta < 1). */
export function parsePositions(raw: string): number[] {
  return raw
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => n >= 1);
}

export function extractFromUnits(units: Unit[], positions: number[]): ExtractResult {
  const picks: PositionPick[] = [];
  const pickedIndices = new Set<number>();
  for (const p of positions) {
    const u = units[p - 1];
    if (u) {
      picks.push({ position: p, char: u.char, index: u.index });
      pickedIndices.add(u.index);
    }
  }
  return {
    picks,
    result: picks.map((p) => p.char).join(""),
    totalUnits: units.length,
    pickedIndices,
  };
}

/** Conveniência: monta as unidades e extrai numa chamada só. */
export function extract(text: string, positions: number[], onlyLetters: boolean): ExtractResult {
  return extractFromUnits(countUnits(text, onlyLetters), positions);
}
