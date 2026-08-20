import type { Filme } from "@/features/filme/types";
import type { Poste } from "@/features/poste/types";
import { apiFetch } from "./api";

/** O que `/api/lookup?q=` devolve — só as chaves que a forma da entrada pediu. */
export interface LookupHits {
  q: string;
  /**
   * Quais consultas a forma da entrada abriu no servidor, pelos nomes crus das
   * bandeiras (`CepExato`, `RuaOuBairro`, `Filme`).
   *
   * **Vazio significa "o servidor não abriu consulta nenhuma"** — não sei
   * procurar isto —, e é isso que separa esse caso de "perguntei e não achei".
   * Sem ele os dois chegam idênticos: 200 com todas as chaves em `null`.
   *
   * **Opcional de propósito.** Ausente é um terceiro estado, e não um sinônimo
   * de vazio: quer dizer que a API em produção ainda é anterior a este campo.
   * Quem lê tem de responder "não sei dizer se houve consulta", nunca "não
   * achei" — afirmar uma busca que talvez não tenha havido é exatamente o
   * defeito que este campo existe para matar.
   */
  consultou?: string[];
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
  /** Lote do cadastro imobiliário de Blumenau, quando o número é exato. */
  lote?: LoteBlumenau | null;
  /**
   * Os candidatos, quando o número veio SEM os hífens e admite mais de um
   * agrupamento real (`41101634` = `4-1-10-16-34` ou `4-1-10-1-634`).
   */
  lotes?: LoteBlumenau[] | null;
  /**
   * Ficha de filme por ID da IMDb, vinda do Wikidata.
   *
   * É a ÚNICA chave desta resposta que sai da nossa infraestrutura, e a única
   * cuja ausência não significa "não existe": o Wikidata cobre uma fração do
   * catálogo da IMDb.
   */
  filme?: Filme | null;
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
  /**
   * O conjunto de endereços do lote, `"RUA, NÚMERO"` separados por `;`, quando
   * ele não cabe em `logradouro` + `numero` — lote de esquina, ou endereço de
   * outra rua. Nulo no caso comum, em que o número já está em `numero`.
   */
  enderecos?: string | null;
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

/**
 * Teto do cache. É FIFO, não LRU: `cache.get` não reinsere, então quem entrou
 * primeiro sai primeiro independentemente de uso. Fica assim de propósito — o
 * que importa é o teto de memória —, mas quem despacha muitos termos de uma vez
 * precisa saber: um lote grande demais expulsaria a própria cabeça.
 */
export const MAX_CACHE = 200;
const cache = new Map<string, Promise<LookupHits>>();

/**
 * Quem pediu a consulta.
 *
 * Enquanto só o Decodificador consultava, cancelar "tudo menos o atual" era
 * exatamente certo: cada tecla supera a anterior. Com a aba Lote em voo ao
 * mesmo tempo, esse mesmo cancelamento aborta o lote inteiro **a cada 300 ms**,
 * calado, e as linhas ficam sem resposta com cara de "não encontrei".
 *
 * A posse resolve isso sem estado global a mais: cada cancelamento só alcança o
 * que é seu. A alternativa — um conjunto de "protegidas" — exige alguém liberar
 * depois, e um vazamento ali desligaria o cancelamento da BANCADA pela sessão
 * inteira, que é a aba mais usada. A posse morre sozinha no `.finally`.
 */
export type Dono = "bancada" | "lote";

/**
 * Em voo, com os donos — no PLURAL, e isso não é detalhe.
 *
 * O dedupe faz o segundo pedido do mesmo termo receber a MESMA promessa. Se a
 * posse fosse gravada só no primeiro despacho, quem chegou depois herdaria o
 * cancelamento de quem chegou antes: com `89010000` em voo pelo lote, o botão
 * "na bancada" daquela linha faria o Decodificador esperar a mesma promessa, e
 * o "Parar" do lote mataria a consulta da bancada junto — sem erro, só um card
 * que não aparece.
 *
 * Com o conjunto, abortar exige que **nenhum** dono ainda queira a resposta.
 */
const emVoo = new Map<string, { ctrl: AbortController; donos: Set<Dono> }>();

/**
 * ── O LIVRO-CAIXA DE REQUISIÇÕES ───────────────────────────────────────────
 * O backend limita **120 por minuto por IP**, em janela FIXA
 * (`Program.cs`, `FixedWindowRateLimiterOptions`), e a partição é o IP — a
 * equipe inteira atrás do NAT do local divide o mesmo balde, com a bancada
 * consumindo dele a cada tecla.
 *
 * Espalhar um lote no tempo NÃO reduz o custo dele: sessenta consultas custam
 * sessenta permissões, cedo ou tarde. O que estoura o balde é o SEGUNDO lote no
 * mesmo minuto. Então em vez de um marca-passo cego, um livro-caixa: quem
 * despacha carimba a hora, e quem vai despachar consulta o saldo.
 *
 * A janela daqui é DESLIZANTE e a do servidor é FIXA. A diferença é de
 * propósito: a deslizante conta a mais, nunca a menos.
 */
const despachos: number[] = [];
const JANELA_MS = 60_000;

/** Quantas requisições saíram de verdade nos últimos 60 s, somando os donos. */
export function permissoesNaJanela(agora = Date.now()): number {
  while (despachos.length > 0 && agora - despachos[0] > JANELA_MS) despachos.shift();
  return despachos.length;
}

/**
 * Portão grosseiro de custo — **só isso**, no cliente.
 *
 * Qual dataset consultar é decisão do servidor (`LookupShape`): manter a mesma
 * regra escrita nos dois lados é o caminho curto para elas divergirem. Aqui só
 * evitamos perguntar o que obviamente não é identificador nenhum.
 */
export function valeConsultar(entrada: string): boolean {
  return motivoSemConsulta(entrada) === null;
}

/** Por que a consulta não vale a pena — `null` quando ela vale. */
export type MotivoSemConsulta = "vazio" | "lista" | "longo" | "sem-alfanumerico";

/**
 * O MESMO portão, dizendo o MOTIVO — e é por isso que ele existe.
 *
 * O `valeConsultar` devolvia só `true`/`false`, e o `use-decoder` reagia ao
 * `false` limpando os hits **em silêncio**. Na prática: colar uma lista no
 * campo principal, ou passar de 64 caracteres, **desligava todas as consultas
 * online da bancada** — CEP, município, aeroporto, poste, CID — sem um aviso.
 * Some a metade online da ferramenta e nada na tela diz que sumiu.
 *
 * É a mesma falha que o chip de "consultas indisponíveis" conserta do outro
 * lado (rede fora), e a mesma regra da casa: **nunca devolver vazio calado**.
 *
 * O motivo mora AQUI, colado à regra, e não no componente: separar os dois é o
 * caminho curto para o aviso descrever um portão que já mudou.
 */
export function motivoSemConsulta(entrada: string): MotivoSemConsulta | null {
  const t = entrada.trim();
  if (t.length === 0) return "vazio";
  // A lista vem antes do comprimento: quem colou cinco linhas curtas precisa
  // ouvir "isto é uma lista", não "o texto está longo".
  if (t.includes("\n")) return "lista";
  if (t.length > 64) return "longo";
  if (!/[a-z0-9]/i.test(t)) return "sem-alfanumerico";
  return null;
}

/**
 * Consulta com dedupe e cache.
 *
 * **Rejeição nunca é memoizada** — a mesma disciplina do `loadOnce` em
 * `data.ts`, cujo comentário conta que um 502 de dois segundos durante o deploy
 * desligava um dataset pela sessão inteira. Aqui a regra pesa mais: um erro
 * memoizado congelaria a consulta daquela entrada até a pessoa mudar o texto.
 */
export function consultar(entrada: string, dono: Dono = "bancada"): Promise<LookupHits> {
  const q = entrada.trim();
  const cacheado = cache.get(q);
  if (cacheado) {
    // Quem chega pelo cache também é dono: ver o comentário de `emVoo`.
    emVoo.get(q)?.donos.add(dono);
    return cacheado;
  }

  const ctrl = new AbortController();
  emVoo.set(q, { ctrl, donos: new Set([dono]) });
  // Só despacho REAL entra no livro-caixa: acerto de cache não gasta permissão.
  // A poda acontece aqui e não só na leitura — o único leitor de produção é o
  // lote, e numa tarde inteira de Decodificador o array cresceria sem teto.
  const agora = Date.now();
  permissoesNaJanela(agora);
  despachos.push(agora);

  const p = apiFetch<LookupHits>(`/lookup?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
    .catch((e) => {
      // GUARDA DE IDENTIDADE. O delete era incondicional, e com duas consultas
      // do mesmo termo em sequência (a segunda depois de um aborto) o `.catch`
      // da PRIMEIRA apagava a entrada da SEGUNDA — que seguia em voo, sem
      // ninguém no cache, e voltava a ser pedida do zero.
      if (cache.get(q) === p) cache.delete(q);
      throw e;
    })
    .finally(() => {
      // Mesma guarda, pelo mesmo motivo: o `.finally` da promessa velha não
      // pode tirar de `emVoo` o controller da nova, senão o "Parar" perde o
      // alcance dela e a resposta ainda pinta uma linha depois da parada.
      if (emVoo.get(q)?.ctrl === ctrl) emVoo.delete(q);
    });

  cache.set(q, p);
  if (cache.size > MAX_CACHE) {
    const maisAntiga = cache.keys().next().value;
    if (maisAntiga !== undefined) cache.delete(maisAntiga);
  }
  return p;
}

/**
 * Cancela o que estiver em voo e não estiver em `manter`.
 *
 * ── POR QUE UM CONJUNTO, E NÃO UM TERMO ────────────────────────────────────
 * Enquanto só o Decodificador consultava, "o termo atual" era mesmo UM: cada
 * tecla supera a tecla anterior, e abortar todo o resto é exatamente o certo.
 *
 * Um LOTE quebra essa premissa. Dez itens consultados juntos são dez termos
 * simultaneamente vivos, e a versão de um termo só abortaria **nove dos dez**
 * na hora em que o décimo entrasse em voo — sem erro, sem aviso: nove itens
 * simplesmente ficariam sem resposta, com cara de "não encontrei".
 *
 * O conjunto é a forma geral; um termo é o caso de tamanho um.
 */
export function cancelarSuperadasExceto(manter: ReadonlySet<string>, dono: Dono = "bancada"): void {
  for (const [q, alvo] of [...emVoo]) {
    if (!alvo.donos.has(dono) || manter.has(q)) continue;
    largar(q, alvo, dono);
  }
}

/** Aborta tudo o que for de um dono. É o único cancelamento que o lote chama. */
export function cancelarDono(dono: Dono): void {
  for (const [q, alvo] of [...emVoo]) {
    if (alvo.donos.has(dono)) largar(q, alvo, dono);
  }
}

/**
 * Um dono desiste do termo. Só aborta de fato quando **ninguém mais** o quer.
 *
 * Sem isto, o "Parar" do lote derrubaria a consulta que a bancada está fazendo
 * do mesmo texto — e o inverso, uma tecla no Decodificador derrubaria o item do
 * lote que reusou aquela promessa.
 */
function largar(q: string, alvo: { ctrl: AbortController; donos: Set<Dono> }, dono: Dono): void {
  alvo.donos.delete(dono);
  if (alvo.donos.size === 0) abortarAgora(q, alvo.ctrl);
}

/**
 * Abortar e limpar **na mesma volta**, não um microtask depois.
 *
 * `ctrl.abort()` é síncrono, mas a limpeza do cache morava no `.catch` — ou
 * seja, um microtask à frente. Nesse intervalo, `consultar(q)` devolvia a
 * promessa **já condenada** que ainda estava no mapa: "tentar de novo" não
 * tentava nada, recebia o mesmo `AbortError` e parecia falha de rede.
 */
function abortarAgora(q: string, ctrl: AbortController): void {
  emVoo.delete(q);
  cache.delete(q);
  ctrl.abort();
}

/**
 * O caso de um termo — a forma que o Decodificador usa a cada tecla.
 *
 * Fica como embrulho e não como cópia: duas implementações da mesma regra
 * divergiriam, e a que sobreviveria seria a errada (esta, que é a mais usada).
 */
export function cancelarSuperadas(manter: string, dono: Dono = "bancada"): void {
  cancelarSuperadasExceto(new Set([manter.trim()]), dono);
}

/** Só para os testes: zera o estado entre casos. */
export function limparCache(): void {
  cache.clear();
  emVoo.clear();
  despachos.length = 0;
}
