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
  /**
   * A cifra isolada, quando há uma. É o ATALHO que o dono pediu: mandar o link
   * de uma cifra específica, não de um resultado.
   *
   * O apelido é o próprio `id` do decoder, e isso é decisão, não preguiça: são
   * 117 decoders, um mapa de apelidos escrito à mão divergiria da lista real na
   * primeira cifra nova — e foi assim que a Cola ficou com dez formatos
   * enquanto a fonte tinha 26. Medido: os 117 ids já casam com
   * `^[a-z0-9][a-z0-9-]*$` e nenhum se repete, então eles JÁ SÃO apelidos de
   * URL, e são legíveis o bastante (`base64`, `atbash`, `vigenere`, `morse`).
   *
   * Quem valida se a cifra existe é quem tem o registro na mão — este módulo
   * fica puro de propósito, para não arrastar o grafo inteiro de decoders (e o
   * `import.meta.glob`, que só roda no Vite) para dentro do roteamento.
   */
  cifra?: string;
}

/** Prefixo do atalho de cifra. Fora dos apelidos de aba, então não colide. */
const PREFIXO_CIFRA = "cifra";

const porApelido = <T extends string>(mapa: Record<T, string>, apelido: string): T | null =>
  (Object.entries(mapa) as [T, string][]).find(([, s]) => s === apelido)?.[0] ?? null;

/**
 * Caminho → rota. Caminho desconhecido cai na bancada, sem erro na cara de
 * ninguém: link velho ou digitado errado ainda leva a algum lugar útil.
 */
export function lerCaminho(caminho: string): Rota {
  const apelido = caminho.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!apelido) return { painel: "app", aba: ABA_PADRAO };

  // `/cifra/base64` → a bancada com o Base64 isolado. O id vem cru; quem
  // confere se ele existe é o `App`, que tem o registro.
  const partes = apelido.split("/").filter(Boolean);
  if (partes[0] === PREFIXO_CIFRA) {
    const id = partes[1];
    return id ? { painel: "app", aba: ABA_PADRAO, cifra: id } : { painel: "app", aba: ABA_PADRAO };
  }
  if (partes.length > 1) return { painel: "app", aba: ABA_PADRAO };

  const painel = porApelido(PAINEIS, apelido);
  if (painel) return { painel, aba: ABA_PADRAO };

  const aba = porApelido(ABAS, apelido);
  return aba ? { painel: "app", aba } : { painel: "app", aba: ABA_PADRAO };
}

/** Rota → caminho. O painel manda: ele cobre a bancada inteira. */
export function escreverCaminho({ painel, aba, cifra }: Rota): string {
  if (painel !== "app") return `/${PAINEIS[painel]}`;
  if (cifra) return `/${PREFIXO_CIFRA}/${cifra}`;
  return aba === ABA_PADRAO ? "/" : `/${ABAS[aba]}`;
}

/** Só para a Ajuda e para o teste: o apelido público de cada aba. */
export const APELIDOS_DE_ABA = ABAS;
export const APELIDOS_DE_PAINEL = PAINEIS;
