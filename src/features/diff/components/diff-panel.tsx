import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { ArrowLeftRight } from "lucide-react";
import type { ReactNode } from "react";
import { type DiffSide, MAX_CHARS, type Segment, formatCounts, segments } from "../diff";
import { useDiff } from "../use-diff";

const SIDES: [DiffSide, string][] = [
  ["a", "alterado"],
  ["b", "fonte"],
];

/** Escolhe de qual lado do par sai a tira — os dois anchors do acervo pedem lados opostos. */
function SideToggle({
  value,
  onChange,
  label,
}: {
  value: DiffSide;
  onChange: (side: DiffSide) => void;
  label: string;
}) {
  return (
    <span
      className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border-strong)] p-0.5"
      aria-label={label}
    >
      {SIDES.map(([side, rotulo]) => (
        <button
          key={side}
          type="button"
          onClick={() => onChange(side)}
          aria-pressed={value === side}
          className={cn(
            "rounded-[calc(var(--radius-sm)-1px)] px-1.5 py-0.5 text-[0.6875rem] font-medium transition-colors",
            value === side
              ? "bg-[var(--brand)] text-[var(--brand-ink)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          )}
        >
          {rotulo}
        </button>
      ))}
    </span>
  );
}

function Strip({
  label,
  hint,
  value,
  toggle,
}: {
  label: string;
  hint: string;
  value: string;
  toggle?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-1.5 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        {toggle}
        <CopyButton value={value} className="ml-auto" />
      </div>
      <pre className="whitespace-pre-wrap break-words font-mono text-base text-[var(--text-primary)]">
        {value || "—"}
      </pre>
      <p className="text-xs text-[var(--text-secondary)]">{hint}</p>
    </Card>
  );
}

/** Leitura com os trechos realçados — é onde se vê que o par casou no lugar certo. */
function Reading({ title, segs }: { title: string; segs: Segment[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </div>
      <p className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 font-mono text-sm leading-7 text-[var(--text-secondary)]">
        {segs.map((s, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: os pedaços são posicionais
            key={i}
            className={
              s.changed
                ? "rounded bg-[var(--brand)] px-0.5 font-semibold text-[var(--brand-ink)]"
                : undefined
            }
          >
            {s.text}
          </span>
        ))}
      </p>
    </div>
  );
}

function Counter({ length, truncated }: { length: number; truncated: boolean }) {
  return (
    <span
      className={cn(
        "font-mono text-[0.6875rem]",
        truncated ? "text-[var(--color-pulse-600)]" : "text-[var(--text-muted)]",
      )}
    >
      {length.toLocaleString("pt-BR")} / {MAX_CHARS.toLocaleString("pt-BR")}
      {truncated ? " · comparei só o começo" : ""}
    </span>
  );
}

export function DiffPanel() {
  const {
    textA,
    setTextA,
    textB,
    setTextB,
    comparedA,
    comparedB,
    pending,
    result,
    strips,
    lettersSide,
    setLettersSide,
    countsSide,
    setCountsSide,
    swap,
  } = useDiff();

  const hunks = result?.hunks.length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">
          Diff — o texto da prova contra a fonte
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Cole de um lado o texto como veio na prova e do outro o original (Wikipédia, notícia, site
          citado). O diff <strong>quase nunca é a resposta</strong> — a resposta é um subproduto
          dele: as palavras trocadas, as letras que as corrigem ou a contagem de letras de cada
          trecho. Compara sem acento e sem caixa, mas devolve a grafia do texto.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Texto alterado (o da prova)
            </span>
            <Counter length={textA.length} truncated={result?.truncatedA ?? false} />
          </div>
          <Textarea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="Cole aqui o texto como ele veio na prova…"
            aria-label="Texto alterado"
            className="min-h-[10rem]"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Fonte original</span>
            <Counter length={textB.length} truncated={result?.truncatedB ?? false} />
          </div>
          <Textarea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder="Cole aqui o texto original que você encontrou…"
            aria-label="Fonte original"
            className="min-h-[10rem]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={swap}
          disabled={textA === "" && textB === ""}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Trocar lados
        </Button>
        <span className="text-xs text-[var(--text-secondary)]">
          {pending
            ? "comparando…"
            : !result
              ? "Cole os dois textos para começar."
              : hunks === 0
                ? "Nada trocado: os dois textos dizem a mesma coisa."
                : `${hunks} ${hunks === 1 ? "trecho difere" : "trechos diferem"}`}
        </span>
      </div>

      {result && strips && hunks > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Strip
              label="(a) palavras trocadas"
              hint="As que não estão no original, na ordem. Traduza, junte as iniciais, leia como endereço."
              value={strips.changed.filter(Boolean).join(" ")}
            />
            <Strip
              label="(b) originais correspondentes"
              hint="O que a fonte dizia no mesmo lugar — o par de cada trecho acima."
              value={strips.original.filter(Boolean).join(" ")}
            />
            <Strip
              label="(c) letras que mudaram"
              hint="Letra a letra dentro de cada par. A que corrige a palavra errada costuma ser a resposta — e costuma vir embaralhada."
              value={strips.letters.join("")}
              toggle={
                <SideToggle
                  value={lettersSide}
                  onChange={setLettersSide}
                  label="Lado das letras que mudaram"
                />
              }
            />
            <Strip
              label="(d) contagem de letras"
              hint="Quantas letras tem cada trecho, na ordem. Cola direto no campo de posições da aba Posições."
              value={formatCounts(strips.counts)}
              toggle={
                <SideToggle
                  value={countsSide}
                  onChange={setCountsSide}
                  label="Lado da contagem de letras"
                />
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Reading
              title="No texto alterado"
              segs={segments(comparedA, result.tokensA, result.changedA)}
            />
            <Reading
              title="Na fonte original"
              segs={segments(comparedB, result.tokensB, result.changedB)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
