/**
 * build-estacoes-ibge.ts — estações geodésicas do IBGE no Vale do Itajaí.
 *
 * Saída: public/data/estacoes-ibge.json  ·  Run: pnpm build:estacoes
 *
 * ── O QUE É UMA ESTAÇÃO GEODÉSICA ───────────────────────────────────────────
 * Uma chapa de bronze cravada em ponte, calçada ou afloramento de rocha, com um
 * código curto gravado. É a mesma família da plaqueta de poste que a GIA-25
 * usou: objeto físico numerado, em lugar público, que a equipe pode ir tocar.
 *
 * ── A ARMADILHA, MEDIDA ─────────────────────────────────────────────────────
 * `nrMaxEstacoes` tem **default 20**. Sem o parâmetro, Blumenau devolve 20 e a
 * conclusão seria "Blumenau tem 20 estações". Com `nrMaxEstacoes=100`, são 82.
 * O teto do parâmetro é 100 — se algum município passar disso, o script avisa.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://servicodados.ibge.gov.br/api/v1/bdg";
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public/data/estacoes-ibge.json",
);

/** O território da gincana: Blumenau, Itajaí e a vizinhança que dá pé ir. */
const MUNICIPIOS: [string, string][] = [
  ["4202404", "Blumenau"],
  ["4208203", "Itajaí"],
  ["4211900", "Navegantes"],
  ["4205902", "Gaspar"],
  ["4207502", "Indaial"],
  ["4217600", "Timbó"],
  ["4213500", "Pomerode"],
  ["4202800", "Brusque"],
  ["4202008", "Balneário Camboriú"],
  ["4204202", "Camboriú"],
  ["4208302", "Itapema"],
  ["4212502", "Penha"],
  ["4201950", "Balneário Piçarras"],
  ["4208906", "Jaraguá do Sul"],
];

interface Estacao {
  codigoEstacao?: string;
  tipoEstacao?: string;
  nomeEstacao?: string;
  situacao?: string;
  descricaoEstacao?: string;
  latitude?: number;
  longitude?: number;
  municipio?: { nomeMunicipio?: string };
}

async function main() {
  const rows: (string | number)[][] = [];
  const municipios: string[] = [];

  for (const [geo, nome] of MUNICIPIOS) {
    const r = await fetch(`${API}/municipio/${geo}/estacoes?nrMaxEstacoes=100`);
    if (!r.ok) {
      console.warn(`  ${nome}: HTTP ${r.status} — pulando`);
      continue;
    }
    const lista = (await r.json()) as Estacao[];
    if (!Array.isArray(lista)) continue;
    if (lista.length === 100) console.warn(`  ${nome}: bateu no teto de 100 — pode haver mais`);

    const iMun = municipios.push(nome) - 1;
    for (const e of lista) {
      const cod = (e.codigoEstacao ?? "").trim();
      if (!cod || e.latitude == null || e.longitude == null) continue;
      rows.push([
        cod.toUpperCase(),
        iMun,
        (e.tipoEstacao ?? "").trim(),
        (e.situacao ?? "").trim(),
        // A descrição é o que transforma isto em pista: "chapa cravada na
        // cabeceira da ponte sobre o Rio Perequê" é praticamente um enunciado.
        (e.descricaoEstacao ?? "")
          .trim()
          .slice(0, 180),
        Number(e.latitude.toFixed(6)),
        Number(e.longitude.toFixed(6)),
      ]);
    }
    console.log(`  ${nome}: ${lista.length} estações`);
    await new Promise((r) => setTimeout(r, 250));
  }

  writeFileSync(
    OUT,
    JSON.stringify({
      source: "IBGE — Banco de Dados Geodésicos (BDG)",
      url: `${API}/municipio/{geocodigo}/estacoes`,
      generatedAt: new Date().toISOString().slice(0, 10),
      cobertura: "Vale do Itajaí e litoral próximo",
      count: rows.length,
      municipios,
      rows,
    }),
  );
  console.log(`estações: ${rows.length} em ${municipios.length} municípios → ${OUT}`);
}

main();
