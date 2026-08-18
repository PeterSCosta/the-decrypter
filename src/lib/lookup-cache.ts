import type { Poste } from "@/features/poste/types";
import { apiFetch } from "./api";

/** O que `/api/lookup?q=` devolve — só as chaves que a forma da entrada pediu. */
export interface LookupHits {
  q: string;
  cep?: {
    code: string;
    logradouro: string | null;
    bairro: string | null;
    localidade: string | null;
    uf: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  cepsPrefixo?: LookupHits["cep"][] | null;
  /** Busca com curinga: `total` é a contagem real, `hits` vem limitado. */
  cepCuringa?: { total: number; hits: NonNullable<LookupHits["cep"]>[] } | null;
  municipio?: { codigoIbge: number; nome: string; uf: string } | null;
  aeroporto?: {
    iata: string | null;
    icao: string | null;
    nome: string | null;
    cidade: string | null;
    pais: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  poste?: Poste | null;
  postes?: Poste[] | null;
  /** CID-10 por código exato; `cids` é a busca pelo nome da doença. */
  cid?: Cid | null;
  cids?: Cid[] | null;
  /** Lote do cadastro imobiliário de Blumenau. */
  lote?: LoteBlumenau | null;
}

/**
 * Um lote de Blumenau. A coordenada é o CENTROIDE do terreno, não a porta — a
 * diferença é de metros, mas quem for até lá precisa saber.
 */
export interface LoteBlumenau {
  inscricao: string | null;
  iq: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  lat: number | null;
  lng: number | null;
  areaM2: number | null;
}

/** Um código da CID-10, como a API o devolve. `codigo` vem sem o ponto. */
export interface Cid {
  codigo: string;
  descricao: string;
  capitulo: number;
  capituloDesc: string;
  grupoDesc: string | null;
  classif: string | null;
  sexo: string | null;
  naoObito: boolean;
}

const MAX = 200;
/** LRU simples: o `Map` do JS preserva a ordem de inserção. */
const cache = new Map<string, Promise<LookupHits>>();
/** Em voo, para cancelar quando a consulta é superada. */
const emVoo = new Map<string, AbortController>();

/**
 * Portão grosseiro de custo — **só isso**, no cliente.
 *
 * Qual dataset consultar é decisão do servidor (`LookupShape`): manter a mesma
 * regra escrita nos dois lados é o caminho curto para elas divergirem. Aqui só
 * evitamos perguntar o que obviamente não é identificador nenhum.
 */
export function valeConsultar(entrada: string): boolean {
  const t = entrada.trim();
  if (t.length === 0 || t.length > 64) return false;
  if (t.includes("\n")) return false;
  return /[a-z0-9]/i.test(t);
}

/**
 * Consulta com dedupe e cache.
 *
 * **Rejeição nunca é memoizada** — a mesma disciplina do `loadOnce` em
 * `data.ts`, cujo comentário conta que um 502 de dois segundos durante o deploy
 * desligava um dataset pela sessão inteira. Aqui a regra pesa mais: um erro
 * memoizado congelaria a consulta daquela entrada até a pessoa mudar o texto.
 */
export function consultar(entrada: string): Promise<LookupHits> {
  const q = entrada.trim();
  const cacheado = cache.get(q);
  if (cacheado) return cacheado;

  const ctrl = new AbortController();
  emVoo.set(q, ctrl);

  const p = apiFetch<LookupHits>(`/lookup?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
    .catch((e) => {
      cache.delete(q);
      throw e;
    })
    .finally(() => {
      emVoo.delete(q);
    });

  cache.set(q, p);
  if (cache.size > MAX) {
    const maisAntiga = cache.keys().next().value;
    if (maisAntiga !== undefined) cache.delete(maisAntiga);
  }
  return p;
}

/** Cancela o que estiver em voo e não for `manter` — economiza cota e trabalho. */
export function cancelarSuperadas(manter: string): void {
  for (const [q, ctrl] of emVoo) {
    if (q !== manter.trim()) ctrl.abort();
  }
}

/** Só para os testes: zera o estado entre casos. */
export function limparCache(): void {
  cache.clear();
  emVoo.clear();
}
