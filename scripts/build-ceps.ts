/**
 * build-ceps.ts — parse the Santa Catarina CEP export into compact JSON.
 *
 * Input : data-sources/ceps-sc.csv  (BigQuery export; path overridable via $CEP_CSV)
 * Output: seed-data/ceps.json
 *
 * Drops the heavy `estabelecimentos` column (lean v1). Município names are
 * de-duplicated into a lookup array referenced by index to keep the file small.
 * Row tuple: [cep, logradouro, localidade, municipioIdx, lat, lng]
 *
 * Run: pnpm build:ceps   (or  CEP_CSV=/path/to.csv pnpm build:ceps)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fonteAusente } from "./lib/fonte-ausente";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = process.env.CEP_CSV || resolve(ROOT, "data-sources/ceps-sc.csv");
const OUT = resolve(ROOT, "seed-data/ceps.json");

export type CepRow = [
  cep: string,
  logradouro: string,
  localidade: string,
  municipioIdx: number,
  lat: number | null,
  lng: number | null,
];

/** Minimal RFC-4180 CSV parser (handles quoted fields and "" escapes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else if (c === "\r") {
      // ignore; handled by \n
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "POINT(-51.60 -27.36)" → [lat, lng] = [-27.36, -51.60] */
function parsePoint(raw: string): [number | null, number | null] {
  const m = /POINT\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/.exec(raw);
  if (!m) return [null, null];
  const lng = Number.parseFloat(m[1]);
  const lat = Number.parseFloat(m[2]);
  const r = (n: number) => Math.round(n * 1e6) / 1e6;
  return [Number.isFinite(lat) ? r(lat) : null, Number.isFinite(lng) ? r(lng) : null];
}

function main() {
  // A fonte é um export de BigQuery que não é versionado (pesa demais). O
  // artefato É versionado, porque é ele que a API semeia. Numa clonagem limpa
  // este passo pulava a cadeia inteira com ENOENT — agora ele avisa e sai.
  if (
    fonteAusente({
      fonte: SRC,
      saida: OUT,
      passo: "build:ceps",
      comoObter:
        "export de CEPs de SC pela Base dos Dados (BigQuery) para data-sources/ceps-sc.csv, ou CEP_CSV=/caminho/para.csv",
    })
  )
    return;

  const grid = parseCsv(readFileSync(SRC, "utf8"));
  const header = grid.shift();
  if (!header) throw new Error("empty CSV");
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`missing column: ${name}`);
    return i;
  };
  const iCep = col("cep");
  const iLog = col("logradouro");
  const iLoc = col("localidade");
  const iMun = col("nome_municipio");
  const iCen = col("centroide");

  const municipios: string[] = [];
  const munIdx = new Map<string, number>();
  const internMun = (name: string): number => {
    let i = munIdx.get(name);
    if (i === undefined) {
      i = municipios.length;
      municipios.push(name);
      munIdx.set(name, i);
    }
    return i;
  };

  const rows: CepRow[] = [];
  let dropped = 0;
  for (const r of grid) {
    if (r.length <= iCen) continue;
    const cep = (r[iCep] || "").replace(/\D/g, "");
    if (cep.length !== 8) {
      dropped++;
      continue;
    }
    const [lat, lng] = parsePoint(r[iCen] || "");
    rows.push([
      cep,
      (r[iLog] || "").trim(),
      (r[iLoc] || "").trim(),
      internMun((r[iMun] || "").trim()),
      lat,
      lng,
    ]);
  }

  rows.sort((a, b) => a[0].localeCompare(b[0]));

  const payload = {
    source: "Base dos Dados — CEPs de Santa Catarina (sigla_uf=SC)",
    generatedAt: new Date().toISOString().slice(0, 10),
    count: rows.length,
    municipios,
    rows,
  };
  writeFileSync(OUT, JSON.stringify(payload));

  console.log(
    `ceps: wrote ${rows.length} rows, ${municipios.length} municípios (dropped ${dropped} non-8-digit)`,
  );
  console.log(`      wrote ${OUT}`);
}

main();
