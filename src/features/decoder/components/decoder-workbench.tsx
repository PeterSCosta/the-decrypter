import { Input, Textarea } from "@/components/ui/input";
import { ChevronDown, KeyRound, Sparkles } from "lucide-react";
import { useState } from "react";
import { useDecoder } from "../use-decoder";
import { ResultCard } from "./result-card";

const EXAMPLES = ["SGVsbG8gbXVuZG8=", "Wklab xli gshi", "3722", "6416", "88010-000"];

export function DecoderWorkbench() {
  const { input, setInput, key, setKey, likely, unlikely, hitCount, total } = useDecoder();
  const [showUnlikely, setShowUnlikely] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Cole aqui o texto cifrado, números, Base64, Morse, um código de rua, um CEP…"
          autoFocus
          aria-label="Entrada para decifrar"
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[12rem]">
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

      {input.trim() && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
          {total > 0 ? (
            <span>
              {total} {total === 1 ? "ideia" : "ideias"} de {hitCount}{" "}
              {hitCount === 1 ? "decifrador" : "decifradores"}
              {likely.length > 0 ? ` · ${likely.length} provável(is)` : ""}
            </span>
          ) : (
            <span>Nenhuma interpretação encontrada — tente outra entrada ou uma chave.</span>
          )}
        </div>
      )}

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
    </div>
  );
}
