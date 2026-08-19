/**
 * build-enderecos-blumenau.ts — o número da porta que falta em 9 de cada 10
 * lotes, colhido da tabela de endereços do geoportal e escrito de volta em
 * `seed-data/lotes-blumenau.json`.
 *
 * Saída: seed-data/lotes-blumenau.json (reescrito)  ·  Run: pnpm build:enderecos
 *
 * ── O BURACO QUE ISTO TAPA ──────────────────────────────────────────────────
 * A camada `Lotes_info`, que gerou a base, traz `NUMERO` quase sempre vazio:
 * MEDIDO nas 84.539 linhas — 44.227 em branco, 29.842 "00", 1.472 "000", 81
 * "0000" e 22 "0". São 75.644 lotes (89,5%) que só sabem dizer a rua. O número
 * mora em OUTRA tabela do mesmo serviço, `GEO.CONSULTA_ENDERECO`, ligada ao
 * lote pelo `TRDSIQ` — que é exatamente o nosso `iq` (`4-1-24-16-28`).
 *
 * ── POR QUE A COLHEITA É POR PREFIXO, E NÃO POR PÁGINA ──────────────────────
 * Esta tabela é uma *query layer* sem chave de verdade, e as três formas
 * normais de paginar estão QUEBRADAS nela (medido hoje, não suposto):
 *
 *   `resultOffset`  mente — offset 0 devolve os OIDs [5,6] e offset 5000
 *                   devolve [8,9]: ele anda três linhas, não cinco mil.
 *   `ESRI_OID`      não é chave — a faixa 1..5 devolve 12 linhas com OIDs
 *                   repetidos, e 100000..100004 devolve zero.
 *   `outStatistics` responde HTTP 400.
 *   `resultRecordCount` responde HTTP 400 sempre que o valor pedido passa do
 *                   número de linhas que casam — pedir 3.000 numa partição de
 *                   3 linhas derruba a consulta. Por isso o script NÃO manda o
 *                   parâmetro: deixa o serviço aplicar o `maxRecordCount` dele
 *                   (3.000) e avisar com `exceededTransferLimit`.
 *
 * O que sobra é `where`: partição por `TRDSIQ LIKE '<prefixo>%'`. O prefixo é
 * um TRIE DE CARACTERES, um char por vez sobre `0-9` e `-`, e não a lista de
 * prefixos que a nossa base já conhece. A diferença importa: o trie é
 * PROVADAMENTE completo — todo TRDSIQ continua com um desses 11 caracteres, e
 * o script confere a soma dos filhos contra a contagem do pai a cada nível. Uma
 * lista tirada da nossa base só encontraria o que a nossa base já tem.
 *
 * A recursão desce enquanto a contagem passar de `TETO` (2.500), porque o
 * `maxRecordCount` do serviço é 3.000 e um retorno de exatamente 3.000 é
 * truncamento silencioso, não resposta. Na folha o script exige que o número de
 * linhas recebidas BATA com a contagem pedida — se não bater, desce mais um
 * nível em vez de aceitar a perda.
 *
 * ── A TABELA VEM DOBRADA (e isso é bom saber antes de contar) ───────────────
 * Cada endereço aparece DUAS vezes, com o mesmo `ESRI_OID`: uma linha com o
 * número e outra com `NUMERO` nulo ou "00" (é o join da query layer, não erro
 * nosso). São 170.993 linhas para ~85 mil endereços. Filtrar o lixo já no
 * `where` derruba a colheita para 83.934 linhas — metade do tráfego, e
 * partições que cabem no teto sem descer tão fundo.
 *
 * Cuidado medido: `NUMERO <> ''` devolve count ZERO enquanto `NUMERO IS NOT
 * NULL` devolve 118.419. O vazio ali é NULL, não string vazia — o filtro tem de
 * dizer as duas coisas ("não é nulo" E "não é um dos zeros disfarçados").
 *
 * ── O LOTE DE ESQUINA TEM MAIS DE UM ENDEREÇO ───────────────────────────────
 * MEDIDO na rodada de 19/08/2026: 8.562 lotes têm endereço que não cabe em `logradouro`+`numero`: 7.901 com mais
 * de uma porta (destes, 1.133 em ruas DIFERENTES — a esquina de verdade) e 661
 * cujo único endereço é de outra rua. Os 1.133 são SUBCONJUNTO dos 7.901, não
 * uma terceira parcela: 7.901 + 1.133 NÃO soma 8.562, e a conta anterior somava.
 *
 * Escolher um endereço seria apagar o outro, e o outro é justamente o que uma
 * prova de gincana usa ("a casa da esquina da X com a Y").
 *
 * FORMATO ESCOLHIDO — um décimo campo na linha posicional, texto puro:
 *
 *     "7 DE SETEMBRO, 1560;DOUTOR AMADEU DA LUZ, 241"
 *
 * Por que texto pronto e não índice do dicionário de ruas, como as colunas
 * `logradouro`/`bairro`? Porque este campo atravessa três casas — JSON, coluna
 * do Postgres, card do decoder — e o índice só faz sentido na primeira. Uma
 * coluna `enderecos` com "12,236;907,81" seria ilegível no banco e obrigaria a
 * carregar o dicionário para ler uma linha. O custo é pequeno porque o campo é
 * RARO: ele só existe quando não cabe em `logradouro` + `numero`, ou seja
 * quando há mais de um endereço, ou quando o único que existe é de outra rua.
 * Para o lote comum de um endereço só, o campo fica vazio e o número entra
 * direto em `numero`, como sempre esteve.
 *
 * E quando o campo existe, ele guarda o conjunto INTEIRO — inclusive o endereço
 * que subiu para `numero`. Quem lê o card não precisa juntar dois lugares.
 *
 * ── O QUE ESTE SCRIPT NÃO FAZ ───────────────────────────────────────────────
 * Não sobrescreve número que já existe, e não muda a rua de lugar: se o único
 * endereço colhido é de outra rua, ele vai para o campo novo em vez de virar
 * "IGUAPE, 81" em cima de um lote da JOINVILLE. Número de porta na rua errada é
 * pior do que lote sem número.
 *
 * Uso:
 *   pnpm build:enderecos              # colhe do geoportal e reescreve a base
 *   CACHE=1 pnpm build:enderecos      # reaproveita a colheita anterior
 *   DELAY_MS=400 pnpm build:enderecos # mais devagar com o servidor municipal
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BASE = resolve(ROOT, "seed-data/lotes-blumenau.json");
/** Colheita crua, para não repetir 200 requisições ao mexer só na junção. */
const CACHE_FILE = resolve(ROOT, "data-sources/enderecos-blumenau.jsonl");

