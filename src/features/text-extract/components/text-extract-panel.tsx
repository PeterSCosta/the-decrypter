import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Textarea } from "@/components/ui/input";
import { useTextExtract } from "../use-text-extract";

export function TextExtractPanel() {
  const { text, setText, extractions, stats } = useTextExtract();
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
        </>
      )}
    </div>
  );
}
