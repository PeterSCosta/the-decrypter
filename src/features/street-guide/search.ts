import { stripDiacritics } from "@/features/decoder/engine/util";
import type { StreetRow, StreetsData } from "./types";

export type StreetMatchKind = "codigo" | "lei" | "nome" | "data";

export interface StreetMatch {
  row: StreetRow;
  kind: StreetMatchKind;
}

const fold = (s: string) => stripDiacritics(s).toLowerCase().trim();

/**
 * Busca flexível de ruas:
 *  - data (tem "/")    → Data da Lei por trecho (dd/mm/aaaa): "09/02/2004", "02/2004", "/2004"
 *  - número puro       → código, depois Nº da Lei; se for ano (aaaa), também a Data da Lei
 *  - texto             → trecho no nome (e bairro / localização)
 */
export function searchStreets(data: StreetsData, query: string, limit = 200): StreetMatch[] {
  const q = query.trim();
  if (q.length === 0) return [];
  const out: StreetMatch[] = [];

  // Data da Lei (trecho), quando há barra
  if (q.includes("/")) {
    const needle = q.replace(/\s/g, "");
    for (const row of data.rows) {
      if (row.dataLei?.includes(needle)) {
        out.push({ row, kind: "data" });
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  if (/^\d+$/.test(q)) {
    const n = Number(q);
    for (const row of data.rows) if (row.codigo === n) out.push({ row, kind: "codigo" });
    for (const row of data.rows) if (row.numLei === n) out.push({ row, kind: "lei" });
    // ano (aaaa) → também as ruas com Data da Lei naquele ano
    if (/^\d{4}$/.test(q) && n >= 1900 && n <= 2099) {
      for (const row of data.rows)
        if (row.dataLei?.endsWith(`/${q}`)) out.push({ row, kind: "data" });
    }
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
