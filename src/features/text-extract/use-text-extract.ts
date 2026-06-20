import { useMemo, useState } from "react";
import { extractText, textStats } from "./extract";

export function useTextExtract() {
  const [text, setText] = useState("");
  const extractions = useMemo(() => extractText(text), [text]);
  const stats = useMemo(() => textStats(text), [text]);
  return { text, setText, extractions, stats };
}
