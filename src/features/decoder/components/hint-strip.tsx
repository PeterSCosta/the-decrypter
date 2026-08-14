import { AlertTriangle, Lightbulb } from "lucide-react";
import type { Hint } from "../engine/sniff";

/**
 * Faixa de chips do sniffer — "isto tem cara de…".
 *
 * Fica ACIMA dos resultados e FORA da corrida de candidatos, de propósito: o
 * valor aqui é o diagnóstico negativo ("13 dígitos, mas o DV não fecha"), que um
 * decoder nunca dá — quando não se aplica, ele devolve nada, em silêncio.
 */
export function HintStrip({
  hints,
  onSelect,
  onChain,
}: {
  hints: Hint[];
  onSelect: (id: string) => void;
  onChain: (value: string, via: string) => void;
}) {
  if (hints.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2.5">
      {hints.map((h) => {
        const warn = h.tone === "warn";
        const Icon = warn ? AlertTriangle : Lightbulb;
        return (
          <div key={h.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
            <span className="flex items-center gap-1.5">
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${
                  warn ? "text-[var(--color-pulse-600)]" : "text-[var(--brand-strong)]"
                }`}
              />
              <span className="font-medium text-[var(--text-primary)]">{h.label}</span>
            </span>
            {h.detail ? <span className="min-w-0 text-[var(--text-muted)]">{h.detail}</span> : null}
            <span className="ml-auto flex shrink-0 items-center gap-2">
              {h.chainValue ? (
                <button
                  type="button"
                  onClick={() => onChain(h.chainValue as string, h.label)}
                  className="text-[var(--text-secondary)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-primary)]"
                >
                  usar
                </button>
              ) : null}
              {h.decoderId ? (
                <button
                  type="button"
                  onClick={() => onSelect(h.decoderId as string)}
                  className="text-[var(--text-secondary)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-primary)]"
                >
                  testar
                </button>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
