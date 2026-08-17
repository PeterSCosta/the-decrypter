/**
 * Base do backend the-decrypter-api. Todas as consultas externas (BrasilAPI,
 * Open Food Facts, Nominatim, what3words) e a lista PIX passam por ele — assim
 * ganham cache (Redis) + rate-limit, e chaves (ex.: what3words) ficam no servidor.
 *
 * `VITE_API_BASE_URL` é embutida em build time (ex.: https://apiarromba.thelogiclab.com.br).
 * Vazia (dev sem a var) → caminho relativo `/api/...`.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export const api = (path: string) => `${BASE}/api${path.startsWith("/") ? path : `/${path}`}`;

const CHAVE_TOKEN = "decrypter-token";

/**
 * O token vive em `localStorage`.
 *
 * É a escolha simples, e a exposição a XSS é real — está registrada aqui em vez
 * de escondida. O que a compensa: validade curta (12 h), sem refresh token, e o
 * `Bearer` dispensa qualquer mudança de CORS (o `AllowAnyHeader` da API já
 * libera o header; cookie exigiria `AllowCredentials` dos dois lados).
 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null; // modo privado / storage bloqueado
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // storage indisponível: a sessão vale só enquanto a aba estiver aberta
  }
}

/** Avisados quando a API responde 401 — o provider derruba a sessão. */
const ouvintes401 = new Set<() => void>();

export function aoExpirarSessao(cb: () => void): () => void {
  ouvintes401.add(cb);
  return () => {
    ouvintes401.delete(cb);
  };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * `fetch` para a API: injeta o `Authorization`, entende o corpo `{message}` que
 * o backend usa em todo erro, e derruba a sessão num 401.
 *
 * Antes disto cada módulo montava o seu próprio `fetch` e lia o erro do seu
 * jeito — com o login no meio, isso viraria seis lugares para esquecer o header.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(api(path), { ...init, headers });

  if (res.status === 401) {
    setToken(null);
    for (const cb of ouvintes401) cb();
    throw new ApiError(401, "Sessão expirada. Entre de novo.");
  }
  if (!res.ok) {
    const corpo = (await res.json().catch(() => null)) as { message?: string } | null;
    // O 429 é auto-infligido e passa em menos de um minuto: merece texto próprio.
    const padrao =
      res.status === 429
        ? "Muitas consultas. Aguarde alguns segundos."
        : `Consulta indisponível (HTTP ${res.status}).`;
    throw new ApiError(res.status, corpo?.message ?? padrao);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