const TABELA =
  "https://geo.blumenau.sc.gov.br/server/rest/services/consulta_construir/Consulta_endereco/MapServer/1";

/** Acima disto a partição desce mais um caractere. Folga de 500 sobre o teto. */
const TETO = 2500;
/** Todo TRDSIQ continua com um destes — é o que faz o trie ser exaustivo. */
const ALFABETO = [..."0123456789-"];

const DELAY_MS = Number(process.env.DELAY_MS ?? 150);
const USAR_CACHE = process.env.CACHE === "1";

/**
 * "Zero disfarçado": o cadastro escreve o vazio como "00" — e às vezes como
 * "000", "0" ou "0000". Nenhum deles é número de porta.
 */
const FILTRO = "NUMERO IS NOT NULL AND NUMERO NOT IN ('00','000','0','0000')";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Endereco {
  iq: string;
  rua: string;
  numero: string;
}

let requisicoes = 0;

async function consultar(params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(`${TABELA}/query`);
  for (const [k, v] of Object.entries({ f: "json", ...params })) url.searchParams.set(k, v);

  for (let tentativa = 1; ; tentativa++) {
    requisicoes++;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as Record<string, unknown> & { error?: { message?: string } };
      if (d.error) throw new Error(`geoportal: ${d.error.message ?? "erro"}`);
      await sleep(DELAY_MS);
      return d;
    } catch (e) {
      if (tentativa >= 4) throw e;
      // Servidor municipal cansado: espera crescente antes de insistir.
      await sleep(DELAY_MS * 4 * tentativa);
    }
  }
}

async function contar(prefixo: string): Promise<number> {
  const where = prefixo ? `${FILTRO} AND TRDSIQ LIKE '${prefixo}%'` : FILTRO;
  const d = await consultar({ where, returnCountOnly: "true" });
  return Number(d.count ?? 0);
}

/** `null` = o serviço truncou (avisou `exceededTransferLimit`). */
async function baixar(prefixo: string): Promise<Endereco[] | null> {
  const where = prefixo ? `${FILTRO} AND TRDSIQ LIKE '${prefixo}%'` : FILTRO;
  const d = await consultar({
    where,
    outFields: "TRDSIQ,DESCRICAO,NUMERO",
    returnGeometry: "false",
  });
  if (d.exceededTransferLimit === true) return null;
  const feicoes = (d.features ?? []) as { attributes: Record<string, string | null> }[];
  return feicoes.map((f) => ({
    iq: (f.attributes.TRDSIQ ?? "").trim(),
    rua: (f.attributes.DESCRICAO ?? "").trim(),
    numero: (f.attributes.NUMERO ?? "").trim(),
  }));
}

