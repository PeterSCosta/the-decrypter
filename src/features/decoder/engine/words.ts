import { loadWordIndex } from "@/lib/data";
import { type WordLookup, decodeWordIndex } from "./words-packed";

/**
 * Vocabulário pt+en que o score usa para reconhecer que uma camada intermediária
 * caiu numa palavra de verdade — o "checkpoint grátis".
 *
 * pt **e** en porque as respostas do acervo caem dos dois lados — TOPO, resposta
 * da prova de abertura da GIA, só existe na lista inglesa.
 *
 * O conjunto vem pronto do build, num índice compactado (`words-packed.ts`): a
 * dobra sem acento é feita lá, não aqui. Antes, o navegador baixava 1,5 MB gzip
 * de texto acentuado e gastava ~191 ms montando um `Set` de 451 mil strings só
 * para jogar o acento fora. As regras que definem o conjunto moram em
 * `word-rules.ts`, compartilhadas com o script de build.
 */

export { MIN_WORD_LEN, PUZZLE_WORDS, foldWord } from "./word-rules";

let promise: Promise<WordLookup> | null = null;
let cache: WordLookup | null = null;

/** Carrega o vocabulário (uma vez). Idempotente e cacheado. */
export function loadWordLookup(): Promise<WordLookup> {
  if (!promise) {
    promise = loadWordIndex()
      .then((buffer) => {
        const lookup = new Set(decodeWordIndex(buffer));
        cache = lookup;
        return lookup;
      })
      .catch((e) => {
        promise = null; // mesma disciplina do `loadOnce`: falha não é memoizada
        throw e;
      });
  }
  return promise;
}

/** Acesso síncrono; `null` até a primeira carga resolver. */
export function getWordLookup(): WordLookup | null {
  return cache;
}
