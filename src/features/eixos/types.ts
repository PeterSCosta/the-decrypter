/**
 * Eixos de logradouro de Blumenau — o traçado das ruas, trecho a trecho, com a
 * QUADRA de cada lado (geoportal da Prefeitura; ver `scripts/build-eixos-blumenau.ts`).
 *
 * A quadra é o prefixo de 4 grupos da inscrição imobiliária: os lotes da quadra
 * `3-4-10-3` têm IQ `3-4-10-3-<lote>`. É por isso que esta base fecha um
 * círculo com o cadastro de lotes — o mesmo número, visto pela rua em vez de
 * pelo terreno.
 */

/**
 * `[codLog, nome, lat, lng, comprimentoM, quadraDir, quadraEsq, bairroNumDir,
 *   bairroNumEsq, bairroDir, bairroEsq, cepDir, cepEsq]`
 *
 * `nome`, `quadra*`, `bairro*` e `cep*` são ÍNDICES nos dicionários homônimos;
 * `-1` significa vazio no cadastro.
 */
export type LinhaEixo = number[];

export interface EixosData {
  source: string;
  url: string;
  generatedAt: string;
  count: number;
  aviso: string;
  colunas: string[];
  nomes: string[];
  quadras: string[];
  bairros: string[];
  ceps: string[];
  rows: LinhaEixo[];
}

/**
 * Posição de cada coluna, LIDA DO CABEÇALHO do próprio arquivo.
 *
 * O arquivo é gerado por um script que pode ganhar ou reordenar colunas; se
 * estes índices fossem constantes escritas à mão, uma coluna nova no meio faria
 * a base inteira ser lida torta — lat viraria comprimento — e nada acusaria,
 * porque número continua sendo número. O cabeçalho `colunas` existe para isso.
 */
type Indices = Record<string, number>;
const cacheIdx = new WeakMap<EixosData, Indices>();

function indices(data: EixosData): Indices {
  let m = cacheIdx.get(data);
  if (!m) {
    m = {};
    data.colunas.forEach((nome, i) => {
      (m as Indices)[nome] = i;
    });
    cacheIdx.set(data, m);
  }
  return m;
}

export interface TrechoDaQuadra {
  /** Nome oficial da via no cadastro do geoportal. */
  rua: string;
  codLog: number;
  /** De que lado do eixo a quadra está — é o que o cadastro afirma. */
  lado: "direito" | "esquerdo" | "ambos";
  bairro: string;
  cep: string;
  lat: number;
  lng: number;
  comprimentoM: number;
}

export interface QuadraBlumenau {
  quadra: string;
  /** Centro aproximado, ponderado pelo comprimento dos trechos que a cercam. */
  lat: number;
  lng: number;
  bairro: string;
  ruas: string[];
  ceps: string[];
  trechos: TrechoDaQuadra[];
}

/**
 * Tem CARA de quadra: quatro grupos na grade do cadastro.
 *
 * Mora aqui, e não no hook, para o portão que BAIXA a base (197 KB gzip) e o
 * que a LÊ serem a mesma regra. Quando eram dois, o hook usava `\d{1,3}` e
 * baixava a base inteira para quem digitasse `192.168.0.1` — quatro grupos que
 * a quadra nunca teria, já que distrito e setor não passam de 9. Nenhum card
 * aparecia, então o desperdício era invisível.
 */
export const PARECE_QUADRA = /^\s*[1-9][-./\s]\d{1,2}[-./\s]\d{1,2}[-./\s]\d{1,2}\s*$/;

/**
 * Normaliza a grafia da quadra: `3.4.10.3`, `3 4 10 3`, `3/4/10/3` e
 * `03-04-10-03` viram `3-4-10-3`.
 *
 * Os zeros à esquerda caem porque o geoportal grava sem eles, e quem copia do
 * carnê (que os tem) digitaria uma chave que não existe na base — a consulta
 * falharia por formatação, não por ausência do dado.
 */
export function normalizarQuadra(bruto: string): string | null {
  const partes = bruto.trim().split(/[-./\s]+/);
  if (partes.length !== 4) return null;
  if (!partes.every((p) => /^\d{1,3}$/.test(p))) return null;
  const n = partes.map((p) => Number(p));
  // Grade real do cadastro, medida nas 917 quadras: distrito 1–6, setor 1–6,
  // subsetor 1–24, quadra 1–43. Sem esse portão, "12-25-2019-1" (uma data mal
  // digitada) entraria na busca e só a base diria não.
  if (n[0] < 1 || n[0] > 9 || n[1] < 1 || n[1] > 9) return null;
  if (n[2] < 1 || n[2] > 99 || n[3] < 1 || n[3] > 99) return null;
  return n.join("-");
}

const texto = (dic: string[], i: number): string => (i >= 0 ? (dic[i] ?? "") : "");

/**
 * Todos os trechos que margeiam uma quadra.
 *
 * Um trecho pode ter a MESMA quadra dos dois lados (a rua que corta a quadra ao
 * meio no cadastro) — daí o lado "ambos", em vez de contar o trecho duas vezes.
 */
export function porQuadra(data: EixosData | null, quadra: string): QuadraBlumenau | null {
  if (!data) return null;
  const alvo = normalizarQuadra(quadra);
  if (!alvo) return null;
  const I = indices(data);
  const idQuadra = data.quadras.indexOf(alvo);
  if (idQuadra < 0) return null;

  const trechos: TrechoDaQuadra[] = [];
  for (const r of data.rows) {
    const dir = r[I.quadraDir] === idQuadra;
    const esq = r[I.quadraEsq] === idQuadra;
    if (!dir && !esq) continue;
    const lado = dir && esq ? "ambos" : dir ? "direito" : "esquerdo";
    trechos.push({
      rua: texto(data.nomes, r[I.nome]),
      codLog: r[I.codLog],
      lado,
      // O bairro relatado é o do lado em que a quadra está — o outro lado da
      // rua pode ser outro bairro (243 trechos de divisa são assim).
      bairro: texto(data.bairros, dir ? r[I.bairroDir] : r[I.bairroEsq]),
      cep: texto(data.ceps, dir ? r[I.cepDir] : r[I.cepEsq]),
      lat: r[I.lat],
      lng: r[I.lng],
      comprimentoM: r[I.comprimentoM],
    });
  }
  if (!trechos.length) return null;

  let sl = 0;
  let sg = 0;
  let peso = 0;
  for (const t of trechos) {
    const p = Math.max(1, t.comprimentoM);
    sl += t.lat * p;
    sg += t.lng * p;
    peso += p;
  }

  const contar = (vs: string[]): string[] => [...new Set(vs.filter(Boolean))];
  const bairros = contar(trechos.map((t) => t.bairro));

  return {
    quadra: alvo,
    lat: Number((sl / peso).toFixed(5)),
    lng: Number((sg / peso).toFixed(5)),
    bairro: bairros.join(" / "),
    ruas: contar(trechos.map((t) => t.rua)).sort(),
    ceps: contar(trechos.map((t) => t.cep)).sort(),
    trechos,
  };
}
