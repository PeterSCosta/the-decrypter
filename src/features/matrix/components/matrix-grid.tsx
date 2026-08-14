import { cn } from "@/lib/cn";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from "react";
import { type Matrix, cellLabel, colLabel } from "../matrix";

/**
 * A grade é o pior caso de layout do projeto: em 375px uma 25×25 não cabe de
 * jeito nenhum. A regra que segura tudo aqui é *a rolagem acontece dentro deste
 * componente e em lugar nenhum mais* — o `overflow-auto` fica no invólucro e a
 * página nunca ganha barra horizontal. As réguas A/B/C e 1/2/3 são `sticky`
 * dentro desse mesmo invólucro, senão quem rola até a coluna Q perde a conta de
 * onde está — e conferir célula contra o enunciado é metade do trabalho.
 */

export type CellSize = "s" | "m" | "g";

export const CELL_PX: Record<CellSize, number> = { s: 18, m: 26, g: 36 };
export const CELL_SIZE_LABEL: Record<CellSize, string> = {
  s: "Miúda",
  m: "Média",
  g: "Grande",
};

/**
 * Estados de célula. O 0 é vazio; o 1 é o "preto" clássico das provas — e usa
 * `--text-primary` de propósito, para inverter junto com o tema em vez de virar
 * um borrão preto sobre fundo preto no modo escuro.
 */
export const STATE_STYLES: { bg: string; fg: string; nome: string }[] = [
  { bg: "var(--surface-card)", fg: "var(--text-primary)", nome: "vazio" },
  { bg: "var(--text-primary)", fg: "var(--surface-card)", nome: "pintado" },
  { bg: "var(--brand)", fg: "var(--brand-ink)", nome: "lima" },
  { bg: "var(--pulse)", fg: "var(--color-ink-0)", nome: "coral" },
  { bg: "var(--color-info-600)", fg: "var(--color-ink-0)", nome: "azul" },
  { bg: "var(--color-warning-600)", fg: "var(--color-ink-0)", nome: "âmbar" },
];

/** Largura da régua da esquerda: cabe "16" em fonte miúda sem empurrar a grade. */
const RULER_PX = 24;

export interface MatrixGridProps {
  matrix: Matrix;
  size: CellSize;
  /** Mostra o conteúdo textual das células (as letras da origem sob a pintura). */
  showText?: boolean;
  /** Ligado: pinta ao clicar e ao arrastar. Desligado: o dedo rola a grade. */
  paintable?: boolean;
  /** Estado que o clique aplica; clicar de novo na mesma marca apaga. */
  activeState?: number;
  onPaint?: (row: number, col: number, state: number) => void;
  /** Ligado: clicar abre a célula para digitar (é a matriz de origem). */
  editable?: boolean;
  onEditCell?: (row: number, col: number, value: string) => void;
  /** Célula em foco/edição — controlada de fora para o teclado andar pela grade. */
  cursor?: { row: number; col: number } | null;
  onCursor?: (pos: { row: number; col: number } | null) => void;
  maxHeight?: string;
  ariaLabel: string;
  className?: string;
}

/** Fundo da célula: marca manda, mapa de calor entra quando não há marca. */
function fundo(mark: number, heat: number | null): { bg: string; fg: string } {
  if (mark > 0) {
    const s = STATE_STYLES[mark] ?? STATE_STYLES[1];
    return { bg: s.bg, fg: s.fg };
  }
  if (heat !== null && heat > 0) {
    const pct = Math.round(Math.min(1, Math.max(0, heat)) * 100);
    return {
      bg: `color-mix(in srgb, var(--brand) ${pct}%, var(--surface-card))`,
      fg: "var(--text-primary)",
    };
  }
  return { bg: STATE_STYLES[0].bg, fg: STATE_STYLES[0].fg };
}

