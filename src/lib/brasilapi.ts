/** Clientes das APIs públicas da BrasilAPI (grátis, sem chave, CORS liberado). */
const BASE = "https://brasilapi.com.br/api";

async function getJson<T>(path: string, notFound: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(res.status === 404 ? notFound : `Falha na consulta (HTTP ${res.status}).`);
  }
  return (await res.json()) as T;
}

export interface CnpjInfo {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  descricao_situacao_cadastral: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ddd_telefone_1: string;
  cnae_fiscal_descricao: string;
}
export const fetchCnpj = (cnpj: string) =>
  getJson<CnpjInfo>(
    `/cnpj/v1/${cnpj.replace(/\D/g, "")}`,
    "CNPJ não encontrado na base da Receita.",
  );

export interface CepInfo {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
}
export const fetchCep = (cep: string) =>
  getJson<CepInfo>(`/cep/v2/${cep.replace(/\D/g, "")}`, "CEP não encontrado.");

export interface IsbnInfo {
  title: string;
  authors: string[];
  publisher: string;
  year: number;
  isbn: string;
  synopsis?: string;
}
export const fetchIsbn = (isbn: string) =>
  getJson<IsbnInfo>(`/isbn/v1/${isbn.replace(/[^0-9Xx]/g, "")}`, "ISBN não encontrado.");

export interface NcmInfo {
  codigo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
}
export const fetchNcm = (code: string) =>
  getJson<NcmInfo>(`/ncm/v1/${code.replace(/\D/g, "")}`, "NCM não encontrado.");

export interface RegistroBrInfo {
  fqdn: string;
  status: string;
  "expires-at"?: string;
  "publication-status"?: string;
  hosts?: string[];
}
/** Consulta de domínio .br (status, expiração) — BrasilAPI Registro.br. */
export const fetchRegistroBr = (domain: string) =>
  getJson<RegistroBrInfo>(
    `/registrobr/v1/${encodeURIComponent(domain.trim().toLowerCase())}`,
    "Domínio não encontrado.",
  );