/**
 * Desce o trie até a partição caber, e devolve as linhas.
 *
 * A conferência é dupla: a soma dos filhos tem de bater com a contagem do pai
 * (senão existe um caractere fora do alfabeto), e a folha tem de devolver
 * exatamente o que a contagem prometeu (senão houve truncamento).
 */
async function colher(prefixo: string, esperado: number, saida: Endereco[]): Promise<void> {
  if (esperado === 0) return;

  if (esperado <= TETO) {
    const linhas = await baixar(prefixo);
    if (linhas !== null && linhas.length === esperado) {
      saida.push(...linhas);
      console.log(
        `  '${prefixo}%' → ${linhas.length.toLocaleString("pt-BR")}` +
          `  (total ${saida.length.toLocaleString("pt-BR")})`,
      );
      return;
    }
    // Não aceita a perda: se veio menos do que a contagem prometeu, o serviço
    // truncou e a resposta certa é dividir mais, não confiar.
    console.warn(
      `  ! '${prefixo}%' prometeu ${esperado} e devolveu ${linhas?.length ?? "truncado"} — dividindo`,
    );
  }

  // O prefixo pode ser um TRDSIQ inteiro (nenhum filho o cobre): pega-o à parte.
  const exatos = await consultar({
    where: `${FILTRO} AND TRDSIQ = '${prefixo}'`,
    returnCountOnly: "true",
  });
  const nExatos = Number(exatos.count ?? 0);
  if (nExatos > 0) {
    const d = await consultar({
      where: `${FILTRO} AND TRDSIQ = '${prefixo}'`,
      outFields: "TRDSIQ,DESCRICAO,NUMERO",
      returnGeometry: "false",
    });
    const feicoes = (d.features ?? []) as { attributes: Record<string, string | null> }[];
    for (const f of feicoes) {
      saida.push({
        iq: (f.attributes.TRDSIQ ?? "").trim(),
        rua: (f.attributes.DESCRICAO ?? "").trim(),
        numero: (f.attributes.NUMERO ?? "").trim(),
      });
    }
  }

  let soma = nExatos;
  const filhos: [string, number][] = [];
  for (const c of ALFABETO) {
    const n = await contar(prefixo + c);
    soma += n;
    if (n > 0) filhos.push([prefixo + c, n]);
  }
  if (soma !== esperado) {
    // Um caractere fora de `0-9` e `-` no meio do TRDSIQ. Nunca aconteceu na
    // medição, mas se acontecer o script tem de gritar, não perder linha calado.
    console.warn(`  ! '${prefixo}%' soma ${soma} ≠ contagem ${esperado} — caractere inesperado`);
  }
  for (const [p, n] of filhos) await colher(p, n, saida);
}

// ── junção com a base ───────────────────────────────────────────────────────

/** Número de porta de verdade: tem algum dígito que não seja zero. */
const temNumero = (n: string): boolean => n.length > 0 && /[1-9]/.test(n);

/** Comparação de rua tolerante a acento e espaço duplo — nada além disso. */
const normal = (s: string): string =>
  s
    .normalize("NFD")
    // `\p{M}` diz o que faz melhor que o intervalo ̀-ͯ — e o Biome
    // acusa a classe por caractere de enganosa.
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

interface BaseLotes {
  ruas: string[];
  bairros: string[];
  rows: (string | number)[][];
  [k: string]: unknown;
}

