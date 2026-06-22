import { Input, Textarea } from "@/components/ui/input";
import { ChevronDown, KeyRound, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { decoders } from "../engine/registry";
import { useDecoder } from "../use-decoder";
import { DecoderSelector } from "./decoder-selector";
import { ResultCard } from "./result-card";

const EXAMPLES = ["SGVsbG8gbXVuZG8=", "Wklab xli gshi", "3722", "88xxx500", "Nb11458750330"];

export function DecoderWorkbench() {
  const { input, setInput, key, setKey, selectedId, setSelectedId, likely, unlikely, results } =
    useDecoder();
  const [showUnlikely, setShowUnlikely] = useState(false);

  const selectedName = selectedId
    ? (decoders.find((d) => d.id === selectedId)?.name ?? selectedId)
    : null;

  return (
    <div className="flex flex-col gap-5 md:flex-row md:gap-6">
      <DecoderSelector selectedId={selectedId} onSelect={setSelectedId} />

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Cole aqui o texto cifrado, números, Base64, Morse, um código de rua, um CEP…"
            autoFocus
            aria-label="Entrada para decifrar"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[12rem] flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Chave (para Vigenère)"
                aria-label="Chave para cifras com chave"
                className="pl-9 font-mono"
              />
            </div>
            {!input && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)]">tente:</span>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setInput(ex)}
                    className="rounded-md bg-[var(--surface-sunken)] px-2 py-1 font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modo "uma cifra só" */}
        {selectedId && (
          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm">
            <span className="text-[var(--text-secondary)]">
              Rodando só: <span className="text-[var(--text-primary)]">{selectedName}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" /> todas
            </button>
          </div>
        )}

        {input.trim() && !selectedId && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
            {results.length > 0 ? (
              <span>
                {results.length} {results.length === 1 ? "ideia" : "ideias"}
                {likely.length > 0 ? ` · ${likely.length} provável(is)` : ""}
              </span>
            ) : (
              <span>Nenhuma interpretação encontrada — tente outra entrada ou uma chave.</span>
            )}
          </div>
        )}

        {/* Resultados */}
        {selectedId ? (
          input.trim() && results.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Sem resultado para essa entrada nessa cifra.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((c, i) => (
                <ResultCard key={`${c.decoderId}-${c.label ?? ""}-${i}`} c={c} rank={i + 1} />
              ))}
            </div>
          )
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {likely.map((c, i) => (
                <ResultCard key={`${c.decoderId}-${c.label ?? ""}-${i}`} c={c} rank={i + 1} />
              ))}
            </div>

            {unlikely.length > 0 && (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setShowUnlikely((v) => !v)}
                  className="flex items-center gap-1.5 self-start text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showUnlikely ? "rotate-180" : ""}`}
                  />
                  {showUnlikely ? "Ocultar" : "Mostrar"} {unlikely.length} pouco provável(is)
                </button>
                {showUnlikely &&
                  unlikely.map((c, i) => (
                    <ResultCard
                      key={`${c.decoderId}-${c.label ?? ""}-${i}`}
                      c={c}
                      rank={likely.length + i + 1}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
