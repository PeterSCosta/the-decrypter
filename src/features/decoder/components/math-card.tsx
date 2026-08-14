import { CopyButton } from "@/components/ui/copy-button";
import type { MathReport } from "@/features/math/arith";
import { CornerDownRight } from "lucide-react";

/**
 * Painel da aritmética escondida. Cada linha é uma operação candidata (MDC,
 * raiz, divisão, Kaprekar…) sobre os números achados no texto.
 *
 * O que faz este card valer: a coluna da direita. Nas provas, a conta nunca é a
 * resposta — o resultado vira a camada seguinte. Então cada linha que produz um
 * valor limpo ganha "usar", e a leitura A1Z26 aparece ao lado, que é como
 * GEOTUDE (GIA-27) se revela sem ninguém ter pedido.
 */
export function MathCard({
  report,
  onChain,
}: {
  report: MathReport;
  onChain?: (value: string, via: string) => void;
}) {
  if (report.lines.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Nenhuma operação se aplica.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {report.lines.map((line) => (
        <div
          key={`${line.op}-${line.text}`}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-2.5 py-1.5"
        >
          <span className="shrink-0 font-mono text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
            {line.label}
          </span>
          <span className="min-w-0 flex-1 break-words font-mono text-sm text-[var(--text-primary)]">
            {line.text}
          </span>

          {line.reading ? (
            <span
              className="shrink-0 rounded-full bg-[var(--color-voltage-100)] px-2 py-0.5 font-mono text-[0.6875rem] text-[var(--color-voltage-800)]"
              title="Leitura A1Z26 dos valores"
            >
              {line.reading}
            </span>
          ) : null}

          {line.hint ? (
            <span className="shrink-0 text-xs text-[var(--text-secondary)]">{line.hint}</span>
          ) : null}

          {line.chain ? (
            <span className="ml-auto flex shrink-0 items-center gap-0.5">
              {onChain ? (
                <button
                  type="button"
                  onClick={() => onChain(line.chain as string, line.label)}
                  title="Usar este resultado como a próxima entrada"
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                >
                  <CornerDownRight className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
                  usar
                </button>
              ) : null}
              <CopyButton value={line.chain} />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
