import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCallback, useMemo, useState } from "react";
import { type DiffSide, buildStrips, diffWords } from "./diff";

/**
 * Acima de 300 ms porque o LCS é O(n·m) e roda no thread da interface: dois
 * documentos colados inteiros não podem recalcular a cada tecla.
 */
export const DEBOUNCE_MS = 320;

export function useDiff() {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  /** Bronquinha pede a letra da FONTE (a que corrige); o padrão nasce nela. */
  const [lettersSide, setLettersSide] = useState<DiffSide>("b");
  /** Lições de Mãe conta as letras do trecho ALTERADO; o padrão nasce nela. */
  const [countsSide, setCountsSide] = useState<DiffSide>("a");

  const debouncedA = useDebouncedValue(textA, DEBOUNCE_MS);
  const debouncedB = useDebouncedValue(textB, DEBOUNCE_MS);

  const ready = debouncedA.trim() !== "" && debouncedB.trim() !== "";

  const result = useMemo(
    () => (ready ? diffWords(debouncedA, debouncedB) : null),
    [ready, debouncedA, debouncedB],
  );

  const strips = useMemo(
    () => (result ? buildStrips(result, lettersSide, countsSide) : null),
    [result, lettersSide, countsSide],
  );

  const swap = useCallback(() => {
    setTextA(textB);
    setTextB(textA);
  }, [textA, textB]);

  return {
    textA,
    setTextA,
    textB,
    setTextB,
    /** O texto exibido é o que já foi comparado — nunca o que está sendo digitado. */
    comparedA: debouncedA,
    comparedB: debouncedB,
    /** Digitou e o debounce ainda não virou: a tela avisa em vez de mentir. */
    pending: debouncedA !== textA || debouncedB !== textB,
    result,
    strips,
    lettersSide,
    setLettersSide,
    countsSide,
    setCountsSide,
    swap,
  };
}
