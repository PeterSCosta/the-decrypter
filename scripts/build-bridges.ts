/**
 * build-bridges.ts — every named bridge, footbridge and overpass in Blumenau.
 *
 * Two independent sources, joined by name:
 *
 *   data-sources/pontes-leis.json  — the naming laws (Câmara Municipal, 1950→).
 *                                    Canonical for the NAME, the date and the
 *                                    described location.
 *   data-sources/pontes-osm.json   — OSM ways tagged `bridge` / `man_made=bridge`.
 *                                    Canonical for GEOMETRY: where it is, how
 *                                    long, which street runs over it.
 *
 * Neither covers the other: the laws name ~50 bridges OSM never mapped, and OSM
 * maps bridges (Rodovel, Rosental, the Mafisa overpass) that no law we found
 * names. So a row can come from either side, and `fonte` says which.
 *
 * Two more inputs are used only for spatial enrichment:
 *   data-sources/pontes-hidrografia.json — named waterways → what it crosses
 *   data-sources/bairros-blumenau.geojson — bairro polygons → which bairro
 *
 * Output: public/data/bridges.json
 * Run: pnpm build:bridges
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BridgeRow, BridgesData } from "../src/features/bridge/types";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC_LEIS = resolve(ROOT, "data-sources/pontes-leis.json");
const SRC_OSM = resolve(ROOT, "data-sources/pontes-osm.json");
const SRC_AGUA = resolve(ROOT, "data-sources/pontes-hidrografia.json");
const SRC_BAIRROS = resolve(ROOT, "data-sources/bairros-blumenau.geojson");
const OUT = resolve(ROOT, "public/data/bridges.json");

// ── input shapes ────────────────────────────────────────────────────────────

interface LeiRaw {
  lei: string; // "8492/2017"
  num: number;
  ano: number;
  data: string | null; // dd/mm/aaaa
  ementa: string;
  texto: string; // "" when the portal publishes only the ementa
  url: string;
}
type LatLng = [number, number];
interface OsmWay {
  id: number;
  tags: Record<string, string>;
  geometry: LatLng[];
}
interface AguaWay {
  name: string;
  waterway: string;
  geometry: LatLng[];
}
interface BairroFeature {
  properties: { bairro: string; codigo: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
}

// ── text helpers ────────────────────────────────────────────────────────────

/** Uppercase, unaccented, punctuation-free — the key every name match uses. */
/** Marcas combinantes (acentos) — mesmo idioma de `features/diff`. */
const COMBINING = /\p{M}/gu;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(COMBINING, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Same folding as `norm`, but **character by character**, so the result has the
 * same length as the input and an index found in it points at the same place in
 * the original. Used to locate a name inside a law's text: plain `norm` shifts
 * every index past the first accent, and "Ávila" then lands nowhere.
 */
function normKeepLen(s: string): string {
  return [...s]
    .map((c) => {
      const d = c.normalize("NFD").replace(COMBINING, "");
      return (d || c).charAt(0).toUpperCase();
    })
    .join("");
}

/** Words that carry no identity: they must not decide a match. */
const STOP = new Set([
  "PONTE",
  "PONTES",
  "PASSARELA",
  "VIADUTO",
  "PONTILHAO",
  "DE",
  "DA",
  "DO",
  "DOS",
  "DAS",
  "E",
  "A",
  "O",
  "GOVERNADOR",
  "ENGENHEIRO",
  "DESEMBARGADOR",
  "JORNALISTA",
  "PROFESSOR",
  "PROF",
  "MAESTRO",
  "INTENDENTE",
  "VEREADOR",
  "DEPUTADO",
  "MINISTRO",
  "DOUTOR",
  "DR",
  "IRMAO",
  "SENIOR",
  "FILHO",
  "JUNIOR",
]);

function tokens(name: string): string[] {
  return norm(name)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/**
 * OSM spells three of these differently from the law that created them. The law
 * wins (it is the name), but the match has to survive the divergence — without
 * it these three rows would split in two, each half missing the other's data.
 *
 * Deliberately NOT aliased: Kratz/Kretz. "Henrique Kratz" (lei 3900/1991, over
 * the Ribeirão do Cego in the Velha) and "Henrique Kretz" (lei 9319/2023, over
 * the Rio Testo in Badenfurt) are two different bridges.
 */
const SPELLING: Record<string, string> = {
  VICTORINO: "VITORINO", // lei 4644/1996 vs OSM
  EMILLIO: "EMILIO", // OSM doubles the L
  KLOCH: "KLOCK", // OSM writes -ch, lei 8638/2018 writes -ck
};
const fold = (t: string[]) => t.map((w) => SPELLING[w] ?? w);

// ── 1. laws → denominations ─────────────────────────────────────────────────

interface Denominacao {
  nome: string;
  trecho: string; // the sentence this name came from — location is read from it
  tipo: BridgeRow["tipo"];
  apelidos: string[];
}

/**
 * Lei 9237/2022 revokes lei 8439/2017. The bridge exists and the law that named
 * it exists, so the row stays — with the revocation on it, which is the whole
 * point of keeping it.
 */
const REVOGADAS: Record<string, string> = {
  "8439/2017": "denominação revogada pela Lei 9237/2022",
};

/** Laws that name nothing — they only act on another law. */
const NAO_DENOMINAM = new Set(["9237/2022"]);

/**
 * Things the record states but cannot prove. Lei 800/1957's ementa describes the
 * Adolfo Konder exactly ("a ponte sobre o Rio Itajaí-Açu que liga o Centro ao
 * bairro da Ponta Aguda") but the portal never published its text, so the name
 * is nowhere in the source. Asserting the link would be inventing it.
 */
const NOTAS: Record<string, string> = {
  "PONTE GOVERNADOR ADOLFO KONDER":
    "Sem lei confirmada. A Lei 800/1957 dá nome à ponte sobre o Rio Itajaí-Açu que liga o Centro à Ponta Aguda — quase certamente esta —, mas o portal da Câmara publica apenas a ementa, que não diz o nome.",
};

/**
 * Laws whose prose the patterns below cannot split. Three shapes, all real:
 * a law that names six bridges in numbered incisos, one that names two in
 * alíneas, and one the portal publishes without its text (only the ementa,
 * which describes the bridge but never says the name).
 */
const OVERRIDES: Record<string, string[]> = {
  "8492/2017": [
    "Ponte Ministro Lauro Muller",
    "Ponte Engenheiro Udo Deeke",
    "Ponte Governador Jorge Lacerda",
    "Ponte 25 de Julho",
    "Ponte Governador Irineu Bornhausen",
    "Ponte Jornalista Luiz Antonio Soares",
  ],
  "2520/1979": ["Ponte Irmão Berardus Thier", "Ponte Ludwig Greve"],
  // Ementa: "dá denominação à ponte sobre o Rio Itajaí-Açu (que liga o Centro
  // da cidade ao bairro da Ponta Aguda)" — that is the Adolfo Konder, but the
  // published record never states the name, so it stays out. See `semLei`.
  "800/1957": [],
};

/**
 * The apelido, straight from the law. Lei 8492/2017 is the only one drafted this
 * way — and it hands over six of them ("conhecida como 'Ponte do Salto'"), which
 * is exactly the formal-name ↔ popular-name pair no other source carries.
 */
const RE_APELIDO = /conhecid[ao]\s+como\s+["“']([^"”']+)["”']/gi;

/** `"X"` / `“X”` / `(PONTE X)` / bare run of Capitalised words after DENOMINA(DA). */
const PATTERNS: RegExp[] = [
  // É denominada "X" a ponte…  |  Fica denominada de “X”, a ponte…
  /denominad[ao]s?\s+(?:de\s+)?["“']([^"”']+)["”']/gi,
  // DENOMINA DE “X”, PONTE…  |  DENOMINA “X” A PONTE…
  /denomina\s+(?:de\s+)?["“']([^"”']+)["”']/gi,
  // Denominar-se-á "X"
  /denominar-se-[áa]\s+["“']([^"”']+)["”']/gi,
  // …(PONTE X) / (DE FRIDA ROSEMANN) — the parenthetical the old ementas use
  /\(\s*(?:de\s+)?((?:ponte\s+)?[^()]{4,60}?)\s*\)/gi,
  // DENOMINA [DE] X[,] PONTE LOCALIZADA…  — the comma is optional (4706/1996
  // writes "DENOMINA DE EMMA HEMMER PONTE EDIFICADA…") and so is the "DE"
  // (4644/1996 writes "DENOMINA ENGENHEIRO ANTÔNIO VICTORINO ÁVILA FILHO PONTE").
  /denomina\s+(?:de\s+)?([A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ][A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ .]{4,60}?)\s*,?\s*(?:a\s+)?(?:ponte|passarela|viaduto|complexo)/gi,
  // É denominada X a ponte… (unquoted, older drafting)
  /denominad[ao]\s+([A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ][A-Za-zÁÂÃÀÉÊÍÓÔÕÚÜÇáâãàéêíóôõúüç .]{4,60}?)\s+(?:a|à)\s+ponte/gi,
];

/** Junk a capture is never allowed to be. */
const NOT_A_NAME =
  /^(que|de|da|do|dos|das|a|o|ponte|pontes|passarela|viaduto|objeto|denominacoes|art|ligando)$/i;

function titleCase(s: string): string {
  const lower = new Set(["de", "da", "do", "dos", "das", "e"]);
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && lower.has(w)
        ? w
        : // "itajaí-açu" is two words for capitalisation purposes.
          w.replace(/(^|-)([a-zà-ÿ])/g, (_, sep, ch: string) => sep + ch.toUpperCase()),
    )
    .join(" ")
    .trim();
}

/**
 * The ementas are ALL CAPS and the drafting is loose ("rio Itajaí - Açú", "sobre
 * a foz do Ribeirão da Velha e que liga…"). Trim the conjunction the regex drags
 * along and close the spaces around the hyphen before title-casing.
 */
function limpaCurso(raw: string): string {
  return titleCase(
    raw
      .replace(/\s*-\s*/g, "-")
      .replace(/\s+(e|que|na|no|ligando|entre)$/i, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/**
 * The ementa of the older records ends with the portal's own indexing tail
 * ("Objeto: DENOMINAÇÕES"). Left in, it leaks into the bairro capture.
 */
const corpoDaLei = (lei: LeiRaw) =>
  (lei.texto || lei.ementa).replace(/\s*Objeto:\s*DENOMINA[ÇC][ÕO]ES\.?\s*$/i, "").trim();

/** ponte / passarela / viaduto — read off the law's own wording. */
function tipoDaLei(texto: string): BridgeRow["tipo"] {
  if (/passarela/i.test(texto)) return "passarela";
  if (/viaduto/i.test(texto)) return "viaduto";
  if (/pontilh[ãa]o/i.test(texto)) return "pontilhão";
  return "ponte";
}

function denominacoes(lei: LeiRaw): Denominacao[] {
  if (NAO_DENOMINAM.has(lei.lei)) return [];
  const corpo = corpoDaLei(lei);
  const tipo = tipoDaLei(corpo);

  const over = OVERRIDES[lei.lei];
  if (over)
    return over.map((nome) => {
      // Each inciso carries its own apelido; read it from that inciso only, or
      // the Lauro Muller would collect all six.
      const i = normKeepLen(corpo).indexOf(norm(nome).replace(/^PONTE /, ""));
      const inciso = i >= 0 ? corpo.slice(i, i + 220) : "";
      return {
        nome,
        trecho: corpo,
        tipo,
        apelidos: [...inciso.matchAll(RE_APELIDO)].map((a) => a[1].trim()),
      };
    });

  const found: Denominacao[] = [];
  const seen = new Set<string>();

  for (const re of PATTERNS) {
    re.lastIndex = 0;
    for (const m of corpo.matchAll(re)) {
      let raw = m[1].replace(/\s+/g, " ").trim();
      raw = raw.replace(/^(ponte|passarela|viaduto|complexo vi[áa]rio d[ao])\s+/i, "");
      if (raw.length < 4 || NOT_A_NAME.test(raw)) continue;
      // A capture with a verb in it is a clause, not a name.
      if (/\b(localizad|construíd|construid|edificad|sobre|ligand|situad|no bairro)\b/i.test(raw))
        continue;
      const key = norm(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      found.push({
        nome: `${TIPO_PREFIXO[tipo]} ${titleCase(raw)}`,
        trecho: corpo,
        tipo,
        apelidos: [...corpo.matchAll(RE_APELIDO)].map((a) => a[1].trim()),
      });
    }
    if (found.length) break; // first pattern that produces anything wins
  }
  return found;
}

const TIPO_PREFIXO: Record<BridgeRow["tipo"], string> = {
  ponte: "Ponte",
  passarela: "Passarela",
  viaduto: "Viaduto",
  pontilhão: "Pontilhão",
};

// "sobre o rio Itajaí-Açu", "sobre a foz do Ribeirão da Velha", "do Ribeirão
// Garcia" — the article after `sobre` is the part that kept biting.
const RE_AGUA =
  /\b(?:sobre|d[oa])\s+(?:[oa]\s+)?(?:foz\s+d[oa]\s+)?((?:rio|ribeir[ãa]o|c[óo]rrego)\s+(?:d[aeo]s?\s+)?[A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ][\wÁÂÃÀÉÊÍÓÔÕÚÜÇáâãàéêíóôõúüç-]*(?:\s+[A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ][\wÁÂÃÀÉÊÍÓÔÕÚÜÇáâãàéêíóôõúüç-]*)?)/i;
const RE_BAIRRO =
  /\b(?:no bairro|nos bairros|do bairro|dos bairros|na localidade de|no distrito d[ao]|entre os bairros|na divisa dos bairros)\s+([^.,;]{3,70})/gi;
const RE_RUA =
  /\b((?:rua|avenida|estrada|rodovia|alameda|travessa)\s+[A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ][\wÁÂÃÀÉÊÍÓÔÕÚÜÇáâãàéêíóôõúüç.]*(?:\s+(?:d[aeo]s?\s+)?[A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ][\wÁÂÃÀÉÊÍÓÔÕÚÜÇáâãàéêíóôõúüç.]*){0,3})/gi;

function limpaBairros(raw: string): string[] {
  return raw
    .split(/\s+e\s+|\s*,\s*/)
    .map((s) =>
      titleCase(
        s
          .replace(/\b(mesmo nome|nesta cidade|neste munic[íi]pio|distrito de|localizada?)\b/gi, "")
          .replace(/^\s*d[aeo]s?\s+/i, "") // "do Garcia" → "Garcia"
          .trim(),
      ),
    )
    .filter((s) => s.length > 2 && s.length < 40);
}

function situacao(texto: string): string | null {
  if (/\bem constru[çc][ãa]o\b/i.test(texto)) return "em construção";
  if (/\ba ser constru[íi]da\b|\bprojetada\b/i.test(texto)) return "projetada";
  return null;
}

// ── 2. OSM ways → grouped bridges ───────────────────────────────────────────

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function comprimento(geom: LatLng[]): number {
  let m = 0;
  for (let i = 1; i < geom.length; i++) m += haversine(geom[i - 1], geom[i]);
  return m;
}

interface OsmBridge {
  nome: string;
  apelidos: string[];
  ids: number[];
  geoms: LatLng[][];
  tags: Record<string, string>[];
}

/**
 * A bridge is one OSM *name*, not one way: the dual carriageway of the
 * Kleinübing is four ways, the Ponte dos Arcos three. `bridge:name` is the
 * bridge's own name; `name` is the street running over it — which is only the
 * bridge's name when it starts with Ponte/Passarela/Viaduto.
 */
function agrupaOsm(ways: OsmWay[]): OsmBridge[] {
  const by = new Map<string, OsmBridge>();
  const proprio = /^(ponte|passarela|viaduto|pontilh[ãa]o)\b/i;

  for (const w of ways) {
    const nomes: string[] = [];
    if (w.tags["bridge:name"]) nomes.push(w.tags["bridge:name"]);
    if (w.tags.name && proprio.test(w.tags.name)) nomes.push(w.tags.name);
    for (const nome of nomes) {
      const k = norm(nome);
      let b = by.get(k);
      if (!b) {
        b = { nome, apelidos: [], ids: [], geoms: [], tags: [] };
        by.set(k, b);
      }
      b.ids.push(w.id);
      if (w.geometry.length > 1) b.geoms.push(w.geometry);
      b.tags.push(w.tags);
      // The street name is an apelido only when it is itself bridge-shaped
      // ("Ponte de Ferro" over bridge:name "Ponte Aldo Pereira de Andrade").
      if (w.tags.name && w.tags.name !== nome && proprio.test(w.tags.name))
        b.apelidos.push(w.tags.name);
    }
  }

  // "Ponte de Ferro" exists both as its own group (from `name`) and as an
  // apelido of the Aldo Pereira de Andrade. Drop the duplicate group.
  const apelidos = new Set<string>();
  for (const b of by.values()) for (const a of b.apelidos) apelidos.add(norm(a));
  for (const [k] of by) if (apelidos.has(k)) by.delete(k);

  return [...by.values()];
}

// ── 3. spatial joins ────────────────────────────────────────────────────────

/** Do segments p1→p2 and p3→p4 cross? Plain orientation test, lat/lng as a plane. */
function cruza(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng): boolean {
  const d = (a: LatLng, b: LatLng, c: LatLng) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return (d1 > 0 !== d2 > 0 || d1 === 0 || d2 === 0) && (d3 > 0 !== d4 > 0 || d3 === 0 || d4 === 0);
}

function transposicoes(geoms: LatLng[][], aguas: AguaWay[]): string[] {
  const hit = new Set<string>();
  // A bridge is tens of metres long; only test waterways whose bbox is near it.
  for (const g of geoms) {
    const lat = g.map((p) => p[0]);
    const lng = g.map((p) => p[1]);
    const box = [Math.min(...lat), Math.max(...lat), Math.min(...lng), Math.max(...lng)];
    for (const a of aguas) {
      if (!a.name || hit.has(a.name)) continue;
      for (let i = 1; i < a.geometry.length; i++) {
        const q1 = a.geometry[i - 1];
        const q2 = a.geometry[i];
        if (Math.max(q1[0], q2[0]) < box[0] - 0.002 || Math.min(q1[0], q2[0]) > box[1] + 0.002)
          continue;
        if (Math.max(q1[1], q2[1]) < box[2] - 0.002 || Math.min(q1[1], q2[1]) > box[3] + 0.002)
          continue;
        let cruzou = false;
        for (let j = 1; j < g.length && !cruzou; j++) cruzou = cruza(g[j - 1], g[j], q1, q2);
        if (cruzou) {
          hit.add(a.name);
          break;
        }
      }
    }
  }
  return [...hit];
}

/** Ray casting on a [lng, lat] ring. */
function dentro(ring: number[][], lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function bairroDe(lat: number, lng: number, feats: BairroFeature[]): string | null {
  for (const f of feats) {
    const polys =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates as number[][][]]
        : (f.geometry.coordinates as number[][][][]);
    for (const poly of polys) {
      if (dentro(poly[0], lat, lng) && !poly.slice(1).some((h) => dentro(h, lat, lng)))
        return titleCase(f.properties.bairro);
    }
  }
  return null;
}

// ── build ───────────────────────────────────────────────────────────────────

function main() {
  const leis = (JSON.parse(readFileSync(SRC_LEIS, "utf8")) as { leis: LeiRaw[] }).leis;
  const osmWays = (JSON.parse(readFileSync(SRC_OSM, "utf8")) as { ways: OsmWay[] }).ways;
  const aguas = (JSON.parse(readFileSync(SRC_AGUA, "utf8")) as { ways: AguaWay[] }).ways;
  const bairros = (JSON.parse(readFileSync(SRC_BAIRROS, "utf8")) as { features: BairroFeature[] })
    .features;

  // 3a. every denomination the laws make, keyed by its token signature
  interface LeiEntry extends Denominacao {
    lei: LeiRaw;
  }
  const porChave = new Map<string, LeiEntry>();
  /** apelido → chave da denominação, p/ casar "Ponte do Salto" com a Lauro Muller. */
  const porApelido = new Map<string, string>();
  const semNome: string[] = [];
  for (const lei of leis) {
    if (NAO_DENOMINAM.has(lei.lei)) continue;
    const ds = denominacoes(lei);
    if (!ds.length) semNome.push(lei.lei);
    for (const d of ds) {
      const k = fold(tokens(d.nome)).join(" ");
      if (!k || porChave.has(k)) continue;
      porChave.set(k, { ...d, lei });
      for (const a of d.apelidos) porApelido.set(norm(a), k);
    }
  }

  const osm = agrupaOsm(osmWays);
  const usados = new Set<string>();
  const rows: BridgeRow[] = [];

  const linhaDaLei = (e: LeiEntry, nome: string) => {
    // The trecho is the whole law text; for a multi-name law, narrow it to the
    // clause that actually mentions this name, or Lauro Müller would inherit
    // Udo Deeke's river.
    const t = e.trecho;
    const idx = normKeepLen(t).indexOf(norm(nome).replace(/^PONTE /, ""));
    const clause = idx >= 0 ? t.slice(idx, idx + 420) : t;
    const agua = RE_AGUA.exec(clause);
    const bairrosLei = [...clause.matchAll(RE_BAIRRO)].flatMap((m) => limpaBairros(m[1]));
    const ruas = [...clause.matchAll(RE_RUA)].map((m) => titleCase(m[1].replace(/\s+/g, " ")));
    return {
      lei: e.lei.lei,
      numLei: e.lei.num,
      anoLei: e.lei.ano,
      dataLei: e.lei.data,
      ementa: e.lei.ementa,
      textoLei: e.lei.texto || null,
      urlLei: e.lei.url,
      cursoDaguaLei: agua ? limpaCurso(agua[1]) : null,
      bairrosLei: [...new Set(bairrosLei)],
      ruasLei: [...new Set(ruas)].slice(0, 4),
      situacao: REVOGADAS[e.lei.lei] ?? situacao(clause),
    };
  };

  // OSM often maps the popular name as its own way ("Ponte do Salto" alongside
  // bridge:name "Ponte Lauro Müller"). Lei 8492/2017 states those apelidos, so
  // the two groups resolve to the same law — and must then become ONE row.
  const porResolvida = new Map<string, OsmBridge & { chave: string }>();
  for (const b of osm) {
    let chave = fold(tokens(b.nome)).join(" ");
    const viaApelido = porApelido.get(norm(b.nome));
    if (!porChave.has(chave) && viaApelido) {
      chave = viaApelido;
      b.apelidos.push(b.nome);
    }
    const ja = porResolvida.get(chave);
    if (ja) {
      ja.ids.push(...b.ids);
      ja.geoms.push(...b.geoms);
      ja.tags.push(...b.tags);
      ja.apelidos.push(...b.apelidos, b.nome);
    } else {
      porResolvida.set(chave, { ...b, chave });
    }
  }

  // 3b. OSM bridges first — they carry geometry, and pick up a law when matched
  for (const b of porResolvida.values()) {
    const chave = b.chave;
    const e = porChave.get(chave);
    if (e) usados.add(chave);

    const geoms = b.geoms;
    const pontos = geoms.flat();
    const lat = pontos.length ? pontos.reduce((s, p) => s + p[0], 0) / pontos.length : null;
    const lng = pontos.length ? pontos.reduce((s, p) => s + p[1], 0) / pontos.length : null;
    const maior = geoms.slice().sort((x, y) => comprimento(y) - comprimento(x))[0];
    const tags = Object.assign({}, ...b.tags.slice().reverse()) as Record<string, string>;
    const via = b.tags.map((t) => t.name).find((n) => n && !/^(ponte|passarela|viaduto)/i.test(n));
    const bairro = lat === null || lng === null ? null : bairroDe(lat, lng, bairros);

    const nome = e ? e.nome : b.nome;
    rows.push({
      nome,
      nomeOsm: b.nome === nome ? null : b.nome,
      apelidos: [...new Set([...b.apelidos, ...(e?.apelidos ?? [])])].filter(
        (a) => norm(a) !== norm(nome),
      ),
      tipo: e ? e.tipo : tipoDaLei(b.nome),
      fonte: e ? "lei+osm" : "osm",
      nota: NOTAS[norm(nome)] ?? null,
      ...(e
        ? linhaDaLei(e, e.nome)
        : {
            lei: null,
            numLei: null,
            anoLei: null,
            dataLei: null,
            ementa: null,
            textoLei: null,
            urlLei: null,
            cursoDaguaLei: null,
            bairrosLei: [],
            ruasLei: [],
            situacao: tags.construction ? "em construção" : tags.proposed ? "projetada" : null,
          }),
      lat: lat === null ? null : Number(lat.toFixed(6)),
      lng: lng === null ? null : Number(lng.toFixed(6)),
      comprimento: maior ? Math.round(comprimento(maior)) : null,
      extremos: maior ? [maior[0], maior[maior.length - 1]] : null,
      via: via ?? null,
      classeVia: tags.highway ?? tags.railway ?? null,
      material: tags.bridge_structure ?? tags.material ?? null,
      camada: tags.layer ? Number(tags.layer) : null,
      pistas: tags.lanes ? Number(tags.lanes) : null,
      maoUnica: tags.oneway === "yes",
      osmIds: b.ids,
      transpoe: lat === null ? [] : transposicoes(geoms, aguas),
      bairros: bairro ? [bairro] : [],
    });
  }

  // 3c. the ~50 bridges only the law knows about
  for (const [chave, e] of porChave) {
    if (usados.has(chave)) continue;
    const l = linhaDaLei(e, e.nome);
    rows.push({
      nome: e.nome,
      nomeOsm: null,
      apelidos: e.apelidos.filter((a) => norm(a) !== norm(e.nome)),
      tipo: e.tipo,
      fonte: "lei",
      nota: NOTAS[norm(e.nome)] ?? null,
      ...l,
      lat: null,
      lng: null,
      comprimento: null,
      extremos: null,
      via: null,
      classeVia: null,
      material: null,
      camada: null,
      pistas: null,
      maoUnica: false,
      osmIds: [],
      transpoe: l.cursoDaguaLei ? [l.cursoDaguaLei] : [],
      bairros: l.bairrosLei,
    });
  }

  rows.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const payload: BridgesData = {
    source:
      "Câmara Municipal de Blumenau (leis de denominação) + OpenStreetMap (geometria) + Geoportal de Blumenau (bairros)",
    generatedAt: new Date().toISOString().slice(0, 10),
    count: rows.length,
    rows,
  };
  writeFileSync(OUT, JSON.stringify(payload));

  const comLei = rows.filter((r) => r.lei).length;
  const comGeo = rows.filter((r) => r.lat !== null).length;
  console.log(`bridges: ${rows.length} estruturas`);
  console.log(
    `         ${comLei} com lei · ${comGeo} com geometria · ${rows.filter((r) => r.fonte === "lei+osm").length} com as duas`,
  );
  console.log(
    `         ${rows.filter((r) => r.transpoe.length).length} com curso d'água identificado`,
  );
  console.log(`         wrote ${OUT}`);
  if (semNome.length)
    console.warn(`  ⚠ ${semNome.length} lei(s) sem nome extraído: ${semNome.join(", ")}`);
}

main();
