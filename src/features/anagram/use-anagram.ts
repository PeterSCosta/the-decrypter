import { type WordLang, loadStreets, loadWords } from "@/lib/data";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AnagramIndex,
  MAX_INPUT_LETTERS,
  MAX_LEFTOVER,
  type SolveResult,
  anagramKey,
  buildIndex,
  mergeHits,
  solveAll,
} from "./solve";
import { streetVocabulary } from "./sources";

/** Fonte do dicionário. "ruas" = bairros e logradouros de Blumenau. */
export type AnagramSource = "pt" | "en" | "both" | "ruas";

type IndexId = WordLang | "ruas";

/** Menor entrada que pode virar par: 2 + 3 letras (2 + 2 é ruído e o solve recusa). */
export const MIN_PAIR_LETTERS = 5;

const idsOf = (source: AnagramSource): IndexId[] => (source === "both" ? ["pt", "en"] : [source]);

function loadIndex(id: IndexId): Promise<AnagramIndex> {
  if (id === "ruas") return loadStreets().then((d) => buildIndex(streetVocabulary(d)));
  return loadWords(id).then(buildIndex);
}

export function useAnagram() {
  const [input, setInput] = useState("");
  const [source, setSource] = useState<AnagramSource>("pt");
  const [maxLeftover, setMaxLeftover] = useState(0);
  const [twoWords, setTwoWords] = useState(false);
  const [indexes, setIndexes] = useState<Partial<Record<IndexId, AnagramIndex>>>({});
  const [loading, setLoading] = useState(false);

  const debInput = useDebouncedValue(input, 200);

  // Carrega e indexa as fontes necessárias (uma vez cada, em cache).
  useEffect(() => {
    const missing = idsOf(source).filter((id) => !indexes[id]);
    if (missing.length === 0) return;
    let alive = true;
    setLoading(true);
    Promise.all(missing.map((id) => loadIndex(id).then((idx) => [id, idx] as const)))
      .then((pairs) => {
        if (!alive) return;
        setIndexes((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [source, indexes]);

  const ready = idsOf(source).every((id) => indexes[id]);
  const letterCount = anagramKey(debInput).length;
  const canPair = letterCount >= MIN_PAIR_LETTERS;

  const search = useCallback(
    (leftover: number, pairs: boolean): SolveResult => {
      if (!debInput.trim()) return { hits: [], truncated: false };
      const parts = idsOf(source)
        .map((id) => indexes[id])
        .filter((idx): idx is AnagramIndex => Boolean(idx))
        .map((idx) => solveAll(idx, debInput, { maxLeftover: leftover, twoWords: pairs }));
      const self = anagramKey(debInput);
      const hits = mergeHits(parts.map((p) => p.hits));
      // A própria entrada não é resposta — a não ser que seja a única coisa achada.
      const useful = hits.filter(
        (h) => !(h.words.length === 1 && h.leftover === "" && anagramKey(h.words[0]) === self),
      );
      return {
        hits: useful.length > 0 ? useful : hits,
        truncated: parts.some((p) => p.truncated),
      };
    },
    [debInput, source, indexes],
  );

  const { hits: results, truncated } = useMemo(
    () => search(maxLeftover, twoWords && canPair),
    [search, maxLeftover, twoWords, canPair],
  );

  // Sem resultado com os portões fechados, mede se afrouxá-los acharia algo —
  // é o único jeito de a busca relaxada ser descoberta sem poluir o padrão.
  const relaxedCount = useMemo(() => {
    if (results.length > 0 || letterCount < 2) return 0;
    if (maxLeftover >= MAX_LEFTOVER && (twoWords || !canPair)) return 0;
    return search(MAX_LEFTOVER, canPair).hits.length;
  }, [results.length, letterCount, maxLeftover, twoWords, canPair, search]);

  const relax = useCallback(() => {
    setMaxLeftover(MAX_LEFTOVER);
    setTwoWords(true);
  }, []);

  return {
    input,
    setInput,
    source,
    setSource,
    maxLeftover,
    setMaxLeftover,
    twoWords,
    setTwoWords,
    canPair,
    results,
    truncated,
    relaxedCount,
    relax,
    loading: loading && !ready,
    letterCount,
    tooLong: letterCount > MAX_INPUT_LETTERS,
  };
}
