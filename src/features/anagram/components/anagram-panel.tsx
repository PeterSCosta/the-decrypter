import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { Loader2, Shuffle, Sparkles } from "lucide-react";
import { MAX_INPUT_LETTERS } from "../solve";
import { type AnagramSource, MIN_PAIR_LETTERS, useAnagram } from "../use-anagram";

const SOURCES: { id: AnagramSource; label: string; full: string }[] = [
  { id: "pt", label: "PT", full: "Português" },
  { id: "en", label: "EN", full: "Inglês" },
  { id: "both", label: "PT+EN", full: "Português e inglês" },
  { id: "ruas", label: "Ruas", full: "Bairros e ruas de Blumenau" },
];

const LEFTOVERS = [
  { value: 0, label: "Exato", full: "Sem sobra de letras" },
  { value: 1, label: "+1", full: "Deixa sobrar 1 letra" },
  { value: 2, label: "+2", full: "Deixa sobrar até 2 letras" },
];

const segmentBase =
  "rounded-[calc(var(--radius-md)-2px)] px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm";
const segmentOn = "bg-[var(--brand)] text-[var(--brand-ink)]";
const segmentOff = "text-[var(--text-secondary)] hover:text-[var(--text-primary)]";

export function AnagramPanel() {
  const {
    input,
    setInput,
    source,
    setSource,
    maxLeftover,
    setMaxLeftover,
    twoWords,
    setTwoWords,
    canPair,
    results,
    truncated,
    relaxedCount,
    relax,
    loading,
    letterCount,
    tooLong,
  } = useAnagram();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">Anagramas</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Digite letras (ou uma palavra) e veja o que o dicionário forma com{" "}
          <strong>as mesmas letras</strong> — em uma palavra, em duas, ou deixando sobrar uma pista.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Shuffle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex.: amor · ummapa · giores"
            aria-label="Letras para anagrama"
            className="pl-9 font-mono"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-4 gap-0.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] p-0.5">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSource(s.id)}
              title={s.full}
              aria-label={s.full}
              aria-pressed={source === s.id}
              className={cn(segmentBase, source === s.id ? segmentOn : segmentOff)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border-strong)] p-0.5">
            {LEFTOVERS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setMaxLeftover(l.value)}
                title={l.full}
                aria-pressed={maxLeftover === l.value}
                className={cn(segmentBase, maxLeftover === l.value ? segmentOn : segmentOff)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTwoWords(!twoWords)}
            disabled={!canPair}
            aria-pressed={twoWords}
            title={
              canPair
                ? "Procura pares de palavras (ex.: ummapa → um mapa)"
                : `A partir de ${MIN_PAIR_LETTERS} letras`
            }
            className={cn(
              "rounded-[var(--radius-md)] border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              twoWords
                ? "border-[var(--brand-strong)] bg-[var(--brand)] text-[var(--brand-ink)]"
                : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              !canPair && "cursor-not-allowed opacity-40",
            )}
          >
            Duas palavras
          </button>
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
      ) : tooLong ? (
        <p className="text-sm text-[var(--text-muted)]">
          Até {MAX_INPUT_LETTERS} letras por busca ({letterCount} agora).
        </p>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-[var(--text-muted)]">Nenhum anagrama encontrado.</p>
          {relaxedCount > 0 && (
            <button
              type="button"
              onClick={relax}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 py-1.5 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--brand-strong)]"
            >
              <Sparkles className="h-4 w-4 text-[var(--brand-strong)]" />
              {relaxedCount} com duas palavras ou sobra de letra
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <span className="text-xs text-[var(--text-secondary)]">
            {results.length} {results.length === 1 ? "combinação" : "combinações"} com as{" "}
            {letterCount} letras
            {maxLeftover > 0 &&
              ` · sobra de até ${maxLeftover} ${maxLeftover === 1 ? "letra" : "letras"}`}
            {/* Lista parcial nunca é apresentada como lista completa. */}
            {truncated && " · lista parcial, refine as letras"}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {results.map((h) => (
              <span
                key={`${h.words.join(" ")}|${h.leftover}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface-sunken)] px-2.5 py-1 font-mono text-sm text-[var(--text-primary)]"
              >
                {h.words.map((w, i) => (
                  <span key={`${i}-${w}`}>
                    {i > 0 && <span className="mr-1.5 text-[var(--text-muted)]">·</span>}
                    {w}
                  </span>
                ))}
                {h.leftover && (
                  // A letra que sobra costuma ser o índice da camada seguinte:
                  // mostrar QUAL sobrou é a informação, não o fato de ter sobrado.
                  <span
                    className="text-[var(--pulse)]"
                    title={`Sobra: ${h.leftover.toUpperCase()}`}
                  >
                    +{h.leftover.toUpperCase()}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
