/**
 * build-airports.ts — gera a base de aeroportos (códigos IATA + ICAO → nome,
 * cidade, país e coordenada) a partir do OpenFlights (domínio aberto/ODbL).
 *
 * Saída: public/data/airports.json
 * Run: pnpm build:airports
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public/data/airports.json");

/** Parser simples de uma linha CSV com campos entre aspas (formato OpenFlights). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const clean = (v: string) => (v === "\\N" || v === "" ? "" : v);

async function main() {
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`OpenFlights HTTP ${res.status}`);
  const text = await res.text();

  // [iata, icao, nome, cidade, país, lat, lng]
  const rows: [string, string, string, string, string, number, number][] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const f = parseCsvLine(line);
    // OpenFlights: 0=id 1=nome 2=cidade 3=país 4=IATA 5=ICAO 6=lat 7=lng
    const iata = clean(f[4]).toUpperCase();
    const icao = clean(f[5]).toUpperCase();
    const validIata = /^[A-Z]{3}$/.test(iata) ? iata : "";
    const validIcao = /^[A-Z]{4}$/.test(icao) ? icao : "";
    if (!validIata && !validIcao) continue;
    const lat = Number(f[6]);
    const lng = Number(f[7]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    rows.push([
      validIata,
      validIcao,
      clean(f[1]),
      clean(f[2]),
      clean(f[3]),
      Math.round(lat * 1e5) / 1e5,
      Math.round(lng * 1e5) / 1e5,
    ]);
  }
  rows.sort((a, b) => (a[0] || a[1]).localeCompare(b[0] || b[1]));

  const payload = {
    source: "OpenFlights (openflights.org) — airports.dat",
    generatedAt: new Date().toISOString().slice(0, 10),
    count: rows.length,
    rows,
  };
  writeFileSync(OUT, JSON.stringify(payload));
  const iataN = rows.filter((r) => r[0]).length;
  const icaoN = rows.filter((r) => r[1]).length;
  console.log(`airports: ${rows.length} (IATA ${iataN} · ICAO ${icaoN}) → ${OUT}`);
}

main();
