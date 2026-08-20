import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Loader2, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { MAX_RESULTADOS, buscarPorPadrao } from "../padrao";
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
    palavras,
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

      <BuscaPorPadrao palavras={palavras} carregando={loading} />
    </div>
  );
}

/**
 * BUSCA POR PADRÃO — o que fazer quando os solvers calam.
 *
 * O solver de substituição não emite abaixo de 200 letras e o quebrador de
 * Vigenère precisa de 150. Abaixo disso a bancada cala, e a prova curta existe:
 * seis letras num muro, uma palavra num acróstico. Aqui a pessoa sabe a FORMA e
 * pergunta que palavras existem.
 *
 * Vive na aba Anagramas porque o vocabulário já está carregado aqui — e porque
 * uma lista de candidatas é ferramenta, não resposta: ela não pode virar card no
 * leque do Decodificador.
 */
function BuscaPorPadrao({ palavras, carregando }: { palavras: string[]; carregando: boolean }) {
  const [padrao, setPadrao] = useState("");
  const deb = useDebouncedValue(padrao, 250);

  const busca = useMemo(() => {
    if (!deb.trim() || palavras.length === 0) return null;
    return buscarPorPadrao(palavras, deb);
  }, [deb, palavras]);

  return (
    <section className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5">
      <div>
        <h3 className="font-display text-sm uppercase tracking-wide text-[var(--text-secondary)]">
          Buscar palavra por padrão
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          <code className="font-mono text-[var(--text-primary)]">p?nt?</code> — letra é literal,{" "}
          <code className="font-mono text-[var(--text-primary)]">?</code> é uma letra qualquer e{" "}
          <code className="font-mono text-[var(--text-primary)]">*</code> é um trecho qualquer.{" "}
          <strong>Só dígitos</strong> vira molde de repetição:{" "}
          <code className="font-mono text-[var(--text-primary)]">1221</code> acha <em>anna</em> e{" "}
          <em>otto</em> — a forma que resolve criptograma curto, quando não se sabe QUE letra é
          qual, só onde a mesma se repete.
        </p>
      </div>

      <Input
        value={padrao}
        onChange={(e) => setPadrao(e.target.value)}
        placeholder="p?nt?  ·  *ção  ·  1221"
        aria-label="Padrão da palavra"
        className="font-mono"
      />

      {carregando && palavras.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)]">Carregando o vocabulário…</p>
      )}

      {busca && (
        <>
          <p className="text-xs text-[var(--text-tertiary)]">
            {busca.lido.tipo === "invalido"
              ? busca.lido.descricao
              : `${busca.lido.descricao} ${busca.achados.length} palavra${busca.achados.length === 1 ? "" : "s"}${busca.truncado ? ` (cortado em ${MAX_RESULTADOS})` : ""}.`}
          </p>
          {busca.achados.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm text-[var(--text-primary)]">
              {busca.achados.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