export function MatrixGrid({
  matrix,
  size,
  showText = true,
  paintable = false,
  activeState = 1,
  onPaint,
  editable = false,
  onEditCell,
  cursor = null,
  onCursor,
  maxHeight = "min(60vh, 26rem)",
  ariaLabel,
  className,
}: MatrixGridProps) {
  const px = CELL_PX[size];
  const fontPx = Math.max(9, Math.round(px * 0.46));
  const rulerFont = Math.max(8, Math.round(px * 0.36));

  /**
   * O valor que o arrasto está aplicando. Ele é decidido no primeiro toque e
   * congelado: sem isso, passar o dedo por cima de uma célula já pintada a
   * apagaria no meio do traço, e pintar uma linha inteira viraria loteria.
   */
  const dragValue = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stop = () => {
      dragValue.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  /** Mantém o foco do navegador na célula do cursor (roving tabindex). */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reposicionar só quando o cursor muda
  useEffect(() => {
    if (!cursor || editable) return;
    const node = containerRef.current?.querySelector<HTMLElement>(
      `[data-cell="${cursor.row}-${cursor.col}"]`,
    );
    if (node && document.activeElement !== node) node.focus();
  }, [cursor?.row, cursor?.col, editable]);

  function handleDown(e: ReactPointerEvent<HTMLElement>, row: number, col: number) {
    if (!paintable || !onPaint) return;
    // No toque o navegador prende o ponteiro no alvo do pointerdown; soltar a
    // captura é o que faz o `pointerenter` disparar nas células vizinhas — sem
    // isto, arrastar no celular pinta uma célula só.
    const target = e.currentTarget;
    if (target.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId);
    const atual = matrix.cells[row]?.[col]?.mark ?? 0;
    const value = atual === activeState ? 0 : activeState;
    dragValue.current = value;
    onPaint(row, col, value);
  }

  function handleEnter(row: number, col: number) {
    if (dragValue.current === null || !onPaint) return;
    onPaint(row, col, dragValue.current);
  }

  function move(row: number, col: number, dr: number, dc: number) {
    const r = Math.min(matrix.rows - 1, Math.max(0, row + dr));
    const c = Math.min(matrix.cols - 1, Math.max(0, col + dc));
    onCursor?.({ row: r, col: c });
  }

  function handleKey(e: ReactKeyboardEvent<HTMLElement>, row: number, col: number) {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        move(row, col, -1, 0);
        return;
      case "ArrowDown":
      case "Enter":
        e.preventDefault();
        move(row, col, 1, 0);
        return;
      case "ArrowLeft":
        e.preventDefault();
        move(row, col, 0, -1);
        return;
      case "ArrowRight":
        e.preventDefault();
        move(row, col, 0, 1);
        return;
      case " ":
        if (paintable && onPaint) {
          e.preventDefault();
          const atual = matrix.cells[row]?.[col]?.mark ?? 0;
          onPaint(row, col, atual === activeState ? 0 : activeState);
        }
        return;
      case "Backspace":
      case "Delete":
        if (editable && onEditCell) {
          e.preventDefault();
          onEditCell(row, col, "");
        } else if (paintable && onPaint) {
          e.preventDefault();
          onPaint(row, col, 0);
        }
        return;
      default:
        // Digitar direto na célula em foco escreve nela: é o gesto de planilha,
        // e a origem quase sempre é acertada assim depois de uma colagem torta.
        if (editable && onEditCell && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          onEditCell(row, col, e.key);
          move(row, col, 0, 1);
        }
    }
  }

  const template: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `${RULER_PX}px repeat(${matrix.cols}, ${px}px)`,
    // Sem isto o grid encolhe as colunas para caber e a célula deixa de ser quadrada.
    width: "max-content",
    // O dedo só rola quando não está pintando — é o que evita o cabo de guerra
    // entre arrastar para pintar e arrastar para rolar no celular.
    touchAction: paintable ? "none" : "auto",
  };

  if (matrix.rows === 0 || matrix.cols === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">
        Grade vazia — informe as dimensões ou cole a matriz.
      </div>
    );
  }

  return (
    <section
      ref={containerRef}
      aria-label={ariaLabel}
      className={cn(
        "overflow-auto overscroll-contain rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-1",
        className,
      )}
      style={{ maxHeight }}
    >
      {/* Sem `role=grid`: a grade tem 600 células, e cada uma já é um botão com
          nome próprio ("B3"), que é o que o leitor de tela precisa. Papel de
          grade exigiria linha focável e navegação de tabela, e daria menos. */}
      <div style={template}>
        <div
          className="sticky left-0 top-0 z-30 bg-[var(--surface-sunken)]"
          style={{ width: RULER_PX, height: px }}
        />
        {Array.from({ length: matrix.cols }, (_, c) => (
          <div
            key={`h-${colLabel(c)}`}
            className="sticky top-0 z-20 flex items-center justify-center bg-[var(--surface-sunken)] font-mono text-[var(--text-muted)]"
            style={{ height: px, fontSize: rulerFont }}
          >
            {colLabel(c)}
          </div>
        ))}

        {matrix.cells.map((linha, r) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: numa grade, a posição É a identidade
          <div key={`r-${r}`} className="contents">
            <div
              className="sticky left-0 z-10 flex items-center justify-center bg-[var(--surface-sunken)] font-mono text-[var(--text-muted)]"
              style={{ width: RULER_PX, height: px, fontSize: rulerFont }}
            >
              {r + 1}
            </div>
            {linha.map((cel, c) => {
              const cor = fundo(cel.mark, cel.heat);
              const editando = editable && cursor?.row === r && cursor?.col === c;
              const ref = cellLabel(r, c);
              const visivel = showText ? cel.v : cel.mark > 0 ? (cel.glyph ?? "") : "";

              if (editando) {
                return (
                  <input
                    key={ref}
                    // biome-ignore lint/a11y/noAutofocus: a célula só entra em edição por clique/tecla
                    autoFocus
                    value={cel.v}
                    aria-label={`Célula ${ref}`}
                    onChange={(e) => onEditCell?.(r, c, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        onCursor?.(null);
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        move(r, c, 1, 0);
                      } else if (e.key === "Tab") {
                        e.preventDefault();
                        move(r, c, 0, e.shiftKey ? -1 : 1);
                      } else if (e.key.startsWith("Arrow") && (e.altKey || e.metaKey)) {
                        e.preventDefault();
                        move(
                          r,
                          c,
                          e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0,
                          e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0,
                        );
                      }
                    }}
                    className="border border-[var(--brand-strong)] bg-[var(--surface-card)] text-center font-mono text-[var(--text-primary)] outline-none"
                    style={{ width: px, height: px, fontSize: fontPx }}
                  />
                );
              }

              return (
                <button
                  key={ref}
                  type="button"
                  data-cell={`${r}-${c}`}
                  tabIndex={cursor?.row === r && cursor?.col === c ? 0 : -1}
                  aria-label={cel.v ? `${ref} ${cel.v}` : ref}
                  aria-pressed={paintable ? cel.mark > 0 : undefined}
                  title={cel.v ? `${ref} · ${cel.v}` : ref}
                  onPointerDown={(e) => handleDown(e, r, c)}
                  onPointerEnter={() => handleEnter(r, c)}
                  onFocus={() => onCursor?.({ row: r, col: c })}
                  onClick={() => {
                    if (editable) onCursor?.({ row: r, col: c });
                  }}
                  onKeyDown={(e) => handleKey(e, r, c)}
                  className="flex select-none items-center justify-center overflow-hidden border border-[var(--border-subtle)] font-mono leading-none focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
                  style={{
                    width: px,
                    height: px,
                    fontSize: fontPx,
                    background: cor.bg,
                    color: cor.fg,
                  }}
                >
                  {visivel.slice(0, 2)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Paleta de estados. No caso binário (o comum) ela nem aparece — quem chama decide. */
export function StatePalette({
  count,
  active,
  onActive,
  labels,
}: {
  count: number;
  active: number;
  onActive: (state: number) => void;
  labels: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: count }, (_, i) => i).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onActive(s)}
          aria-pressed={active === s}
          title={labels[s] ?? STATE_STYLES[s].nome}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors",
            active === s
              ? "border-[var(--brand-strong)] text-[var(--text-primary)]"
              : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          )}
        >
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 rounded-[3px] border border-[var(--border-strong)]"
            style={{ background: STATE_STYLES[s].bg }}
          />
          {labels[s] ?? STATE_STYLES[s].nome}
        </button>
      ))}
    </div>
  );
}
