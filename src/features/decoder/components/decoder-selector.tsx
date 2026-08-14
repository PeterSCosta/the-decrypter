import { cn } from "@/lib/cn";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { decoders } from "../engine/registry";
import { CATEGORY_LABELS, type DecoderCategory } from "../engine/types";
import { stripDiacritics } from "../engine/util";

const CATEGORY_ORDER: DecoderCategory[] = ["encoding", "classical", "transform", "lookup"];
const fold = (s: string) => stripDiacritics(s).toLowerCase();

// Lista única {id, name, category} (decoders podem repetir id entre grupos? não — registry é único).
const ITEMS: { id: string; name: string; category: DecoderCategory }[] = (() => {
  const seen = new Set<string>();
  const out: { id: string; name: string; category: DecoderCategory }[] = [];
  for (const d of decoders) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    out.push({ id: d.id, name: d.name, category: d.category });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
})();

export function DecoderSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const fq = fold(q.trim());

  const groups = useMemo(() => {
    const filtered = fq ? ITEMS.filter((d) => fold(d.name).includes(fq)) : ITEMS;
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      items: filtered.filter((d) => d.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [fq]);

  return (
    // A lista vem DEPOIS da entrada no DOM (a ~375px ninguém quer rolar 74
    // cifras para achar o campo — e isso vale igual para tabulação e leitor de
    // tela, por isso a ordem é do DOM, não só visual). No desktop, `order` a
    // devolve para a esquerda.
    <aside className="md:order-1 md:w-56 md:shrink-0">
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cifra…"
          aria-label="Buscar cifra"
          className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] py-1.5 pl-8 pr-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "mb-1 w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm font-medium transition-colors",
          selectedId === null
            ? "bg-[var(--brand)] text-[var(--brand-ink)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
        )}
      >
        Todas as cifras
      </button>

      <div className="max-h-[55vh] overflow-y-auto pr-1 md:max-h-[70vh]">
        {groups.map((g) => (
          <div key={g.cat} className="mb-3">
            <div className="px-2 py-1 text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
              {CATEGORY_LABELS[g.cat]}
            </div>
            {g.items.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d.id)}
                className={cn(
                  "block w-full truncate rounded-[var(--radius-sm)] px-2 py-1 text-left text-sm transition-colors",
                  selectedId === d.id
                    ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
        ))}
        {groups.length === 0 ? (
          <p className="px-2 text-xs text-[var(--text-muted)]">Nada encontrado.</p>
        ) : null}
      </div>
    </aside>
  );
}
