import { useMemo, useState } from "react";
import { countSeries, countsToLetters } from "./counts";
import { extractText, textStats } from "./extract";

export function useTextExtract() {
  const [text, setText] = useState("");
  /** Caractere a contar — opcional; só a contagem "por caractere" depende dele. */
  const [countChar, setCountChar] = useState("");

  const extractions = useMemo(() => extractText(text), [text]);
  const stats = useMemo(() => textStats(text), [text]);

  // A leitura A1Z26 vem junto porque, no acervo, a contagem quase nunca é a
  // resposta: ela é o número que a próxima camada consome.
  const series = useMemo(
    () =>
      countSeries(text, countChar).map((s) => ({
        ...s,
        raw: s.counts.join(" "),
        letters: countsToLetters(s.counts),
      })),
    [text, countChar],
  );

  return { text, setText, countChar, setCountChar, extractions, stats, series };
}
