import type { CodeHit } from "@/features/reference/phone-codes";

/** Lista de "código → nome" (DDI, DDD): código em destaque, nome e detalhe. */
export function CodeListCard({ items }: { items: CodeHit[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((it) => (
        <div
          key={`${it.code}-${it.name}`}
          className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2"
        >
          <span className="w-10 shrink-0 text-center font-display text-lg text-[var(--brand-strong)]">
            {it.code}
          </span>
          <div className="min-w-0">
            <div className="text-sm text-[var(--text-primary)]">{it.name}</div>
            {it.detail ? (
              <div className="font-mono text-xs text-[var(--text-muted)]">{it.detail}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
