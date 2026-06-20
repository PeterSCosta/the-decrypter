import { useMemo, useState } from "react";
import {
  type CountMode,
  countUnits,
  extractFromUnits,
  parsePositions,
  stepPositions,
} from "./extract";

export function usePositions() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<CountMode>("step");
  const [step, setStep] = useState("7");
  const [list, setList] = useState("");
  const [onlyLetters, setOnlyLetters] = useState(true);

  const units = useMemo(() => countUnits(text, onlyLetters), [text, onlyLetters]);

  const positions = useMemo(
    () => (mode === "step" ? stepPositions(Number(step), units.length) : parsePositions(list)),
    [mode, step, list, units.length],
  );

  const result = useMemo(() => extractFromUnits(units, positions), [units, positions]);

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
  };
}
