import { type WordLang, loadWords } from "@/lib/data";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useEffect, useMemo, useState } from "react";
import { anagramKey, buildIndex, solveAnagram } from "./solve";

export type AnagramLang = "pt" | "en" | "both";

const langsOf = (lang: AnagramLang): WordLang[] => (lang === "both" ? ["pt", "en"] : [lang]);

export function useAnagram() {
  const [input, setInput] = useState("");
  const [lang, setLang] = useState<AnagramLang>("pt");
  const [indexes, setIndexes] = useState<Partial<Record<WordLang, Map<string, string[]>>>>({});
  const [loading, setLoading] = useState(false);

  const debInput = useDebouncedValue(input, 200);

  // Carrega e indexa os idiomas necessários (uma vez cada, em cache).
  useEffect(() => {
    const missing = langsOf(lang).filter((l) => !indexes[l]);
    if (missing.length === 0) return;
    let alive = true;
    setLoading(true);
    Promise.all(missing.map((l) => loadWords(l).then((w) => [l, buildIndex(w)] as const)))
      .then((pairs) => {
        if (!alive) return;
        setIndexes((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [lang, indexes]);

  const ready = langsOf(lang).every((l) => indexes[l]);

  const results = useMemo(() => {
    if (!debInput.trim()) return [];
    const set = new Set<string>();
    for (const l of langsOf(lang)) {
      const idx = indexes[l];
      if (idx) for (const w of solveAnagram(idx, debInput)) set.add(w);
    }
    const self = debInput.trim().toLowerCase();
    return [...set]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .filter((w) => w !== self || set.size === 1);
  }, [debInput, lang, indexes]);

  return {
    input,
    setInput,
    lang,
    setLang,
    results,
    loading: loading && !ready,
    letterCount: anagramKey(debInput).length,
  };
}
