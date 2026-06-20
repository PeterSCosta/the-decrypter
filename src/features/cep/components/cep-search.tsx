import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useCepSearch } from "../use-cep-search";
import { CepCard } from "./cep-card";

export function CepSearch() {
  const { pattern, setPattern, result, loading, total } = useCepSearch();
  const cleaned = pattern.replace(/[\s.\-]/g, "");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">CEPs — Santa Catarina</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Busca por padrão: dígitos fixos e <code className="font-mono">x</code> (ou{" "}
          <code className="font-mono">*</code>) como curinga.{" "}
          {total > 0 ? `${total.toLocaleString("pt-BR")} CEPs.` : ""}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Ex.: 88xxx500 · x8300000 · 88010500"
          aria-label="Padrão de CEP"
          className="pl-9 font-mono"
          autoFocus
        />
      </div>

      {pattern.trim() && (
        <p className="text-xs text-[var(--text-secondary)]">
          {cleaned.length === 8
            ? "Máscara de 8 dígitos (posição fixa)."
            : cleaned.length > 0 && cleaned.length < 8
              ? "Padrão parcial — corresponde em qualquer posição."
              : ""}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando CEPs…</p>
      ) : pattern.trim() === "" ? (
        <p className="text-sm text-[var(--text-muted)]">Digite um padrão para buscar.</p>
      ) : !result.valid ? (
        <p className="text-sm text-[var(--color-pulse-600)]">
          Padrão inválido (use dígitos e curingas, até 8 posições).
        </p>
      ) : result.total === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Nenhum CEP corresponde.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <span className="text-xs text-[var(--text-secondary)]">
            {result.total.toLocaleString("pt-BR")} correspondência(s)
            {result.truncated ? ` · mostrando ${result.hits.length}` : ""}
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.hits.map((hit, i) => (
              <CepCard key={`${hit.cep}-${i}`} hit={hit} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
