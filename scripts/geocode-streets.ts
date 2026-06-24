/**
 * Geocodifica as ruas de Blumenau por JOIN LOCAL com a base de CEPs (sem API).
 * A base de ruas (streets.json) não tem coordenada; a de CEPs (ceps.json) tem
 * lat/lng por logradouro. Casamos `street.nome` ↔ `cep.logradouro` (normalizados,
 * sem acento e sem o prefixo de tipo) e gravamos o CENTROIDE dos CEPs daquela rua
 * em Blumenau. Reexecutável: `pnpm build:streets-geo`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const STREETS = resolve(ROOT, "public/data/streets.json");
const CEPS = resolve(ROOT, "public/data/ceps.json");

type StreetRow = { nome: string; lat?: number; lng?: number; [k: string]: unknown };
type CepRow = [string, string, string, number, number | null, number | null];

function stripAccents(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFD")) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x0300 || c > 0x036f) out += ch; // descarta marcas combinantes
  }
  return out;
}

const TYPE = new Set([
  "rua",
  "r",
  "avenida",
  "av",
  "travessa",
  "tv",
  "trav",
  "rodovia",
  "rod",
  "estrada",
  "estr",
  "alameda",
  "al",
  "praca",
  "pca",
  "servidao",
  "serv",
  "linha",
  "beco",
  "ladeira",
  "caminho",
  "via",
  "largo",
  "passagem",
  "viela",
  "acesso",
  "rotula",
  "rotatoria",
  "passarela",
  "viaduto",
  "ponte",
]);

// Numerais romanos 1–31 e ordinais por extenso → arábico, p/ casar "XV De
// Novembro" ↔ "15 De Novembro" e "Primeiro De Maio" ↔ "1 De Maio".
const ROMAN: Record<string, string> = {};
const R = [
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
  "xi",
  "xii",
  "xiii",
  "xiv",
  "xv",
  "xvi",
  "xvii",
  "xviii",
  "xix",
  "xx",
  "xxi",
  "xxii",
  "xxiii",
  "xxiv",
  "xxv",
  "xxvi",
  "xxvii",
  "xxviii",
  "xxix",
  "xxx",
  "xxxi",
];
R.forEach((r, i) => {
  ROMAN[r] = String(i + 1);
});
const ORDINAL: Record<string, string> = {
  primeiro: "1",
  primeira: "1",
  segundo: "2",
  segunda: "2",
  terceiro: "3",
  terceira: "3",
  quarto: "4",
  quinto: "5",
  sexto: "6",
  setimo: "7",
  oitavo: "8",
  nono: "9",
  decimo: "10",
};
const numToken = (t: string) => ROMAN[t] ?? ORDINAL[t] ?? t;

/** Normaliza um nome de via: sem acento, minúsculo, sem o token de tipo inicial. */
function norm(raw: string, stripType: boolean): string {
  let s = stripAccents(raw).toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  if (stripType) {
    const [first, ...rest] = s.split(" ");
    if (rest.length && TYPE.has(first)) s = rest.join(" ");
  }
  return s.split(" ").map(numToken).join(" ");
}

const streets = JSON.parse(readFileSync(STREETS, "utf8")) as {
  rows: StreetRow[];
  [k: string]: unknown;
};
const ceps = JSON.parse(readFileSync(CEPS, "utf8")) as {
  municipios: string[];
  rows: CepRow[];
};

const bluIdx = ceps.municipios.indexOf("Blumenau");
if (bluIdx < 0) throw new Error("Blumenau não encontrado em ceps.municipios");

// nome-de-rua normalizado → acumulador de centroide
const byName = new Map<string, { lat: number; lng: number; n: number }>();
for (const r of ceps.rows) {
  if (r[3] !== bluIdx || r[4] == null || r[5] == null) continue;
  const key = norm(r[1], true);
  if (!key) continue;
  const acc = byName.get(key);
  if (acc) {
    acc.lat += r[4];
    acc.lng += r[5];
    acc.n += 1;
  } else {
    byName.set(key, { lat: r[4], lng: r[5], n: 1 });
  }
}

let matched = 0;
const unmatched: string[] = [];
for (const row of streets.rows) {
  const acc = byName.get(norm(row.nome, false));
  if (acc) {
    row.lat = Math.round((acc.lat / acc.n) * 1e6) / 1e6;
    row.lng = Math.round((acc.lng / acc.n) * 1e6) / 1e6;
    matched += 1;
  } else {
    row.lat = undefined;
    row.lng = undefined;
    if (unmatched.length < 20) unmatched.push(row.nome);
  }
}

streets.geocoded = matched;
streets.geocodedAt = new Date().toISOString();
writeFileSync(STREETS, `${JSON.stringify(streets)}\n`);

const pct = ((matched / streets.rows.length) * 100).toFixed(1);
console.log(`Ruas geocodificadas: ${matched}/${streets.rows.length} (${pct}%)`);
console.log(`Logradouros únicos em Blumenau: ${byName.size}`);
console.log("Amostra sem casamento:", unmatched.slice(0, 12).join(" | "));
