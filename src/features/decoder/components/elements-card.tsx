import type { ElementInfo } from "../engine/decoders/periodic-table";

/** Lista de elementos químicos com símbolo, nome, número atômico e peso. */
export function ElementsCard({ elements }: { elements: ElementInfo[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {elements.map((e) => (
        <div
          key={`${e.z}-${e.sym}`}
          className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2"
        >
          <span className="w-9 text-center font-display text-2xl text-[var(--brand-strong)]">
            {e.sym}
          </span>
          <div className="min-w-0">
            <div className="text-sm text-[var(--text-primary)]">{e.name}</div>
            <div className="font-mono text-xs text-[var(--text-muted)]">
              Nº {e.z} · peso {e.weight}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
