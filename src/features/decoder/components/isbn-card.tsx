import { type IsbnInfo, fetchIsbn } from "@/lib/brasilapi";
import { BookOpen, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { IsbnHint } from "../engine/decoders/isbn";

export function IsbnCard({ hint }: { hint: IsbnHint }) {
  const [data, setData] = useState<IsbnInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca o livro automaticamente assim que um ISBN válido é detectado.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    fetchIsbn(hint.isbn)
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError((e as Error).message);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [hint.isbn]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="font-mono text-base text-[var(--text-primary)]">{hint.formatted}</span>
        <span className="text-xs text-[var(--text-secondary)]">{hint.type}</span>
      </div>

      {loading ? (
        <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" /> Buscando livro…
        </p>
      ) : data ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
          <div className="font-display text-sm text-[var(--text-primary)]">{data.title}</div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            {[data.authors?.join(", "), data.publisher, data.year].filter(Boolean).join(" · ")}
          </div>
          {data.synopsis ? (
            <p className="mt-2 line-clamp-4 text-xs text-[var(--text-secondary)]">
              {data.synopsis}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">{error ?? "Livro não encontrado."}</p>
      )}
    </div>
  );
}
