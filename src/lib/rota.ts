/**
 * A URL como endereço de verdade — e como coisa que se compartilha.
 *
 * ── O QUE HAVIA ANTES ───────────────────────────────────────────────────────
 * Nada. Aba e painel viviam só em `useState`, então a URL era sempre a raiz:
 * abrir o gerenciamento de usuários, a Geolocalização ou a Biblioteca dava
 * exatamente o mesmo endereço. Três consequências, e a terceira é a pior:
 *   1. não dava para MANDAR uma tela para alguém;
 *   2. F5 sempre voltava para o Decodificador;
 *   3. o botão VOLTAR do navegador saía do app inteiro, porque para o
 *      navegador nunca tinha havido navegação nenhuma.
 *
 * ── POR QUE CAMINHO, E NÃO HASH ─────────────────────────────────────────────
 * O `nginx.conf` já serve a SPA com `try_files $uri $uri/ /index.html`, então
 * `/geolocalizacao` chega no app em vez de dar 404. O hash seria a escolha de
 * quem não pode mexer no servidor; aqui ele só deixaria a URL mais feia.
 *
 * ── POR QUE OS APELIDOS SÃO EM PORTUGUÊS ────────────────────────────────────
 * Os ids das abas são de código (`decoder`, `text`, `positions`), e ninguém
 * lê código numa mensagem de WhatsApp. A URL é o artefato que a pessoa manda
 * para a equipe, e `…/geolocalizacao` diz o que é sem abrir. O mapa custa vinte
 * linhas e não muda o resto do app.
 */

/** As abas da bancada. Espelha `TabId` do `App` — o teste prende as duas juntas. */
export type RotaAba =
  | "decoder"
  | "arquivo"
  | "text"
  | "positions"
  | "matrix"
  | "diff"
  | "anagram"
  | "fonts"
  | "reference"
  | "geo"
  | "triangulate"
  | "postes"
  | "library"
  | "fleet";

/** Os painéis que substituem a bancada inteira. */
export type RotaPainel = "app" | "help" | "roadmap" | "admin";

/**
 * O Decodificador é a raiz, e não `/decodificador`.
 *
 * Quem abre o endereço sem caminho nenhum tem de cair na bancada — e a bancada
 * não pode ter dois endereços, senão o link que a pessoa manda depende de por
 * onde ela passou.
 */
const ABA_PADRAO: RotaAba = "decoder";

const ABAS: Record<RotaAba, string> = {
  decoder: "decodificador",
  arquivo: "arquivo",
  text: "texto",
  positions: "posicoes",
  matrix: "matriz",
  diff: "diferencas",
  anagram: "anagramas",
  fonts: "fontes",
  reference: "cola",
  geo: "geolocalizacao",
  triangulate: "triangulacao",
  postes: "postes",
  library: "biblioteca",
  fleet: "frota",
};

const PAINEIS: Record<Exclude<RotaPainel, "app">, string> = {
  help: "ajuda",
  roadmap: "roadmap",
  admin: "usuarios",
};

export interface Rota {
  painel: RotaPainel;
  aba: RotaAba;
}

const porApelido = <T extends string>(mapa: Record<T, string>, apelido: string): T | null =>
  (Object.entries(mapa) as [T, string][]).find(([, s]) => s === apelido)?.[0] ?? null;

/**
 * Caminho → rota. Caminho desconhecido cai na bancada, sem erro na cara de
 * ninguém: link velho ou digitado errado ainda leva a algum lugar útil.
 */
export function lerCaminho(caminho: string): Rota {
  const apelido = caminho.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!apelido) return { painel: "app", aba: ABA_PADRAO };

  const painel = porApelido(PAINEIS, apelido);
  if (painel) return { painel, aba: ABA_PADRAO };

  const aba = porApelido(ABAS, apelido);
  return aba ? { painel: "app", aba } : { painel: "app", aba: ABA_PADRAO };
}

/** Rota → caminho. O painel manda: ele cobre a bancada inteira. */
export function escreverCaminho({ painel, aba }: Rota): string {
  if (painel !== "app") return `/${PAINEIS[painel]}`;
  return aba === ABA_PADRAO ? "/" : `/${ABAS[aba]}`;
}

/** Só para a Ajuda e para o teste: o apelido público de cada aba. */
export const APELIDOS_DE_ABA = ABAS;
export const APELIDOS_DE_PAINEL = PAINEIS;
