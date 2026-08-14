import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  ChevronDown,
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Hand,
  MoveDiagonal,
  Paintbrush,
  RotateCcw,
  RotateCw,
  Scissors,
} from "lucide-react";
import type { ReactNode } from "react";
import type { TransformId } from "../use-matrix";
import { CELL_SIZE_LABEL, type CellSize } from "./matrix-grid";

/**
 * Controles da grade. Tudo aqui é pensado para o estreito primeiro: os botões
 * de transformação são ícones que quebram linha, o acordeão guarda o que não é
 * usado o tempo todo, e nada disso ganha coluna ao lado da grade — em 375px a
 * grade quer a largura inteira.
 */

const TRANSFORMS: { id: TransformId; label: string; icon: typeof RotateCw }[] = [
  { id: "girar-90", label: "Girar 90° à direita", icon: RotateCw },
  { id: "girar-270", label: "Girar 90° à esquerda", icon: RotateCcw },
  { id: "espelhar-h", label: "Espelhar na horizontal", icon: FlipHorizontal2 },
  { id: "espelhar-v", label: "Espelhar na vertical", icon: FlipVertical2 },
  { id: "transpor", label: "Transpor (troca linhas por colunas)", icon: MoveDiagonal },
  { id: "aparar", label: "Aparar as bordas vazias", icon: Scissors },
];

/**
 * Metade das provas de grade é ambígua quanto à orientação — a runa está de
 * lado? o nonograma começa em cima ou embaixo? Quatro giros e dois espelhos são
 * oito hipóteses testadas em oito cliques, em vez de redigitar a grade.
 */
export function TransformBar({ onTransform }: { onTransform: (t: TransformId) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {TRANSFORMS.map((t) => {
        const Icon = t.icon;
        return (
          <IconButton
            key={t.id}
            label={t.label}
            onClick={() => onTransform(t.id)}
            className="h-8 w-8 border border-[var(--border-subtle)]"
          >
            <Icon className="h-3.5 w-3.5" />
          </IconButton>
        );
      })}
    </div>
  );
}

const numero =
  "h-8 w-16 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-2 text-center font-mono text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export function DimensionControls({
  rows,
  cols,
  max,
  onDim,
}: {
  rows: number;
  cols: number;
  max: number;
  onDim: (rows: number, cols: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
      <input
        type="number"
        min={1}
        max={max}
        value={rows}
        aria-label="Linhas"
        className={numero}
        onChange={(e) => onDim(Number(e.target.value), cols)}
      />
      <span aria-hidden="true">×</span>
      <input
        type="number"
        min={1}
        max={max}
        value={cols}
        aria-label="Colunas"
        className={numero}
        onChange={(e) => onDim(rows, Number(e.target.value))}
      />
      <span className="text-xs">linhas × colunas</span>
    </div>
  );
}

export function CellSizeToggle({
  size,
  onSize,
}: {
  size: CellSize;
  onSize: (s: CellSize) => void;
}) {
  return (
    <span
      className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border-strong)] p-0.5"
      aria-label="Tamanho da célula"
    >
      {(Object.keys(CELL_SIZE_LABEL) as CellSize[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSize(s)}
          aria-pressed={size === s}
          title={CELL_SIZE_LABEL[s]}
          className={cn(
            "rounded-[calc(var(--radius-sm)-1px)] px-1.5 py-0.5 text-[0.6875rem] font-medium transition-colors",
            size === s
              ? "bg-[var(--brand)] text-[var(--brand-ink)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          )}
        >
          {s.toUpperCase()}
        </button>
      ))}
    </span>
  );
}

/**
 * O interruptor que o celular exige: com "Pintar" ligado o arrasto pinta e a
 * grade não rola; com "Rolar" o dedo rola e só o toque simples pinta. Sem esse
 * botão explícito os dois gestos brigam e a pessoa perde a grade de vista.
 */
export function PaintModeToggle({
  painting,
  onPainting,
}: {
  painting: boolean;
  onPainting: (v: boolean) => void;
}) {
  return (
    <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border-strong)] p-0.5">
      <button
        type="button"
        onClick={() => onPainting(true)}
        aria-pressed={painting}
        title="Arrastar pinta"
        className={cn(
          "inline-flex items-center gap-1 rounded-[calc(var(--radius-sm)-1px)] px-2 py-0.5 text-[0.6875rem] font-medium transition-colors",
          painting
            ? "bg-[var(--brand)] text-[var(--brand-ink)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        )}
      >
        <Paintbrush className="h-3 w-3" />
        Pintar
      </button>
      <button
        type="button"
        onClick={() => onPainting(false)}
        aria-pressed={!painting}
        title="Arrastar rola a grade"
        className={cn(
          "inline-flex items-center gap-1 rounded-[calc(var(--radius-sm)-1px)] px-2 py-0.5 text-[0.6875rem] font-medium transition-colors",
          !painting
            ? "bg-[var(--brand)] text-[var(--brand-ink)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        )}
      >
        <Hand className="h-3 w-3" />
        Rolar
      </button>
    </span>
  );
}

/** Recorte por referência de célula — "de A1 até C5" é como o enunciado fala. */
export function CropBox({
  valor,
  onValor,
  onRecortar,
  erro,
}: {
  valor: string;
  onValor: (v: string) => void;
  onRecortar: () => void;
  erro: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={valor}
          onChange={(e) => onValor(e.target.value)}
          placeholder="A1:C5"
          aria-label="Faixa a recortar"
          className="h-8 w-28 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-2 font-mono text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
        <Button variant="secondary" size="sm" onClick={onRecortar}>
          <Crop className="h-3.5 w-3.5" />
          Recortar
        </Button>
        <span className="text-xs text-[var(--text-secondary)]">
          isola um bloco (o 3×5 dentro de uma grade maior)
        </span>
      </div>
      {erro ? <p className="text-xs text-[var(--color-pulse-700)]">{erro}</p> : null}
    </div>
  );
}

/**
 * Acordeão: no estreito, tudo que não é a grade e as regras fica dobrado. Usa
 * `<details>` de propósito — abre sem JavaScript, e o navegador já dá o
 * comportamento de teclado de graça.
 */
export function Acordeao({
  titulo,
  hint,
  children,
  aberto,
}: {
  titulo: string;
  hint?: string;
  children: ReactNode;
  aberto?: boolean;
}) {
  return (
    <details
      open={aberto}
      className="group rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180" />
        {titulo}
        {hint ? (
          <span className="min-w-0 truncate text-xs font-normal text-[var(--text-muted)]">
            {hint}
          </span>
        ) : null}
      </summary>
      <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] p-3">
        {children}
      </div>
    </details>
  );
}
