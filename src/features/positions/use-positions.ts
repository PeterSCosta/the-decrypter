import { useMemo, useState } from "react";
import {
  type CountMode,
  countUnits,
  extractFromUnits,
  parsePositions,
  stepPositions,
} from "./extract";
import { constIndex, pairIndex, parseIndexSpecs, zipIndex } from "./zip";

/**
 * `step` e `list` leem UM texto em N posições. `zip` e `const` leem N FONTES —
 * uma por linha — que é o formato de 13 das 15 provas de "letra por posição" do
 * acervo (6 imperadores × 6 índices → LOUROS).
 */
export type PositionMode = CountMode | "zip" | "const";

export function usePositions() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<PositionMode>("step");
  const [step, setStep] = useState("7");
  const [list, setList] = useState("");
  const [onlyLetters, setOnlyLetters] = useState(true);

  const units = useMemo(() => countUnits(text, onlyLetters), [text, onlyLetters]);

  const positions = useMemo(
    () =>
      mode === "step"
        ? stepPositions(Number(step), units.length)
        : mode === "list"
          ? parsePositions(list)
          : [],
    [mode, step, list, units.length],
  );

  const result = useMemo(() => extractFromUnits(units, positions), [units, positions]);

  /** As fontes do modo N-fontes: uma por linha, ignorando linhas em branco. */
  const sources = useMemo(
    () =>
      text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    [text],
  );

  const zipResult = useMemo(() => {
    if (mode !== "zip" && mode !== "const") return null;
    const specs = parseIndexSpecs(list);
    if (!specs || specs.length === 0 || sources.length === 0) return null;

    // "A3L6" e afins dizem de QUAL fonte tirar a letra — aí não é zip nem
    // índice constante, é endereçamento explícito.
    if (specs.some((s) => s.source != null)) return pairIndex(sources, specs, onlyLetters);
    if (mode === "const") {
      const first = specs[0];
      return constIndex(sources, first.position, first.fromEnd, onlyLetters);
    }
    return zipIndex(
      sources,
      specs.map((s) => (s.fromEnd ? -s.position : s.position)),
      onlyLetters,
    );
  }, [mode, list, sources, onlyLetters]);

  return {
    text,
    setText,
    mode,
    setMode,
    step,
    setStep,
    list,
    setList,
    onlyLetters,
    setOnlyLetters,
    positions,
    result,
    sources,
    zipResult,
  };
}
