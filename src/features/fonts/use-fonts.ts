import { UNICODE_STYLES } from "@/features/reference/unicode-styles";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DETECTION_FALLBACKS,
  DETECTION_SAMPLE,
  type FontStatus,
  type GlyphSize,
  SAMPLE_TEXT,
  SYMBOL_FONTS,
  type WidthProbe,
  fontShorthand,
  greekToLatin,
  latinToGreek,
  looksGreek,
  statusFromProbes,
} from "./fonts";

/**
 * Mede a amostra num canvas solto (nunca entra na árvore) com a fonte candidata
 * na frente de cada fallback. Se o navegador não tem a fonte, ele desenha com o
 * fallback e as duas larguras batem — é assim que se descobre a ausência.
 *
 * Sem `document` ou sem contexto 2D (jsdom é os dois), devolve lista vazia e o
 * veredito vira "indeterminado" lá em `statusFromProbes`.
 */
export function measureProbes(family: string): WidthProbe[] {
  if (typeof document === "undefined") return [];
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = document.createElement("canvas").getContext("2d");
  } catch {
    // Canvas bloqueado (jsdom, anti-fingerprint): vira "indeterminado", não "ausente".
    return [];
  }
  if (!ctx) return [];

  const probes: WidthProbe[] = [];
  for (const fallback of DETECTION_FALLBACKS) {
    ctx.font = fontShorthand(fallback);
    const base = ctx.measureText(DETECTION_SAMPLE).width;
    ctx.font = fontShorthand(`${family}, ${fallback}`);
    probes.push({ fallback, base, withFont: ctx.measureText(DETECTION_SAMPLE).width });
  }
  return probes;
}

const INICIAL: Record<string, FontStatus> = Object.fromEntries(
  SYMBOL_FONTS.map((f) => [f.id, "checando" as FontStatus]),
);

/**
 * A checagem espera `document.fonts.ready` porque medir enquanto o navegador
 * ainda resolve famílias devolve a largura do fallback — um falso "ausente"
 * bem no primeiro quadro, que é o pior momento para mentir.
 */
export function useFontAvailability(): Record<string, FontStatus> {
  const [status, setStatus] = useState<Record<string, FontStatus>>(INICIAL);

  useEffect(() => {
    let vivo = true;
    const medir = () => {
      if (!vivo) return;
      setStatus(
        Object.fromEntries(
          SYMBOL_FONTS.map((f) => [f.id, statusFromProbes(measureProbes(f.family))]),
        ),
      );
    };

    const fontes = typeof document !== "undefined" ? document.fonts : undefined;
    if (fontes?.ready) fontes.ready.then(medir, medir);
    else medir();

    return () => {
      vivo = false;
    };
  }, []);

  return status;
}

export function useFonts() {
  const [text, setText] = useState("");
  /** Quais fontes ganham cartão de renderização — todas ligadas é o estado útil. */
  const [shown, setShown] = useState<string[]>(() => SYMBOL_FONTS.map((f) => f.id));
  const [gridFontId, setGridFontId] = useState(SYMBOL_FONTS[0].id);
  const [size, setSize] = useState<GlyphSize>("g");

  const availability = useFontAvailability();

  const toggle = useCallback((id: string) => {
    setShown((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }, []);

  const fonts = useMemo(() => SYMBOL_FONTS.filter((f) => shown.includes(f.id)), [shown]);

  const gridFont = useMemo(
    () => SYMBOL_FONTS.find((f) => f.id === gridFontId) ?? SYMBOL_FONTS[0],
    [gridFontId],
  );

  /** Campo vazio ainda tem o que mostrar: a amostra é melhor do que uma tela morta. */
  const amostra = text.trim() === "" ? SAMPLE_TEXT : text;

  /**
   * A direção do conversor da Symbol se decide pelo texto: quem colou grego
   * quer saber quais teclas foram digitadas, quem digitou latino quer ver o
   * grego. Um botão a menos numa tela que já tem controles demais.
   */
  const greek = useMemo(() => {
    const paraLatino = looksGreek(amostra);
    return {
      paraLatino,
      value: paraLatino ? greekToLatin(amostra) : latinToGreek(amostra),
      /** O que a Symbol desenharia, sempre nesse sentido — é o cartão de render. */
      comoSymbol: latinToGreek(amostra),
    };
  }, [amostra]);

  /** Estilos Unicode: as tabelas moram na Cola (`reference/unicode-styles`). */
  const styles = useMemo(
    () =>
      UNICODE_STYLES.map((s) => ({
        id: s.id,
        nome: s.nome,
        bloco: s.bloco,
        inverteOrdem: s.inverteOrdem,
        value: s.apply(amostra),
      })),
    [amostra],
  );

  return {
    text,
    setText,
    amostra,
    shown,
    toggle,
    fonts,
    availability,
    gridFontId,
    setGridFontId,
    gridFont,
    size,
    setSize,
    greek,
    styles,
  } as const;
}
