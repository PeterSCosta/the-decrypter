import { cn } from "@/lib/cn";

/** A 0..1 plausibility meter. Green when likely, amber mid, muted when low. */
export function ConfidenceBar({ score, className }: { score: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const color =
    score >= 0.6
      ? "var(--color-success-500)"
      : score >= 0.35
        ? "var(--color-warning-600)"
        : "var(--color-ink-300)";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[0.6875rem] tabular-nums text-[var(--text-muted)]">
        {pct}
      </span>
    </div>
  );
}
