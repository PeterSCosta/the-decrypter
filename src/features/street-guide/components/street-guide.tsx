import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { StreetMatchKind } from "../search";
import { useStreetSearch } from "../use-street-search";
import { StreetCard } from "./street-card";

const KIND_LABEL: Record<StreetMatchKind, string> = {
  codigo: "código",
  lei: "nº da lei",
  nome: "nome",
  data: "data da lei",
};

export function StreetGuide() {
  const { query, setQuery, matches, loading, total } = useStreetSearch();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">Guia de Ruas — Blumenau</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Busque por <strong>código</strong>, <strong>Nº da Lei</strong>,{" "}
          <strong>data da lei</strong>, nome da rua ou bairro.{" "}
          {total > 0 ? `${total.toLocaleString("pt-BR")} ruas catalogadas.` : ""}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex.: 3722 · 6416 · 09/02/2004 · 2004 · Açores"
          aria-label="Buscar ruas"
          className="pl-9"
          autoFocus
        />
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando guia de ruas…</p>
      ) : query.trim() === "" ? (
        <p className="text-sm text-[var(--text-muted)]">Digite para buscar.</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Nenhuma rua encontrada.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <span className="text-xs text-[var(--text-secondary)]">
            {matches.length} resultado(s)
          </span>
          {matches.map((m, i) => (
            <div key={`${m.row.codigo}-${m.row.bairro}-${i}`} className="relative">
              {m.kind !== "nome" && (
                <Badge tone="brand" className="absolute -top-2 left-3 z-10">
                  {KIND_LABEL[m.kind]}
                </Badge>
              )}
              <StreetCard row={m.row} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
