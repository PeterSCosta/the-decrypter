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
