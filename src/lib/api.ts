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
/**
 * Guarda em memória, e ela não é enfeite.
 *
 * O `catch` do `localStorage` prometia no comentário que "a sessão vale só
 * enquanto a aba estiver aberta" — e não valia nada: sem lugar nenhum para
 * guardar, `getToken` devolvia null no instante seguinte ao login, e em modo
 * privado a pessoa era deslogada sem entender por quê. A promessa agora tem
 * quem a cumpra.
 */
let tokenEmMemoria: string | null = null;

export function getToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN) ?? tokenEmMemoria;
  } catch {
    return tokenEmMemoria; // modo privado / storage bloqueado
  }
}

export function setToken(token: string | null): void {
  tokenEmMemoria = token;
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // Storage indisponível: sobra a guarda em memória acima, e a sessão
    // realmente dura enquanto a aba estiver aberta.
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
  // `FormData` fica de fora: o navegador precisa escrever o `Content-Type` com o
  // boundary do multipart, e defini-lo à mão aqui quebraria o upload EM
  // SILÊNCIO — o servidor receberia um corpo que não sabe separar em campos, e
  // devolveria "mande um arquivo" para quem mandou um.
  const ehFormulario = init.body instanceof FormData;
  if (init.body && !ehFormulario && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(api(path), { ...init, headers });

  if (res.status === 401) {
    // NEM TODO 401 É SESSÃO EXPIRADA — e tratar todos como se fossem apagava a
    // resposta do servidor na única tela onde ela importa. Quem errava a senha
    // no login lia "Sessão expirada. Entre de novo." numa tela em que nunca
    // houve sessão, e o "E-mail ou senha inválidos." do backend morria aqui.
    //
    // O que separa os dois casos é ter mandado token: com token, o 401 é a
    // sessão caindo e a árvore precisa saber; sem token, é a própria resposta do
    // login, e ela vai inteira para a tela.
    const corpo = (await res.json().catch(() => null)) as { message?: string } | null;
    if (token) {
      setToken(null);
      for (const cb of ouvintes401) cb();
    }
    throw new ApiError(
      401,
      corpo?.message ?? (token ? "Sessão expirada. Entre de novo." : "Credenciais inválidas."),
    );
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
