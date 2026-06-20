import { cn } from "@/lib/cn";
import type { CaesarShiftRow } from "../engine/decoders/caesar-bruteforce";

/** Scrollable table of every Caesar shift (−26..+26). Shift 0 (identity) is highlighted. */
export function CaesarTable({ rows }: { rows: CaesarShiftRow[] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
      <table className="w-full border-collapse font-mono text-sm">
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.shift}
              className={cn(
                "border-b border-[var(--border-subtle)] last:border-0",
                r.shift === 0 && "bg-[var(--surface-sunken)]",
              )}
            >
              <td className="w-14 px-2 py-1 text-right tabular-nums text-[var(--text-muted)]">
                {r.shift > 0 ? `+${r.shift}` : r.shift}
              </td>
              <td className="whitespace-pre-wrap break-words px-3 py-1 text-[var(--text-primary)]">
                {r.text}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
