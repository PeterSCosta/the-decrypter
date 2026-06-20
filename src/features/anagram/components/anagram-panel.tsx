import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { Loader2, Shuffle } from "lucide-react";
import { type AnagramLang, useAnagram } from "../use-anagram";

const LANGS: { id: AnagramLang; label: string }[] = [
  { id: "pt", label: "Português" },
  { id: "en", label: "Inglês" },
  { id: "both", label: "Ambos" },
];

export function AnagramPanel() {
  const { input, setInput, lang, setLang, results, loading, letterCount } = useAnagram();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">Anagramas</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Digite letras (ou uma palavra) e veja todas as palavras do dicionário com{" "}
          <strong>exatamente as mesmas letras</strong>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Shuffle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex.: amor · roma · listen"
            aria-label="Letras para anagrama"
            className="pl-9 font-mono"
            autoFocus
          />
        </div>
        <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border-strong)] p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              className={cn(
                "rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-sm font-medium transition-colors",
                lang === l.id
                  ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando dicionário…
        </p>
      ) : input.trim() === "" ? (
        <p className="text-sm text-[var(--text-muted)]">Digite letras para procurar anagramas.</p>
      ) : letterCount < 2 ? (
        <p className="text-sm text-[var(--text-muted)]">Use ao menos 2 letras.</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Nenhum anagrama encontrado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <span className="text-xs text-[var(--text-secondary)]">
            {results.length} {results.length === 1 ? "palavra" : "palavras"} com as mesmas letras
          </span>
          <div className="flex flex-wrap gap-1.5">
            {results.map((w) => (
              <span
                key={w}
                className="rounded-md bg-[var(--surface-sunken)] px-2.5 py-1 font-mono text-sm text-[var(--text-primary)]"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
