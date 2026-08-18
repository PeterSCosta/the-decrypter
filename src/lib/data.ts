import type { BridgesData } from "@/features/bridge/types";
import type { PixData } from "@/features/pix/types";
import type { StreetsData } from "@/features/street-guide/types";
import type { VotacoesData } from "@/features/votacao/types";
import { apiFetch } from "./api";

/**
 * Carregadores dos datasets que ainda vivem no navegador (`/public/data`), uma
 * vez por sessão, com cache; `getX()` devolve o valor já carregado ou `null`.
 *
 * CEP, municípios e aeroportos **saíram daqui**: eram 1.075 KB gzip para responder consultas
 * por chave exata, e agora chegam pré-resolvidos pela API (`/api/lookup`). Os
 * arquivos continuam versionados em `seed-data/`, mas como fonte de seed — fora
 * de `public/`, o Vite não os copia para o `dist/` e eles não são servidos a
 * ninguém.
 *
 * As ruas ficaram: o motor as indexa e as quatro consultas de rua seguem
 * funcionando com a API fora do ar (ver o comentário em `use-decoder.ts`).
 */

/** Estado de um dataset carregado sob demanda. */
interface Slot<T> {
  promise: Promise<T> | null;
  value: T | null;
}

/**
 * Carrega uma vez, com cache — e **esquece a falha**.
 *
 * Memoizar a promessa REJEITADA era um defeito silencioso caro: um 502 de dois
 * segundos durante o próprio deploy, ou o 4G piscando no meio da gincana,
 * desligava aquele dataset pelo resto da sessão. Sem mensagem, sem nova
 * tentativa — a pessoa concluía que a bancada não sabia buscar CEP. Zerando o
 * memo no erro, a próxima chamada tenta de novo.
 *
 * O `res.ok` também não é firula: sem backend, o servidor responde a página de
 * erro com status 200, e o corpo HTML chegava a `JSON.parse` como
 * "Unexpected token '<'" — ou, pior, era fatiado em linhas e entregue ao score
 * como se fosse vocabulário (ver `engine/words.ts`).
 */
function loadOnce<T>(slot: Slot<T>, url: string, parse: (r: Response) => Promise<T>): Promise<T> {
  return loadOnceWith(slot, () =>
    fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Consulta indisponível (HTTP ${r.status}).`);
      return parse(r);
    }),
  );
}

/**
 * Mesma disciplina do `loadOnce`, para quem já traz o próprio carregador — o
 * caso do `/pix`, que passa pela API e portanto precisa do `apiFetch` (token,
 * tratamento de 401). Com `fetch` cru ele iria sem `Authorization` e voltaria
 * 401 desde que a API passou a exigir sessão.
 */
function loadOnceWith<T>(slot: Slot<T>, carregar: () => Promise<T>): Promise<T> {
  if (!slot.promise) {
    slot.promise = carregar()
      .then((d) => {
        slot.value = d;
        return d;
      })
      .catch((e) => {
        slot.promise = null; // a próxima tentativa recomeça do zero
        throw e;
      });
  }
  return slot.promise;
}

const asJson = <T>(r: Response) => r.json() as Promise<T>;

/**
 * URL de um dataset com o hash do conteúdo na query.
 *
 * É isso que deixa o nginx servir `/data/` como imutável: o arquivo só muda de
 * endereço quando o conteúdo muda. Sem o hash, a única opção honesta era
 * `expires 1d` — e o vocabulário e as bases eram rebaixados todo dia à toa.
 */
function dataUrl(nome: string): string {
  const hash = __DATA_HASHES__[nome];
  return hash ? `/data/${nome}?v=${hash}` : `/data/${nome}`;
}

const streets: Slot<StreetsData> = { promise: null, value: null };

export function loadStreets(): Promise<StreetsData> {
  return loadOnce(streets, dataUrl("streets.json"), asJson<StreetsData>);
}

export function getStreets(): StreetsData | null {
  return streets.value;
}

// Pontes, passarelas e viadutos nomeados de Blumenau (lei + OSM).
const bridges: Slot<BridgesData> = { promise: null, value: null };

export function loadBridges(): Promise<BridgesData> {
  return loadOnce(bridges, dataUrl("bridges.json"), asJson<BridgesData>);
}

export function getBridges(): BridgesData | null {
  return bridges.value;
}

// Votações de Blumenau (TSE). 10 KB — preguiçosa mesmo assim, porque a maioria
// das sessões nunca digita um número de votos.
const votacoes: Slot<VotacoesData> = { promise: null, value: null };

export function loadVotacoes(): Promise<VotacoesData> {
  return loadOnce(votacoes, dataUrl("votacoes-blumenau.json"), asJson<VotacoesData>);
}

export function getVotacoes(): VotacoesData | null {
  return votacoes.value;
}

// Participantes PIX (~900 instituições) via backend /api/pix. Carregado sob
// demanda e cacheado; indexado por ISPB no decoder. O backend já entrega no
// formato {ispb, nome, nomeReduzido, tipo}, então não há mapeamento aqui.
const pix: Slot<PixData> = { promise: null, value: null };

export function loadPix(): Promise<PixData> {
  return loadOnceWith(pix, () => apiFetch<PixData>("/pix"));
}

export function getPix(): PixData | null {
  return pix.value;
}

/**
 * Vocabulário do score, serializado (ver `engine/words-packed.ts`). Não é JSON:
 * chega como `ArrayBuffer` já dobrado e ordenado, o que tira do navegador tanto
 * o download do texto acentuado quanto o custo de dobrar em runtime.
 */
const wordIndex: Slot<ArrayBuffer> = { promise: null, value: null };

export function loadWordIndex(): Promise<ArrayBuffer> {
  return loadOnce(wordIndex, dataUrl("words-index.bin"), (r) => r.arrayBuffer());
}

export type WordLang = "pt" | "en";
const words: Record<WordLang, Slot<string[]>> = {
  pt: { promise: null, value: null },
  en: { promise: null, value: null },
};

/** Carrega a lista de palavras (uma por linha) do idioma, com cache. */
export function loadWords(lang: WordLang): Promise<string[]> {
  return loadOnce(words[lang], dataUrl(`words-${lang}.txt`), (r) =>
    r.text().then((t) => t.split("\n").filter(Boolean)),
  );
}