async function main() {
  let enderecos: Endereco[] = [];

  if (USAR_CACHE && existsSync(CACHE_FILE)) {
    enderecos = readFileSync(CACHE_FILE, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Endereco);
    console.log(`cache: ${enderecos.length.toLocaleString("pt-BR")} endereços`);
  } else {
    const total = await contar("");
    console.log(`endereços com número na tabela: ${total.toLocaleString("pt-BR")}`);
    await colher("", total, enderecos);
    if (enderecos.length !== total) {
      throw new Error(`colheita incompleta: ${enderecos.length} de ${total}`);
    }
    writeFileSync(CACHE_FILE, `${enderecos.map((e) => JSON.stringify(e)).join("\n")}\n`);
    console.log(
      `colheita: ${enderecos.length.toLocaleString("pt-BR")} linhas em ${requisicoes} requisições`,
    );
  }

  // Um conjunto por lote, sem repetição — a tabela vem dobrada, e o mesmo
  // endereço aparece duas vezes por motivo de join, não por ser dois endereços.
  const porLote = new Map<string, Map<string, Endereco>>();
  for (const e of enderecos) {
    if (!e.iq || !e.rua || !temNumero(e.numero)) continue;
    const chave = `${normal(e.rua)}|${e.numero}`;
    const m = porLote.get(e.iq) ?? new Map<string, Endereco>();
    if (!m.has(chave)) m.set(chave, e);
    porLote.set(e.iq, m);
  }
  console.log(`lotes com endereço na tabela: ${porLote.size.toLocaleString("pt-BR")}`);

  const base = JSON.parse(readFileSync(BASE, "utf8")) as BaseLotes;
  const ruas = base.ruas;
  const indiceRua = new Map(ruas.map((r, i) => [normal(r), i]));
  const idxRua = (nome: string): number => {
    const k = normal(nome);
    const j = indiceRua.get(k);
    if (j !== undefined) return j;
    const novo = ruas.length;
    ruas.push(nome);
    indiceRua.set(k, novo);
    return novo;
  };

  let ganharamNumero = 0;
  let comConjunto = 0;
  let semIq = 0;
  let jaTinha = 0;
  let ruaNova = 0;

  for (const r of base.rows) {
    const iq = String(r[1] ?? "");
    if (!iq) {
      semIq++;
      continue;
    }
    const achados = porLote.get(iq);
    if (!achados) continue;

    // Ordem estável: rua, depois número como número (para 9 vir antes de 81).
    const lista = [...achados.values()].sort(
      (a, b) =>
        normal(a.rua).localeCompare(normal(b.rua)) ||
        (Number.parseInt(a.numero, 10) || 0) - (Number.parseInt(b.numero, 10) || 0) ||
        a.numero.localeCompare(b.numero),
    );

    const ruaAtual = typeof r[2] === "number" && r[2] >= 0 ? ruas[r[2]] : "";
    const numeroAtual = String(r[3] ?? "");
    let coube = false;

    if (temNumero(numeroAtual)) {
      jaTinha++;
      // O que a base já diz conta como um dos endereços do conjunto.
      coube = lista.some((e) => normal(e.rua) === normal(ruaAtual) && e.numero === numeroAtual);
    } else {
      // Só sobe para `numero` o endereço da MESMA rua; lote sem rua aceita a
      // rua que vier junto com o número.
      const cand = lista.find((e) => !ruaAtual || normal(e.rua) === normal(ruaAtual));
      if (cand) {
        r[3] = cand.numero;
        if (!ruaAtual) {
          r[2] = idxRua(cand.rua);
          ruaNova++;
        }
        ganharamNumero++;
        coube = lista.length === 1;
      }
    }

    if (lista.length > 1 || !coube) {
      r[9] = lista.map((e) => `${e.rua}, ${e.numero}`).join(";");
      comConjunto++;
    }
  }

  // Linha posicional de tamanho fixo: quem não tem conjunto leva "" no décimo
  // campo. O seeder aceita a linha curta (arquivo antigo), mas gerar torto seria
  // deixar a armadilha montada.
  for (const r of base.rows) if (r.length < 10) r[9] = "";

  base.ruas = ruas;
  // `generatedAt` NÃO muda: ele é a data em que a camada de LOTES foi extraída,
  // e continua verdadeira. A colheita de endereços tem a data dela, no bloco
  // abaixo — sobrescrever uma com a outra apagaria informação.
  base.enderecos = {
    fonte: `${TABELA} (GEO.CONSULTA_ENDERECO)`,
    colhidoEm: new Date().toISOString().slice(0, 10),
    linhas: enderecos.length,
  };
  writeFileSync(BASE, JSON.stringify(base));

  console.log(
    [
      `lotes: ${base.rows.length.toLocaleString("pt-BR")}`,
      `ganharam número: ${ganharamNumero.toLocaleString("pt-BR")}`,
      `já tinham: ${jaTinha.toLocaleString("pt-BR")}`,
      `com conjunto de endereços: ${comConjunto.toLocaleString("pt-BR")}`,
      `rua preenchida do zero: ${ruaNova}`,
      `sem iq (não dá para casar): ${semIq}`,
    ].join(" · "),
  );
}

main();
