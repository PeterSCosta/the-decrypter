import { apiFetch } from "@/lib/api";
import type { Poste } from "./types";

export interface Caixa {
  sul: number;
  norte: number;
  oeste: number;
  leste: number;
}

export interface RespostaCaixa {
  total: number;
  /** O teto do servidor foi atingido: há mais postes na área do que os devolvidos. */
  truncado: boolean;
  message: string | null;
  hits: Poste[];
}

export const buscarPostes = (q: string, limit = 50) =>
  apiFetch<{ total: number; hits: Poste[] }>(
    `/postes/search?q=${encodeURIComponent(q)}&limit=${limit}`,
  );

export const postePorPlaqueta = (plaqueta: string) =>
  apiFetch<Poste>(`/postes/${encodeURIComponent(plaqueta)}`);

export const postesProximos = (lat: number, lng: number, limit = 20) =>
  apiFetch<{ total: number; hits: Poste[] }>(`/postes/near?lat=${lat}&lng=${lng}&limit=${limit}`);

/**
 * Postes dentro da caixa visível. É assim que o mapa carrega — 45 mil
 * marcadores de uma vez travam o navegador, então quem manda é o viewport.
 */
export const postesNaCaixa = (c: Caixa, limit = 2000) =>
  apiFetch<RespostaCaixa>(
    `/postes/bbox?sul=${c.sul}&norte=${c.norte}&oeste=${c.oeste}&leste=${c.leste}&limit=${limit}`,
  );
