/**
 * Lojas dos shoppings de Blumenau — número da unidade → loja.
 *
 * ── O QUE ESTA BASE RESPONDE, E O QUE ELA NÃO RESPONDE ──────────────────────
 * Ela responde `L2032` → "60 Sabores, 2º Piso, Praça de Alimentação". Ela **não**
 * responde a razão social: o CNPJ é outro salto, e quem o dá é o card de
 * documento. A prova real do acervo (PROVA 35 — PARCERIA, GCB 2025) pede a
 * letra na razão social, então a cadeia inteira é
 * `número da loja → loja → CNPJ → razão social → letra`, e esta base fecha só
 * o primeiro elo — que até agora não era nosso.
 *
 * ── A COBERTURA É DESIGUAL, E ISSO VIAJA NO DADO ────────────────────────────
 * Park Europeu 87/88 e Shopping H 32/32 publicam o número. Neumarkt (150) e
 * Norte (102) entram só com o nome, porque a fonte usada foi o sitemap, que
 * publica nome e mais nada. Isso NÃO quer dizer que eles não numerem: a página
 * de detalhe do Neumarkt traz o campo, medido em 4 de 14 sorteadas
 * (`L-29` Pizza Hut, `QL01` Café Cultura, `L-66` Ophicina, `L-169` Vialaser).
 * O `aviso` do artefato carrega essa frase, e o card a repete — "não achei" não
 * pode ser lido como "não existe".
 */

import { stripDiacritics } from "@/features/decoder/engine/util";

/** `[iShopping, identificador, nome, piso, ala, ramo[], quiosque]` */
export type LinhaLoja = [
  number,
  string | null,
  string,
  string | null,
  string | null,
  string[],
  boolean,
];

export interface ShoppingRef {
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
}

export interface LojasData {
  source: string;
  generatedAt: string;
  cobertura: string;
  aviso: string;
  count: number;
  comIdentificador: number;
  identificadoresDistintos: number;
  shoppings: ShoppingRef[];
  rows: LinhaLoja[];
}

export interface Loja {
  identificador: string | null;
  nome: string;
  piso: string | null;
  ala: string | null;
  ramo: string[];
  quiosque: boolean;
  shopping: ShoppingRef;
}

/**
 * A forma canônica de um identificador: caixa alta, sem espaço e sem ponto.
 *
 * `-` e `/` **ficam**, e isso é decisão medida, não descuido. O Park Europeu tem
 * `L25` (IOA) e `L-25` (Uniavan) como unidades DIFERENTES, no mesmo piso e na
 * mesma ala; achatar o hífen fundiria duas lojas reais numa. E `Loja 22-23` não
 * pode virar `LOJA2223`, que seria outro número.
 */
export const canonIdentificador = (s: string) =>
  stripDiacritics(s)
    .toUpperCase()
    .replace(/[\s.]+/g, "");

const dobra = (s: string) =>
  stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function monta(data: LojasData, r: LinhaLoja): Loja {
  const [i, identificador, nome, piso, ala, ramo, quiosque] = r;
  return { identificador, nome, piso, ala, ramo, quiosque, shopping: data.shoppings[i] };
}

/**
 * Todas as lojas com AQUELE identificador, na forma completa.
 *
 * Devolve lista e não a primeira: `A13` serve Americanas **e** Pittol no Park
 * Europeu, e `L1071/72/92/93/94` serve Blulivro e Blulivro Coffee Store.
 * Escolher uma seria inventar a resposta da prova — a mesma regra da votação.
 */
export function porIdentificador(data: LojasData | null, texto: string): Loja[] {
  if (!data) return [];
  const alvo = canonIdentificador(texto);
  if (!alvo) return [];
  return data.rows
    .filter((r) => r[1] && canonIdentificador(r[1]) === alvo)
    .map((r) => monta(data, r));
}

/**
 * Lojas cujo identificador tem AQUELES dígitos, ignorando o prefixo de letra.
 *
 * Porta separada de propósito, e com nota própria no decoder: das 118 formas
 * nuas, **99 (83,9%) já são código de rua ou número de lei** — famílias que a
 * bancada responde certo, a 0,97. Quem chama isto tem de entrar abaixo delas.
 */
export function porFormaNua(data: LojasData | null, digitos: string): Loja[] {
  if (!data) return [];
  const alvo = digitos.replace(/^0+(?=\d)/, "");
  if (!/^\d/.test(alvo)) return [];
  return data.rows
    .filter((r) => {
      if (!r[1]) return false;
      const m = canonIdentificador(r[1]).match(/\d[\d/-]*/);
      return m ? m[0].replace(/^0+(?=\d)/, "") === alvo : false;
    })
    .map((r) => monta(data, r));
}

/**
 * Busca larga, para a Biblioteca — nome, identificador, forma nua, shopping,
 * piso, ala e ramo.
 *
 * Ela é generosa **porque quem chega aqui já escolheu o contexto**. No fan-out
 * a mesma generosidade seria ruído: 41 dos 372 nomes de loja (11,0%) são
 * palavra do dicionário — `claro`, `vivo`, `farm`, `hope`, `maze`, `tomato` —,
 * e um decoder por nome acenderia em prosa comum.
 */
export function buscar(data: LojasData | null, termo: string): Loja[] {
  if (!data) return [];
  const todas = data.rows.map((r) => monta(data, r));
  const q = dobra(termo);
  if (!q) return todas;
  return todas.filter((l) => {
    const alvo = [
      l.nome,
      l.identificador ?? "",
      l.piso ?? "",
      l.ala ?? "",
      l.ramo.join(" "),
      l.shopping.nome,
      l.shopping.apelidos.join(" "),
      l.quiosque ? "quiosque" : "",
    ]
      .map(dobra)
      .join(" ");
    return alvo.includes(q);
  });
}
