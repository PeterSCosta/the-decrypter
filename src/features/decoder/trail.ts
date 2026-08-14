import type { DecodeCandidate } from "./engine/types";

/**
 * Trilha de passos do encadeamento ("usar como entrada").
 *
 * As provas de gincana são cadeias de 2 a 4 camadas (Base64 → outra cifra;
 * contagem → A1Z26 → índice → CEP → rua). Antes disto, seguir a cadeia era
 * copiar e colar o resultado de um decoder na entrada do próximo.
 */

export interface TrailStep {
  /** O que estava na entrada quando este passo foi empurrado. */
  input: string;
  /** Decoder que produziu o valor encadeado (rótulo da migalha). */
  via: string;
}

/**
 * Teto de passos. A cadeia mais longa do acervo tem 4 camadas; 8 é folga
 * generosa e evita que a barra de migalhas coma a tela no mobile.
 */
export const MAX_TRAIL = 8;

/**
 * O valor encadeável de um candidato.
 *
 * `output` **não** serve como valor para lookups: `local-geocode` emite
 * "Rua X — -26.9, -49.0 (Blumenau)" e `caesar-bruteforce` emite uma tabela de
 * 53 linhas. Por isso: `chainValue` explícito manda; senão, só saída textual
 * encadeia. String vazia em `chainValue` marca "este não encadeia".
 */
export function chainValueOf(c: DecodeCandidate): string | null {
  if (c.chainValue != null) return c.chainValue.trim() || null;
  if (c.render != null && c.render !== "text") return null;
  const v = c.output.trim();
  return v || null;
}

/** Empurra um passo. No-op quando o valor não muda nada ou a trilha encheu. */
export function pushStep(trail: TrailStep[], input: string, via: string): TrailStep[] {
  if (trail.length >= MAX_TRAIL) return trail;
  return [...trail, { input, via }];
}

/** Volta um passo, devolvendo a trilha nova e a entrada a restaurar. */
export function popStep(trail: TrailStep[]): { trail: TrailStep[]; input: string | null } {
  const last = trail[trail.length - 1];
  if (!last) return { trail, input: null };
  return { trail: trail.slice(0, -1), input: last.input };
}

/** Ramifica: volta para o passo `index` (0-based), descartando o que veio depois. */
export function truncateTo(
  trail: TrailStep[],
  index: number,
): {
  trail: TrailStep[];
  input: string | null;
} {
  const step = trail[index];
  if (!step) return { trail, input: null };
  return { trail: trail.slice(0, index), input: step.input };
}
