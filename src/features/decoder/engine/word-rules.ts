import { stripDiacritics } from "./util";

/**
 * As regras do vocabulário do score, **puras e sem dependência de rede** — é o
 * que permite o `scripts/build-words.ts` gerar o índice compactado usando
 * exatamente o mesmo código que o navegador usava para montar o `Set`. Sem esse
 * compartilhamento, a dobra do build e a do runtime divergiriam em silêncio e o
 * realce de palavra real passaria a mentir de novo.
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
 *
 * Nota: `what3words` nunca entrou no conjunto — o filtro `^[a-z]+$` a rejeita
 * pelo dígito, e `coverage()` quebra o texto em `[^a-z]+` de qualquer forma, o
 * que a partiria em "what"/"words" antes de qualquer consulta. Fica na lista
 * como documentação do vocabulário, sem efeito.
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

/** Dobra para a forma comparável: sem acento, minúscula, só a–z. */
export function foldWord(s: string): string {
  return stripDiacritics(s).toLowerCase();
}

/**
 * Dobra, filtra e ordena as listas no conjunto que o score consulta.
 *
 * Ordenado porque o índice compactado busca por bissecção; deduplicado porque
 * pt e en compartilham milhares de palavras.
 */
export function buildVocabulary(lists: readonly (readonly string[])[]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const w of list) {
      const f = foldWord(w);
      if (f.length >= MIN_WORD_LEN && /^[a-z]+$/.test(f)) set.add(f);
    }
  }
  return [...set].sort();
}
