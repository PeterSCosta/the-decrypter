import { parseCepPattern } from "./cep-pattern";
import { type CepHit, type CepsData, toHit } from "./types";

export interface CepSearchResult {
  hits: CepHit[];
  total: number;
  truncated: boolean;
  valid: boolean;
}

/** Scan the in-memory CEP rows for those matching the wildcard pattern. */
export function searchCeps(data: CepsData, pattern: string, limit = 500): CepSearchResult {
  const p = parseCepPattern(pattern);
  if (!p) return { hits: [], total: 0, truncated: false, valid: false };

  const hits: CepHit[] = [];
  let total = 0;
  for (const row of data.rows) {
    if (p.regex.test(row[0])) {
      total++;
      if (hits.length < limit) hits.push(toHit(row, data.municipios));
    }
  }
  return { hits, total, truncated: total > hits.length, valid: true };
}
