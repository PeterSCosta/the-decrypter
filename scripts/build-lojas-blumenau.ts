/**
 * Lojas dos shoppings de Blumenau — número da unidade → loja.
 *
 * Entrada: data-sources/lojas-shoppings-blumenau.json
 * Saída:   public/data/lojas-blumenau.json  ·  Run: pnpm build:lojas
 *
 * ── POR QUE OS APELIDOS SÃO GERADOS AQUI, E NÃO COPIADOS DA FONTE ───────────
 * A fonte traz um campo `apelidos` com a "forma curta só com dígitos" de cada
 * identificador, para casar com pista de gincana. Duas medições reprovam isso:
 *
 *  1. Ela é INCONSISTENTE. Para `L2016B/17` a fonte gera o apelido `17`; para
 *     `L2007/08/09/10/11` gera `2007/08/09/10/11`. Duas regras diferentes no
 *     mesmo arquivo.
 *  2. Ela COLIDE. Das 118 formas nuas, **99 (83,9%) já são código de rua ou
 *     número de lei de denominação** — famílias que a bancada responde certo,
 *     com nota 0,97. E 15 delas apontam para mais de uma loja dentro do próprio
 *     shopping (`01` serve cinco).
 *
 * Então: a forma NUA vive só no índice de busca da Biblioteca, onde quem
 * pergunta já escolheu o shopping. O fan-out do decodificador só enxerga a
 * forma COMPLETA, que colide em 5 de 119 (4,2%).
 *
 * ── E POR QUE `quiosque` É DERIVADO ─────────────────────────────────────────
 * A fonte marca `quiosque: false` em sete unidades cujo identificador começa
 * com `Q` ou cujo nome diz "Quiosque" (Q01 Case Mania, Q02 Stop Car Kids,
 * Q09 Femme Folheados, Q23 Drive Kids, Q26 Juli & Ana Balas, Q28 Bob´s, e a
 * L1012 "Quiosque Chopp Brahma"). O campo derivado bate com o identificador;
 * o da fonte não. A contagem da divergência sai no console para não sumir.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRADA = resolve(raiz, "data-sources/lojas-shoppings-blumenau.json");
const SAIDA = resolve(raiz, "public/data/lojas-blumenau.json");

/** `[iShopping, identificador, nome, piso, ala, ramo[], quiosque]` */
type LinhaLoja = [number, string | null, string, string | null, string | null, string[], boolean];

interface ShoppingBruto {
  id: string;
  nome: string;
  apelidos: string[];
  endereco: string;
  bairro: string;
  cep: string;
  site: string;
  telefone: string;
  grupo: string | null;
  numeracaoPublica: boolean;
  identificadorTipo: string | null;
  formatoIdentificador: string | null;
  fonte: string;
  url: string;
  consultadoEm: string;
  lojas?: [string | null, string, string | null, string | null, string[], boolean][];
  nomes?: string[];
}

const fonte = JSON.parse(readFileSync(ENTRADA, "utf8")) as {
  versao: string;
  geradoEm: string;
  shoppings: ShoppingBruto[];
};

/** A forma nua de um identificador: os dígitos, sem prefixo de letra nem rótulo. */
function nua(id: string): string | null {
  const semRotulo = id.replace(/^(lojas?|salas?|quiosque|serv\.?)\s*/i, "").trim();
  const m = semRotulo.match(/\d[\d/-]*/);
  return m ? m[0] : null;
}

const shoppings: Omit<ShoppingBruto, "lojas" | "nomes">[] = [];
const rows: LinhaLoja[] = [];
let divergenciasQuiosque = 0;

for (const s of fonte.shoppings) {
  const { lojas, nomes, ...meta } = s;
  const i = shoppings.push(meta) - 1;

  for (const [identificador, nome, piso, ala, ramo, quiosqueFonte] of lojas ?? []) {
    const quiosque =
      /^q/i.test(identificador ?? "") || /quiosque/i.test(`${identificador ?? ""} ${nome}`);
    if (quiosque !== quiosqueFonte) divergenciasQuiosque++;
    rows.push([i, identificador, nome, piso, ala, ramo, quiosque]);
  }
  // Neumarkt e Norte chegam só com a lista de nomes: o sitemap deles publica
  // nome e mais nada. NÃO se escreve "não tem número" — se escreve que a fonte
  // usada não o traz, e o campo fica `null` esperando a página de detalhe.
  for (const nome of nomes ?? []) rows.push([i, null, nome, null, null, [], false]);
}

const comId = rows.filter((r) => r[1]).length;
const identificadores = new Set(rows.map((r) => r[1]).filter(Boolean) as string[]);

writeFileSync(
  SAIDA,
  JSON.stringify({
    source: `Guias de loja dos quatro shoppings de Blumenau · catálogo v${fonte.versao} de ${fonte.geradoEm}`,
    generatedAt: new Date().toISOString().slice(0, 10),
    cobertura:
      "Blumenau/SC — Park Europeu, Shopping H, Neumarkt e Norte. O identificador só existe onde o empreendimento o publica.",
    aviso:
      "Neumarkt e Norte entram apenas com a lista de nomes: a fonte usada (o sitemap) não traz o número da unidade. A página de detalhe do Neumarkt traz — medido em 4 de 14 sorteadas —, e não foi coletada.",
    count: rows.length,
    comIdentificador: comId,
    identificadoresDistintos: identificadores.size,
    shoppings,
    rows,
  }),
);

const nuasColidiveis = [...identificadores].map(nua).filter(Boolean).length;
console.log(
  `lojas-blumenau.json · ${rows.length} lojas · ${comId} com identificador ` +
    `(${identificadores.size} distintos, ${nuasColidiveis} com forma nua) · ` +
    `${shoppings.length} shoppings · quiosque corrigido em ${divergenciasQuiosque} linhas`,
);
