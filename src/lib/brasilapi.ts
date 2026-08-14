/**
 * Consultas via backend the-decrypter-api (`/api/...`) — antes batiam direto no
 * BrasilAPI. O backend normaliza as respostas (camelCase) e cacheia. As interfaces
 * abaixo refletem os DTOs do backend.
 */
import { api } from "./api";

async function getJson<T>(path: string, notFound: string): Promise<T> {
  const res = await fetch(api(path));
  if (!res.ok) {
    throw new Error(res.status === 404 ? notFound : `Falha na consulta (HTTP ${res.status}).`);
  }
  try {
    return (await res.json()) as T;
  } catch {
    // Sem backend configurado, o servidor de dev responde o index.html com
    // status 200 — e o erro de parse vazava cru para o card ("Unexpected token
    // '<'"). Quem está numa gincana precisa saber que é a consulta que está
    // fora, não que digitou errado.
    throw new Error("Consulta indisponível — o serviço de dados não respondeu.");
  }
}

export interface CnpjInfo {
  cnpj: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacao: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  atividadePrincipal: string | null;
}
export const fetchCnpj = (cnpj: string) =>
  getJson<CnpjInfo>(`/cnpj/${cnpj.replace(/\D/g, "")}`, "CNPJ não encontrado na base da Receita.");

export interface CepInfo {
  cep: string;
  logradouro: string | null;
  bairro: string | null;
  localidade: string | null;
  uf: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
}
export const fetchCep = (cep: string) =>
  getJson<CepInfo>(`/cep/${cep.replace(/\D/g, "")}`, "CEP não encontrado.");

export interface IsbnInfo {
  isbn: string;
  title: string | null;
  authors: string[] | null;
  publisher: string | null;
  year: number | null;
  synopsis?: string | null;
}
export const fetchIsbn = (isbn: string) =>
  getJson<IsbnInfo>(`/isbn/${isbn.replace(/[^0-9Xx]/g, "")}`, "ISBN não encontrado.");

export interface NcmInfo {
  codigo: string;
  descricao: string | null;
}
export const fetchNcm = (code: string) =>
  getJson<NcmInfo>(`/ncm/${code.replace(/\D/g, "")}`, "NCM não encontrado.");

export interface RegistroBrInfo {
  fqdn: string;
  status: string;
  expiresAt?: string | null;
}
/** Consulta de domínio .br (status, expiração). */
export const fetchRegistroBr = (domain: string) =>
  getJson<RegistroBrInfo>(
    `/registrobr/${encodeURIComponent(domain.trim().toLowerCase())}`,
    "Domínio não encontrado.",
  );
