import { loadWords } from "@/lib/data";
import { stripDiacritics } from "./util";

/**
 * Conjunto pt+en de palavras reais, usado pelo score para reconhecer que uma
 * camada intermediária caiu numa palavra de verdade — o "checkpoint grátis".
 *
 * Por que aqui e não em `lib/data.ts`: as listas guardam a grafia acentuada
 * ("lápis"), e o score compara contra texto já dobrado por `stripDiacritics`.
 * Dobrar na origem é o que faz LAPIS (a resposta da prova, sem acento) casar.
 *
 * pt **e** en porque as respostas do acervo caem dos dois lados — TOPO, resposta
 * da prova de abertura da GIA, só existe na lista inglesa.
 */

/**
 * Piso de 4 letras, medido e não chutado: com 3 letras há 1.205 palavras em 26³
 * (1 em 15 — ruído puro); com 4 a densidade cai para ~1 em 123. Afrouxar isto é
 * o caminho mais curto para o ranking voltar a mentir.
 */
export const MIN_WORD_LEN = 4;

/**
 * Palavras que as gincanas usam como checkpoint e que **nenhuma** das duas
 * listas contém (verificado): nomes de sistemas, siglas e marcas que o acervo
 * emprega justamente porque resolvem para algo reconhecível.
 */
export const PUZZLE_WORDS = [
  "geotude",
  "mapcode",
  "geohash",
  "quadkey",
  "maidenhead",
  "what3words",
  "covid",
  "oscar",
  "songi",
  "furb",
  "samae",
  "siatu",
  "blumenau",
  "itajai",
  "prefeitura",
  "vigenere",
  "atbash",
  "braille",
  "polybius",
  "playfair",
  "bacon",
  "morse",
];

let promise: Promise<Set<string>> | null = null;
let cache: Set<string> | null = null;

/** Dobra para a forma comparável: sem acento, minúscula, só a–z. */
export function foldWord(s: string): string {
  return stripDiacritics(s).toLowerCase();
}

/** Carrega e indexa pt+en (uma vez). Idempotente e cacheado. */
export function loadWordSet(): Promise<Set<string>> {
  if (!promise) {
    promise = Promise.all([loadWords("pt"), loadWords("en")]).then(([pt, en]) => {
      const set = new Set<string>();
      for (const list of [pt, en, PUZZLE_WORDS]) {
        for (const w of list) {
          const f = foldWord(w);
          if (f.length >= MIN_WORD_LEN && /^[a-z]+$/.test(f)) set.add(f);
        }
      }
      cache = set;
      return set;
    });
  }
  return promise;
}

/** Acesso síncrono; `null` até a primeira carga resolver. */
export function getWordSet(): Set<string> | null {
  return cache;
}
