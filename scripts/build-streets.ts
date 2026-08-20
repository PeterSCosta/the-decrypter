/**
 * build-streets.ts — parse Blumenau's "Rol de Ruas com Gabaritos" into compact JSON.
 *
 * Input : data-sources/rol-de-ruas.txt  (from: pdftotext -layout "rol de ruas.pdf")
 * Output: public/data/streets.json
 *
 * Each logical street entry is a 3-line block:
 *   <codigo> <tipo> <NOME>   Bairro: <n> <bairro>   Nº da Lei <lei>   Data da Lei <dd/mm/aaaa>
 *   Localização: <ref>                                                 Ext. <e> Larg. <l>
 *   Atas Comissão Ruas/Decretos/Lot.: <notas>
 *
 * Run: pnpm build:streets
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = resolve(ROOT, "data-sources/rol-de-ruas.txt");
const OUT = resolve(ROOT, "public/data/streets.json");

export interface StreetRow {
  codigo: number;
  tipo: string; // R, Pça, Av, …
  nome: string;
  bairroNum: number | null;
  bairro: string;
  numLei: number | null;
  dataLei: string | null; // dd/mm/aaaa
  localizacao: string;
  ext: number | null; // metros
  larg: number | null; // metros
  atas: string;
}

// Line 1: code + (tipo nome) + Bairro: [num] name + Nº da Lei [num] + [Data da Lei date]
// Trailing [^\n]* absorbs empty dates ("Data da Lei / /") and inline notes.
const HEAD =
  /^(\d+)\s+(\S+)\s+(.+?)\s*Bairro:\s+(?:(\d+)\s+)?(.+?)\s+N[ºo°]\s*da Lei\s*(\d+)?(?:\s*Data da Lei\s*(\d{2}\/\d{2}\/\d{4})?)?[^\n]*$/;
const LOC = /^Localiza[çc][ãa]o:\s*(.*?)\s*(?:Ext\.\s*([\d.,]+))?\s*(?:Larg\.\s*([\d.,]+))?\s*$/;
const ATAS = /^Atas Comiss[ãa]o Ruas\/Decretos\/Lot\.:\s*(.*)$/;

/** "2.240,00" / "135,00" → 2240 / 135 ; "" → null */
function brNum(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseFloat(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function main() {
  // Form-feed (\f) marks PDF page breaks and prefixes entry lines — turn into newlines.
  const lines = readFileSync(SRC, "utf8").replace(/\f/g, "\n").split(/\r?\n/);
  const rows: StreetRow[] = [];
  let headLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("da Lei")) headLines++;
    const m = HEAD.exec(line);
    if (!m) continue;

    const row: StreetRow = {
      codigo: Number(m[1]),
      tipo: m[2],
      nome: m[3].trim(),
      bairroNum: m[4] ? Number(m[4]) : null,
      bairro: m[5].trim(),
      numLei: m[6] && m[6] !== "0" ? Number(m[6]) : null, // "Nº da Lei 0" = none
      dataLei: m[7] ?? null,
      localizacao: "",
      ext: null,
      larg: null,
      atas: "",
    };

    // Look ahead a few lines for Localização / Atas belonging to this entry.
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const loc = LOC.exec(lines[j]);
      if (loc) {
        row.localizacao = (loc[1] ?? "").trim();
        row.ext = brNum(loc[2]);
        row.larg = brNum(loc[3]);
        continue;
      }
      const at = ATAS.exec(lines[j]);
      if (at) {
        row.atas = (at[1] ?? "").trim();
        break;
      }
      if (HEAD.test(lines[j])) break; // next entry started
    }

    rows.push(row);
  }

  rows.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.codigo - b.codigo);

  /**
   * FUNDIR, NUNCA SOBRESCREVER.
   *
   * O `streets.json` versionado não é só o que este script produz: ele carrega
   * a coordenada de 3.178 das 4.426 ruas, posta depois por `build:streets-geo`
   * e por `enrich:streets` (1.108 delas vieram dos eixos). Escrever o payload
   * cru por cima **apagava tudo isso** — e o pior é que apagava em silêncio, no
   * primeiro passo de `pnpm build:data`, deixando o repositório pior do que o
   * comando o encontrou e derrubando os testes de enriquecimento.
   *
   * Aqui a coordenada existente é reindexada por `codigo` e recolocada nas
   * linhas novas. O que o PDF traz (nome, bairro, lei, extensão) é atualizado;
   * o que só a geocodificação sabe é preservado. Rua que sumiu do PDF perde a
   * coordenada junto, que é o correto — ela não existe mais.
   */
  const anterior = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, "utf8")) as {
        rows?: { codigo: number; lat?: number; lng?: number }[];
        geocoded?: number;
        geocodedAt?: string;
        geocodadoPorEixos?: number;
      })
    : null;

  let preservadas = 0;
  if (anterior?.rows?.length) {
    const geoPorCodigo = new Map<number, { lat?: number; lng?: number }>();
    for (const r of anterior.rows)
      if (r.lat != null && r.lng != null) geoPorCodigo.set(r.codigo, { lat: r.lat, lng: r.lng });
    for (const r of rows) {
      const g = geoPorCodigo.get(r.codigo);
      if (g) {
        Object.assign(r, g);
        preservadas++;
      }
    }
  }

  const payload = {
    source: "Prefeitura de Blumenau — Rol de Ruas com Gabaritos",
    generatedAt: new Date().toISOString().slice(0, 10),
    count: rows.length,
    rows,
    /**
     * Os contadores viajam **verbatim**, não recalculados.
     *
     * Este script não geocodifica nada — ele parseia o PDF. Quem é autoridade
     * sobre `geocoded` é o `geocode-streets.ts` e o `enrich-streets-eixos.ts`,
     * e recalcular aqui seria trocar a semântica de um campo alheio de carona
     * num conserto de outra coisa.
     *
     * (Fica registrado que o valor gravado hoje — 3.178 — não bate com as 4.286
     * linhas que de fato têm coordenada: o último passo a escrever foi o
     * `geocode-streets`, que grava o próprio `matched` por cima do total do
     * enriquecimento por eixos. É defeito anterior a este conserto, é dos dois
     * scripts de geocodificação, e não se conserta em silêncio aqui.)
     */
    ...(anterior?.geocoded !== undefined ? { geocoded: anterior.geocoded } : {}),
    ...(anterior?.geocodedAt !== undefined ? { geocodedAt: anterior.geocodedAt } : {}),
    ...(anterior?.geocodadoPorEixos !== undefined
      ? { geocodadoPorEixos: anterior.geocodadoPorEixos }
      : {}),
  };
  writeFileSync(OUT, JSON.stringify(payload));
  if (anterior?.rows?.length)
    console.log(`         preservou coordenada de ${preservadas} rua(s) do artefato anterior`);

  const missed = headLines - rows.length;
  console.log(
    `streets: parsed ${rows.length} entries (\"da Lei\" lines: ${headLines}, unmatched: ${missed})`,
  );
  console.log(`         distinct códigos: ${new Set(rows.map((r) => r.codigo)).size}`);
  console.log(`         wrote ${OUT}`);
  if (missed > 5)
    console.warn(`  ⚠ ${missed} entries did not match HEAD regex — inspect formatting.`);
}

main();
