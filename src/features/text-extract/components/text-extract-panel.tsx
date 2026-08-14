import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input, Textarea } from "@/components/ui/input";
import { useTextExtract } from "../use-text-extract";

export function TextExtractPanel() {
  const { text, setText, countChar, setCountChar, extractions, stats, series } = useTextExtract();
  const hasText = text.trim() !== "";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">Extrator de texto</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Cole um texto e veja as <strong>mensagens escondidas</strong> por todas as técnicas da
          coluna TEXTO do gabarito: iniciais/finais de linhas e palavras, maiúsculas, leitura em
          coluna, espelhamento e mais.
        </p>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Cole o texto da prova aqui…"
        aria-label="Texto de origem"
        rows={6}
        autoFocus
      />

      {!hasText ? (
        <p className="text-sm text-[var(--text-muted)]">Cole um texto para começar.</p>
      ) : (
        <>
          <p className="text-xs text-[var(--text-secondary)]">
            <span className="font-mono text-[var(--text-primary)]">{stats.letters}</span> letras ·{" "}
            <span className="font-mono text-[var(--text-primary)]">{stats.words}</span> palavras ·{" "}
            <span className="font-mono text-[var(--text-primary)]">{stats.sentences}</span> frases ·{" "}
            <span className="font-mono text-[var(--text-primary)]">{stats.lines}</span> linhas
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {extractions.map((ex) => (
              <Card key={ex.id} className="flex items-start gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
                    {ex.label}
                  </div>
                  <pre className="mt-1 min-w-0 whitespace-pre-wrap break-words font-mono text-sm text-[var(--text-primary)]">
                    {ex.value || "—"}
                  </pre>
                </div>
                {ex.value ? <CopyButton value={ex.value} /> : null}
              </Card>
            ))}
          </div>

          {/* Contagem como chave: no acervo, a série quase nunca é a resposta —
              é o número que a camada seguinte consome, daí a leitura A1Z26 ao lado. */}
          {series.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-sm text-[var(--text-primary)]">
                  Contagens (contar como chave)
                </h3>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  contar o caractere
                  <Input
                    value={countChar}
                    onChange={(e) => setCountChar(e.target.value)}
                    placeholder="ex.: a"
                    aria-label="Caractere a contar por linha"
                    className="h-8 w-16 font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {series.map((s) => (
                  <Card key={s.id} className="flex items-start gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
                        {s.label}
                      </div>
                      <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-sm text-[var(--text-primary)]">
                        {s.raw || "—"}
                      </pre>
                      {s.letters ? (
                        <div className="mt-1 font-mono text-sm text-[var(--brand-strong)]">
                          A1Z26: {s.letters}
                        </div>
                      ) : null}
                    </div>
                    {s.raw ? <CopyButton value={s.letters ?? s.raw} /> : null}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
