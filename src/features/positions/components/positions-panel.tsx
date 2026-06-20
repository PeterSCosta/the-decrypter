import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { usePositions } from "../use-positions";

export function PositionsPanel() {
  const {
    text,
    setText,
    mode,
    setMode,
    step,
    setStep,
    list,
    setList,
    onlyLetters,
    setOnlyLetters,
    positions,
    result,
  } = usePositions();

  const chars = [...text];
  const previewPositions = positions.slice(0, 12).join(", ") + (positions.length > 12 ? ", …" : "");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">
          Posições — extrair letras
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Pegue letras por <strong>passo fixo</strong> (7, 14, 21…) ou por uma{" "}
          <strong>lista de posições</strong>. Posições começam em 1.
        </p>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Cole o texto aqui…"
        aria-label="Texto de origem"
        autoFocus
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border-strong)] p-0.5">
          {(["step", "list"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-sm font-medium transition-colors",
                mode === m
                  ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {m === "step" ? "Passo fixo" : "Posições específicas"}
            </button>
          ))}
        </div>

        {mode === "step" ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            Contar de
            <Input
              type="number"
              min={1}
              value={step}
              onChange={(e) => setStep(e.target.value)}
              aria-label="Passo"
              className="h-9 w-20 font-mono"
            />
            em {step || "?"}
          </div>
        ) : (
          <div className="relative min-w-[14rem] flex-1">
            <Input
              value={list}
              onChange={(e) => setList(e.target.value)}
              placeholder="ex.: 3 7 12 1"
              aria-label="Lista de posições"
              className="font-mono"
            />
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={onlyLetters}
            onChange={(e) => setOnlyLetters(e.target.checked)}
            className="h-4 w-4 accent-[var(--brand-strong)]"
          />
          Apenas letras
        </label>
      </div>

      {text.trim() === "" ? (
        <p className="text-sm text-[var(--text-muted)]">Cole um texto para começar.</p>
      ) : positions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          {mode === "step" ? "Informe um passo ≥ 1." : "Informe as posições (ex.: 3 7 12)."}
        </p>
      ) : (
        <>
          <p className="text-xs text-[var(--text-secondary)]">
            {result.totalUnits} {onlyLetters ? "letras" : "caracteres"} · pegando as posições{" "}
            <span className="font-mono text-[var(--text-primary)]">{previewPositions}</span>
          </p>

          {/* Resultado */}
          <Card className="flex items-start gap-2 p-4">
            <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-lg text-[var(--text-primary)]">
              {result.result || "—"}
            </pre>
            <CopyButton value={result.result} />
          </Card>

          {/* Texto com as posições destacadas */}
          <div>
            <div className="mb-1 text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
              No texto
            </div>
            <p className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 font-mono text-sm leading-7 text-[var(--text-secondary)]">
              {chars.map((ch, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: chars are positional by nature
                  key={i}
                  className={
                    result.pickedIndices.has(i)
                      ? "rounded bg-[var(--brand)] px-0.5 font-semibold text-[var(--brand-ink)]"
                      : undefined
                  }
                >
                  {ch}
                </span>
              ))}
            </p>
          </div>

          {/* Detalhamento posição → letra */}
          <div className="flex flex-wrap gap-1.5">
            {result.picks.map((p, i) => (
              <span
                key={`${p.position}-${i}`}
                className="inline-flex items-baseline gap-1 rounded-md bg-[var(--surface-sunken)] px-2 py-1 font-mono text-xs"
              >
                <span className="text-[var(--text-muted)]">{p.position}</span>
                <span className="text-[var(--text-primary)]">{p.char === " " ? "␣" : p.char}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
