/**
 * Wildcard CEP pattern → matcher.
 *
 * Digits match literally; `x` `X` `*` `_` `?` are single-digit wildcards.
 * Spaces, dots and dashes are ignored ("88010-500" == "88010500").
 *
 *  - 8-char pattern  → anchored positional mask:  "88xxx500" → /^88\d\d\d500$/
 *                                                 "x8300000" → /^\d8300000$/
 *  - shorter pattern → "appears anywhere" substring: "500" matches any CEP
 *    containing 500; "8x5" → /8\d5/.
 *  - >8 chars        → impossible (CEPs are 8 digits) → null.
 */
export interface CepPattern {
  regex: RegExp;
  anchored: boolean;
  length: number;
}

const WILDCARD = /[xX*_?]/;

export function parseCepPattern(raw: string): CepPattern | null {
  const cleaned = raw.replace(/[\s.\-]/g, "");
  if (cleaned.length === 0 || cleaned.length > 8) return null;
  if (!/^[0-9xX*_?]+$/.test(cleaned)) return null;

  let body = "";
  for (const ch of cleaned) body += WILDCARD.test(ch) ? "\\d" : ch;

  const anchored = cleaned.length === 8;
  const regex = new RegExp(anchored ? `^${body}$` : body);
  return { regex, anchored, length: cleaned.length };
}

/** Convenience: does `cep` (8 digits) match the pattern? */
export function cepMatches(cep: string, pattern: string): boolean {
  const p = parseCepPattern(pattern);
  return p ? p.regex.test(cep) : false;
}
