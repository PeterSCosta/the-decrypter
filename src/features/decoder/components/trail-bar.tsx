import { ChevronRight, CornerUpLeft, X } from "lucide-react";
import type { TrailStep } from "../trail";

/**
 * Migalhas da cadeia. As provas de gincana são cadeias de 2 a 4 camadas, e sem
 * isto o único jeito de segui-las era copiar e colar o resultado de cada passo.
 * Clicar numa migalha ramifica: volta àquela entrada e descarta o que veio depois.
 */
export function TrailBar({
  trail,
  onGoTo,
  onUndo,
  onClear,
}: {
  trail: TrailStep[];
  onGoTo: (index: number) => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  if (trail.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2">
      <span className="mr-1 text-xs font-medium text-[var(--text-secondary)]">Cadeia:</span>

      {trail.map((step, i) => (
        <span key={`${step.via}-${i}`} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onGoTo(i)}
            title={`Voltar para: ${step.input.slice(0, 80)}`}
            className="max-w-[9rem] truncate rounded-[var(--radius-sm)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {step.via}
          </button>
          <ChevronRight className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
        </span>
      ))}

      <span className="rounded-[var(--radius-sm)] bg-[var(--color-voltage-100)] px-2 py-0.5 font-mono text-xs text-[var(--color-voltage-800)]">
        agora
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <CornerUpLeft className="h-3.5 w-3.5" /> desfazer
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" /> limpar
        </button>
      </div>
    </div>
  );
}
