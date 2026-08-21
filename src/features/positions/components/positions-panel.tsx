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
    aviso,
    sources,
    zipResult,
  } = usePositions();

  const chars = [...text];
  const previewPositions = positions.slice(0, 12).join(", ") + (positions.length > 12 ? ", …" : "");
  const multi = mode === "zip" || mode === "const";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">
          Posições — extrair letras
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Num texto só: <strong>passo fixo</strong> (7, 14, 21…) ou{" "}
          <strong>lista de posições</strong>. Em <strong>várias fontes</strong> — uma por linha —
          cada linha entrega uma letra. Posições começam em 1; índice negativo conta do fim.
        </p>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          multi ? "Uma fonte por linha…\nLucius Verus\nCommodus\nAugustus" : "Cole o texto aqui…"
        }
        aria-label="Texto de origem"
        autoFocus
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border-strong)] p-0.5">
          {(
            [
              ["step", "Passo fixo"],
              ["list", "Posições"],
              ["zip", "N fontes × N índices"],
              ["const", "N fontes × 1 índice"],
            ] as const
          ).map(([m, rotulo]) => (
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
              {rotulo}
            </button>
          ))}
        </div>

        {multi ? (
          <div className="relative min-w-[14rem] flex-1">
            <Input
              value={list}
              onChange={(e) => setList(e.target.value)}
              placeholder={mode === "zip" ? "ex.: 1 5 2 4 4 3 · I V II IV · A3L6" : "ex.: 5 ou -5"}
              aria-label="Índices"
              className="font-mono"
            />
          </div>
        ) : mode === "step" ? (
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
      ) : multi ? (
        !zipResult ? (
          <p className="text-sm text-[var(--text-muted)]">
            {mode === "zip"
              ? "Informe um índice por fonte (ex.: 1 5 2 4 4 3), ou algarismos romanos."
              : "Informe o índice a aplicar em todas as fontes (ex.: 5, ou -5 para contar do fim)."}
          </p>
        ) : (
          <>
            <p className="text-xs text-[var(--text-secondary)]">
              {sources.length} {sources.length === 1 ? "fonte" : "fontes"} ·{" "}
              {zipResult.picks.length} {zipResult.picks.length === 1 ? "índice" : "índices"}
              {zipResult.misses > 0 ? (
                <span className="text-[var(--color-pulse-600)]">
                  {" "}
                  · {zipResult.misses} caíram fora da fonte
                </span>
              ) : null}
            </p>

            <Card className="flex items-start gap-2 p-4">
              <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-lg text-[var(--text-primary)]">
                {zipResult.result || "—"}
              </pre>
              <CopyButton value={zipResult.result} />
            </Card>

            {/* Uma linha por fonte: é onde se vê que o índice caiu no lugar certo. */}
            <div className="flex flex-col gap-1">
              {zipResult.picks.map((p, i) => (
                <div
                  key={`${p.source}-${p.position}-${i}`}
                  className="flex items-baseline gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-sm"
                >
                  <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">
                    {p.fromEnd ? `-${p.position}` : p.position}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
                    {p.source}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 font-mono font-semibold",
                      p.char
                        ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                        : "text-[var(--color-pulse-600)]",
                    )}
                  >
                    {p.char || "fora"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )
      ) : positions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          {mode === "step" ? "Informe um passo ≥ 1." : "Informe as posições (ex.: 3 7 12)."}
        </p>
      ) : (
        <>
          {/*
            O achatamento não é errado — às vezes é a leitura desejada. O que era
            errado é entregá-lo calado: `8-4-3` vira [8,4,3] e a tela mostrava
            isso com cara de resposta. O aviso vem ANTES do resultado.
          */}
          {aviso ? (
            <p className="rounded-[var(--radius-sm)] border border-[var(--color-pulse-600)]/40 bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--color-pulse-600)]">
              {aviso}
            </p>
          ) : null}

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
