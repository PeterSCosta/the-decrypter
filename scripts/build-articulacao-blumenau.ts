/**
 * build-articulacao-blumenau.ts — a articulação de folhas cartográficas de
 * Blumenau, nas escalas 1:5.000 e 1:1.000.
 *
 * ── POR QUE ESTE DADO PRECISA SER BAIXADO, E NÃO CALCULADO ─────────────────
 * A carta topográfica nacional é MATEMÁTICA até 1:25.000: o `carta-ibge.ts` já
 * decompõe `SG-22-Z-B-VI-1-NE` sem consultar nada, porque cada nível é uma
 * divisão regular do anterior. O desdobramento MUNICIPAL não é: a prefeitura
 * escolheu como subdividir, e a única fonte da verdade é a articulação que ela
 * publicou. Deduzir por semelhança daria nomes plausíveis e errados.
 *
 * ── A FONTE ────────────────────────────────────────────────────────────────
 * ArcGIS REST aberto do geoportal, sem chave e sem login:
 *   voo/Articulacao_5000_2022  →  93 folhas
 *   voo/Articulacao_1000_2022  →  938 folhas
 *
 * ── A ARMADILHA DE PAGINAÇÃO, QUE JÁ MORDEU ESTE REPOSITÓRIO ──────────────
 * Cada camada do ArcGIS tem o próprio `maxRecordCount`, e ele NÃO é anunciado
 * como limite na resposta — vem uma página e pronto, sem erro. Este script mede
 * o total com `returnCountOnly` ANTES de paginar e falha se o que baixou não
 * bater, em vez de gravar um arquivo pela metade que ninguém percebe.
 *
 * Output: public/data/articulacao-blumenau.json
 * Run:    pnpm build:articulacao
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public/data/articulacao-blumenau.json");
const BASE = "https://geo.blumenau.sc.gov.br/server/rest/services/voo";

/** As duas camadas, com o nome do campo do rótulo em cada uma. */
const CAMADAS = [
  { servico: "Articulacao_5000_2022", escala: 5000 },
  { servico: "Articulacao_1000_2022", escala: 1000 },
] as const;

/** Uma folha: rótulo e caixa, em WGS84. */
type Folha = [folha: string, minLon: number, minLat: number, maxLon: number, maxLat: number];

const arred = (n: number) => Math.round(n * 1e5) / 1e5;

async function contar(servico: string): Promise<number> {
  const url = `${BASE}/${servico}/MapServer/0/query?where=1%3D1&returnCountOnly=true&f=json`;
  const r = (await (await fetch(url)).json()) as { count?: number };
  if (typeof r.count !== "number") throw new Error(`${servico}: sem contagem`);
  return r.count;
}

async function baixar(servico: string): Promise<Folha[]> {
  const total = await contar(servico);
  const out: Folha[] = [];
  const passo = 500;

  for (let offset = 0; offset < total; offset += passo) {
    const url =
      `${BASE}/${servico}/MapServer/0/query?where=1%3D1&outFields=folha&returnGeometry=true` +
      `&outSR=4326&resultOffset=${offset}&resultRecordCount=${passo}&f=json`;
    const r = (await (await fetch(url)).json()) as {
      features?: { attributes: Record<string, unknown>; geometry?: { rings?: number[][][] } }[];
    };
    for (const f of r.features ?? []) {
      const nome = String(f.attributes.folha ?? "").trim();
      const anel = f.geometry?.rings?.[0];
      if (!nome || !anel?.length) continue;
      const xs = anel.map((p) => p[0]);
      const ys = anel.map((p) => p[1]);
      out.push([
        nome,
        arred(Math.min(...xs)),
        arred(Math.min(...ys)),
        arred(Math.max(...xs)),
        arred(Math.max(...ys)),
      ]);
    }
  }

  // Ver o bloco da armadilha de paginação: metade calada é pior que falha.
  if (out.length !== total) {
    throw new Error(
      `${servico}: baixei ${out.length} de ${total} folhas. A paginação não fechou — não vou gravar um arquivo pela metade.`,
    );
  }
  return out;
}

async function main() {
  const payload: {
    source: string;
    url: string;
    generatedAt: string;
    escalas: Record<string, Folha[]>;
  } = {
    source: "Prefeitura de Blumenau — geoportal, articulação de voo 2022",
    url: BASE,
    generatedAt: new Date().toISOString().slice(0, 10),
    escalas: {},
  };

  for (const { servico, escala } of CAMADAS) {
    const folhas = await baixar(servico);
    payload.escalas[String(escala)] = folhas;
    console.log(`articulacao 1:${escala}: ${folhas.length} folhas`);
  }

  writeFileSync(OUT, JSON.stringify(payload));
  console.log(`         wrote ${OUT}`);
}

main();
