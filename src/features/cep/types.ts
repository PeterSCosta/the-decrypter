/** Compact row tuple: [cep, logradouro, localidade, municipioIdx, lat, lng] */
export type CepRow = [
  cep: string,
  logradouro: string,
  localidade: string,
  municipioIdx: number,
  lat: number | null,
  lng: number | null,
];

export interface CepsData {
  source: string;
  generatedAt: string;
  count: number;
  municipios: string[];
  rows: CepRow[];
}

/**
 * O que o card do curinga precisa e o `CepHit[]` sozinho não carrega: o PADRÃO
 * (para pedir o arquivo) e o TOTAL real (para dizer quantos o arquivo traz).
 *
 * Um payload próprio, e não campos novos no `render: "cep"`, porque aquele
 * render é compartilhado por três decoders — mudar a forma de `data` lá quebraria
 * os outros dois.
 */
export interface CepCuringaData {
  padrao: string;
  total: number;
  hits: CepHit[];
}

export interface CepHit {
  cep: string;
  logradouro: string;
  localidade: string;
  municipio: string;
  lat: number | null;
  lng: number | null;
}

export function toHit(row: CepRow, municipios: string[]): CepHit {
  return {
    cep: row[0],
    logradouro: row[1],
    localidade: row[2],
    municipio: municipios[row[3]] ?? "",
    lat: row[4],
    lng: row[5],
  };
}

/** "88010000" → "88010-000" */
export function formatCep(cep: string): string {
  return cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
}

// Índice CEP(8 dígitos) → linhas, lazy e cacheado por dataset. Substitui o scan
// O(n) que cep-exact/cep-sc-prefix/location faziam em `rows` a cada tecla.
const codeIndexCache = new WeakMap<CepsData, Map<string, CepRow[]>>();
export function cepByCode(data: CepsData): Map<string, CepRow[]> {
  let m = codeIndexCache.get(data);
  if (!m) {
    m = new Map<string, CepRow[]>();
    for (const r of data.rows) {
      const list = m.get(r[0]);
      if (list) list.push(r);
      else m.set(r[0], [r]);
    }
    codeIndexCache.set(data, m);
  }
  return m;
}
