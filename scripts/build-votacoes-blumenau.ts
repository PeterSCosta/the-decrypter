/**
 * build-votacoes-blumenau.ts — votação de cada candidato em Blumenau, do JSON
 * oficial do TSE.
 *
 * Saída: public/data/votacoes-blumenau.json  ·  Run: pnpm build:votacoes
 *
 * ── POR QUE ISTO EXISTE ─────────────────────────────────────────────────────
 * A GIA-34 é exatamente esta mecânica: a prova dá um NÚMERO DE VOTOS, você
 * descobre o candidato e conta a letra na posição pedida. O acervo registra
 * treze desses números. Sem a base, cada um vira uma busca manual no site do
 * TSE no meio da madrugada.
 *
 * ── O QUE ESTA BASE **NÃO** COBRE, E É PRECISO DIZER ────────────────────────
 * Só o ciclo de 2024. O caminho `resultados.tse.jus.br/oficial/eleAAAA/...`
 * serve o pleito corrente; medido, 2016, 2020 e 2022 devolvem 404 por esse
 * padrão — as eleições anteriores só existem nos ZIPs nacionais de dados
 * abertos, que é outro trabalho. A tela diz o ano de cada acerto justamente
 * para ninguém achar que "não achei" significa "não existe".
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public/data/votacoes-blumenau.json",
);

/** Blumenau é o município 80470 na numeração do TSE (que não é a do IBGE). */
const MUNICIPIO = "sc80470";
const PLEITOS = [
  { ano: 2024, ele: "ele2024", id: "619", cargos: { c0011: "Prefeito", c0013: "Vereador" } },
] as const;

interface Cand {
  nm?: string;
  vap?: string | number;
  nmp?: string;
  n?: string;
}

/** O JSON aninha os candidatos em níveis que mudam por cargo; varrer é o certo. */
function candidatos(o: unknown): Cand[] {
  if (Array.isArray(o)) return o.flatMap(candidatos);
  if (o && typeof o === "object") {
    const r = o as Record<string, unknown>;
    if ("nm" in r && "vap" in r) return [r as Cand];
    return Object.values(r).flatMap(candidatos);
  }
  return [];
}

async function main() {
  const rows: [number, string, string, number, string][] = [];

  for (const p of PLEITOS) {
    for (const [cargo, nomeCargo] of Object.entries(p.cargos)) {
      const url = `https://resultados.tse.jus.br/oficial/${p.ele}/${p.id}/dados/sc/${MUNICIPIO}-${cargo}-e000${p.id}-u.json`;
      const r = await fetch(url);
      if (!r.ok) {
        console.warn(`  ${p.ano} ${nomeCargo}: HTTP ${r.status} — pulando`);
        continue;
      }
      const cs = candidatos(await r.json());
      for (const c of cs) {
        const votos = Number(c.vap ?? 0);
        const nome = (c.nm ?? "").trim();
        if (!votos || !nome) continue;
        rows.push([votos, nome, nomeCargo, p.ano, (c.n ?? "").trim()]);
      }
      console.log(`  ${p.ano} ${nomeCargo}: ${cs.length} candidatos`);
    }
  }

  // Ordenado por votos: a busca é por número, e ordenar aqui deixa o consumidor
  // fazer busca binária se um dia a base crescer.
  rows.sort((a, b) => a[0] - b[0]);

  writeFileSync(
    OUT,
    JSON.stringify({
      source: "TSE — resultados oficiais (resultados.tse.jus.br)",
      generatedAt: new Date().toISOString().slice(0, 10),
      cobertura: "Blumenau/SC, eleição de 2024 (prefeito e vereador)",
      aviso: "Anos anteriores a 2024 só existem nos ZIPs nacionais de dados abertos.",
      count: rows.length,
      rows,
    }),
  );
  console.log(`votações: ${rows.length} → ${OUT}`);
}

main();
