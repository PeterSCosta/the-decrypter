import { stripDiacritics } from "@/features/decoder/engine/util";
import type { StreetRow, StreetsData } from "./types";

export type StreetMatchKind = "codigo" | "lei" | "nome";

export interface StreetMatch {
  row: StreetRow;
  kind: StreetMatchKind;
}

const fold = (s: string) => stripDiacritics(s).toLowerCase().trim();

/**
 * Flexible street search:
 *  - pure number → exact código match first, then Nº da Lei matches
 *  - text        → substring match on name (and bairro / localização)
 */
export function searchStreets(data: StreetsData, query: string, limit = 200): StreetMatch[] {
  const q = query.trim();
  if (q.length === 0) return [];

  const out: StreetMatch[] = [];

  if (/^\d+$/.test(q)) {
    const n = Number(q);
    for (const row of data.rows) if (row.codigo === n) out.push({ row, kind: "codigo" });
    for (const row of data.rows) if (row.numLei === n) out.push({ row, kind: "lei" });
    return out.slice(0, limit);
  }

  const fq = fold(q);
  for (const row of data.rows) {
    if (
      fold(row.nome).includes(fq) ||
      fold(row.bairro).includes(fq) ||
      fold(row.localizacao).includes(fq)
    ) {
      out.push({ row, kind: "nome" });
      if (out.length >= limit) break;
    }
  }
  return out;
}
