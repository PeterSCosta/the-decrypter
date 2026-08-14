import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { CircleSlash, Eye, Languages, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import {
  type FontStatus,
  GLYPH_SIZE_LABEL,
  GLYPH_SIZE_PX,
  GRID_BANDS,
  type GlyphSize,
  type RefCell,
  STATUS_LABEL,
  SYMBOL_FONTS,
  type SymbolFont,
  referenceCells,
} from "../fonts";
import { useFonts } from "../use-fonts";

/**
 * Como a grade é desenhada para cada estado da fonte. `bloqueado` é o estado
 * que justifica a aba inteira: sem a fonte instalada o navegador mostraria as
 * letras latinas caladamente, e quem está casando símbolo com a imagem da prova
 * leria tudo errado achando que viu o glifo.
 */
type RenderMode = "fonte" | "unicode" | "bloqueado" | "checando";

function renderMode(font: SymbolFont, status: FontStatus): RenderMode {
  if (status === "checando") return "checando";
  if (status === "ausente") return font.hasUnicodeEquivalent ? "unicode" : "bloqueado";
  return "fonte"; // disponível — e "indeterminado", que renderiza com ressalva
}

const STATUS_TONE: Record<FontStatus, "neutral" | "success" | "pulse"> = {
  checando: "neutral",
  disponivel: "success",
  ausente: "pulse",
  indeterminado: "neutral",
};

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-sm uppercase tracking-wide text-[var(--text-secondary)]">
          {title}
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{hint}</p>
      </div>
      {children}
    </section>
  );
}

/** Aviso honesto: sem a fonte, não há símbolo nenhum para mostrar. */
function MissingFont({ font }: { font: SymbolFont }) {
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-pulse-200)] bg-[var(--color-pulse-50)] p-3">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-pulse-600)]" />
      <div className="min-w-0 text-sm text-[var(--color-pulse-700)]">
        <p className="font-medium">Esta máquina não tem a {font.label}.</p>
        <p className="mt-0.5">
          Não mostro nada no lugar: o navegador desenharia as letras normais, e você compararia
          letra com símbolo sem perceber. {font.source}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: FontStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

/** Uma célula da grade: o desenho em cima, a tecla que o produz embaixo. */
function Cell({
  cell,
  font,
  mode,
  px,
}: {
  cell: RefCell;
  font: SymbolFont;
  mode: RenderMode;
  px: number;
}) {
  const titulo = cell.name
    ? `${cell.char} → ${cell.name}${cell.quirk ? ` — ${cell.quirk}` : ""}`
    : cell.char;

  return (
    <div
      title={titulo}
      className={cn(
        "flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-1 py-2",
        cell.quirk && "border-[var(--color-warning-600)]/40",
      )}
    >
      <span
        className="flex items-center justify-center leading-none text-[var(--text-primary)]"
        style={{
          // A família só entra quando ela existe; no modo unicode o glifo é um
          // caractere de verdade e renderiza com a fonte normal da página.
          fontFamily: mode === "fonte" ? font.family : undefined,
          fontSize: `${px}px`,
          minHeight: `${px}px`,
        }}
      >
        {mode === "unicode" ? (cell.equivalent ?? cell.char) : cell.char}
      </span>
      <span className="font-mono text-[0.6875rem] leading-none text-[var(--text-muted)]">
        {cell.char}
      </span>
      {mode === "fonte" && cell.equivalent ? (
        <span className="font-mono text-[0.6875rem] leading-none text-[var(--text-secondary)]">
          {cell.equivalent}
        </span>
      ) : null}
    </div>
  );
}

export function FontsPanel() {
  const {
    text,
    setText,
    amostra,
    shown,
    toggle,
    fonts,
    availability,
    gridFontId,
    setGridFontId,
    gridFont,
    size,
    setSize,
    greek,
    styles,
  } = useFonts();

  const gridStatus = availability[gridFont.id] ?? "checando";
  const gridMode = renderMode(gridFont, gridStatus);
  const px = GLYPH_SIZE_PX[size];
  /** Coluna = glifo + a tecla embaixo + respiro; sem isso a grade estoura em 375px. */
  const colunaMin = `${px + 26}px`;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">
          Fontes — ler os símbolos da prova
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Quando a prova chega como <strong>imagem de símbolos</strong> (a P22 de 2023 veio em
          Wingdings), o que resolve é a <strong>grade de referência</strong>: casar cada desenho da
          imagem com a letra que o produz. Renderizar o seu texto é o caminho de volta — útil para
          conferir a leitura.
        </p>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Digite ou cole o texto… (vazio, mostro uma amostra)"
        aria-label="Texto para exibir nas fontes"
        className="min-h-[5rem]"
        autoFocus
      />

      {/* ------------------------------------------------ fontes do sistema --- */}
      <Section
        title="Fontes de símbolo (do sistema)"
        hint={
          <>
            São <strong>fontes</strong>, não caracteres: o símbolo é o desenho que a fonte dá para a
            letra. Não dá para copiar o glifo, e ele só aparece se a fonte estiver instalada nesta
            máquina — por isso cada uma abaixo diz se está.
          </>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {SYMBOL_FONTS.map((f) => {
            const st = availability[f.id] ?? "checando";
            const on = shown.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                aria-pressed={on}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors",
                  on
                    ? "border-transparent bg-[var(--brand)] text-[var(--brand-ink)]"
                    : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {f.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    st === "disponivel"
                      ? "bg-[var(--color-success-600)]"
                      : st === "ausente"
                        ? "bg-[var(--color-pulse-500)]"
                        : "bg-[var(--text-muted)]",
                  )}
                />
              </button>
            );
          })}
        </div>

        {fonts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Escolha ao menos uma fonte acima.</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {fonts.map((f) => {
            const st = availability[f.id] ?? "checando";
            const mode = renderMode(f, st);
            return (
              <Card key={f.id} className="flex min-w-0 flex-col gap-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{f.label}</span>
                  <StatusBadge status={st} />
                </div>

                {mode === "checando" ? (
                  <p className="text-sm text-[var(--text-muted)]">Verificando a instalação…</p>
                ) : mode === "bloqueado" ? (
                  <MissingFont font={f} />
                ) : (
                  <p
                    className="break-words text-[var(--text-primary)]"
                    style={{
                      fontFamily: mode === "fonte" ? f.family : undefined,
                      fontSize: "26px",
                    }}
                    lang={mode === "unicode" ? "el" : undefined}
                  >
                    {mode === "unicode" ? greek.comoSymbol : amostra}
                  </p>
                )}

                {mode === "unicode" ? (
                  <p className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                    <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />A fonte não está aqui, mas os
                    glifos dela existem em Unicode: acima está o grego equivalente, que renderiza em
                    qualquer máquina.
                  </p>
                ) : null}

                {st === "indeterminado" ? (
                  <p className="flex items-start gap-1.5 text-xs text-[var(--color-pulse-700)]">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Não consegui medir a fonte nesta máquina — se o que aparece acima são letras
                    normais, ela não está instalada.
                  </p>
                ) : null}

                <p className="text-xs text-[var(--text-secondary)]">{f.note}</p>

                <div className="mt-auto flex items-center gap-2 border-t border-[var(--border-subtle)] pt-2">
                  <span className="min-w-0 flex-1 text-[0.6875rem] text-[var(--text-muted)]">
                    {f.hasUnicodeEquivalent
                      ? "Copia o grego — este sim é caractere de verdade."
                      : "Copia as LETRAS: o desenho não é caractere, ele só existe com a fonte aplicada."}
                  </span>
                  <CopyButton value={f.hasUnicodeEquivalent ? greek.comoSymbol : amostra} />
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* --------------------------------------------- grade de referência --- */}
      <Section
        title="Grade de referência"
        hint={
          <>
            A tabela que resolve a prova: cada desenho da imagem, e ao lado a{" "}
            <strong>tecla que o produz</strong>. Compare glifo a glifo e leia a mensagem.
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex flex-wrap gap-1.5">
            {SYMBOL_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setGridFontId(f.id)}
                aria-pressed={gridFontId === f.id}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-sm transition-colors",
                  gridFontId === f.id
                    ? "border-transparent bg-[var(--brand)] text-[var(--brand-ink)]"
                    : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border-strong)] p-0.5">
            {(Object.keys(GLYPH_SIZE_PX) as GlyphSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={cn(
                  "rounded-[calc(var(--radius-md)-2px)] px-2.5 py-1 text-sm font-medium transition-colors",
                  size === s
                    ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {GLYPH_SIZE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={gridStatus} />
          <span className="text-xs text-[var(--text-secondary)]">{gridFont.source}</span>
        </div>

        {gridStatus === "indeterminado" ? (
          // É aqui que a ressalva mais importa: a grade é o que se compara com a
          // imagem da prova, e uma grade de letras latinas passaria por gabarito.
          <p className="flex items-start gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-pulse-200)] bg-[var(--color-pulse-50)] p-2.5 text-xs text-[var(--color-pulse-700)]">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Não consegui medir a fonte nesta máquina. Se a grade abaixo mostrar letras comuns em vez
            de símbolos, é porque a {gridFont.label} não está instalada — não use como gabarito.
          </p>
        ) : null}

        {gridMode === "checando" ? (
          <p className="text-sm text-[var(--text-muted)]">Verificando a instalação…</p>
        ) : gridMode === "bloqueado" ? (
          <MissingFont font={gridFont} />
        ) : (
          <div className="flex flex-col gap-4">
            {gridMode === "unicode" ? (
              <p className="flex items-start gap-1.5 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-2.5 text-xs text-[var(--text-secondary)]">
                <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Sem a fonte instalada — mas a Symbol é o alfabeto grego, e o grego é Unicode. A
                grade abaixo mostra o glifo verdadeiro, não um substituto latino.
              </p>
            ) : null}

            {GRID_BANDS.map((band) => {
              const cells = referenceCells(gridFont, band);
              const vazio = gridMode === "unicode" && cells.every((c) => c.equivalent === null);
              return (
                <div key={band.id} className="flex flex-col gap-1.5">
                  <div className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
                    {band.label}
                  </div>
                  {vazio ? (
                    <p className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <CircleSlash className="h-3.5 w-3.5 shrink-0" />
                      Nesta faixa a fonte não troca nada: os dígitos saem iguais.
                    </p>
                  ) : (
                    <div
                      className="grid gap-1.5"
                      style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(${colunaMin}, 1fr))`,
                      }}
                    >
                      {cells.map((cell) => (
                        <Cell key={cell.char} cell={cell} font={gridFont} mode={gridMode} px={px} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {gridFont.hasUnicodeEquivalent ? (
              <p className="text-xs text-[var(--text-secondary)]">
                Quatro teclas não seguem o som da letra:{" "}
                <span className="font-mono text-[var(--text-primary)]">J</span> dá ϑ,{" "}
                <span className="font-mono text-[var(--text-primary)]">V</span> dá ς,{" "}
                <span className="font-mono text-[var(--text-primary)]">j</span> dá ϕ e{" "}
                <span className="font-mono text-[var(--text-primary)]">v</span> dá ϖ. É onde a
                transcrição costuma errar.
              </p>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">
                Sem legenda por glifo de propósito: nas dingbats a correspondência com Unicode é
                parcial e disputada, e um palpite com cara de tabela faria você ler a prova errado.
                Case pelo desenho.
              </p>
            )}
          </div>
        )}
      </Section>

      {/* ------------------------------------------------- Symbol ⇄ grego --- */}
      <Section
        title="Symbol — latim ⇄ grego"
        hint={
          <>
            A Symbol não é dingbat: ela é o alfabeto grego. A direção segue o que você digitou —
            colou grego, devolvo as teclas.
          </>
        }
      >
        <Card className="flex items-start gap-2 p-3">
          <div className="min-w-0 flex-1">
            <div className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
              {greek.paraLatino ? "grego → teclas latinas" : "latim → grego da Symbol"}
            </div>
            <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-lg text-[var(--text-primary)]">
              {greek.value || "—"}
            </pre>
          </div>
          <CopyButton value={greek.value} />
        </Card>
      </Section>

      {/* ---------------------------------------------- estilos Unicode --- */}
      <Section
        title="Estilos Unicode (copiáveis)"
        hint={
          <>
            Aqui não há fonte nenhuma: cada letra é um <strong>caractere diferente</strong>.
            Funciona em qualquer máquina e cola em qualquer lugar. Caractere sem par no bloco sai
            intacto — é o que acontece com os acentos.
          </>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {styles.map((s) => (
            <div
              key={s.id}
              className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
                  {s.nome}
                </span>
                {s.inverteOrdem ? <Badge tone="pulse">ordem invertida</Badge> : null}
                <CopyButton value={s.value} className="ml-auto" />
              </div>
              <p className="break-words text-base text-[var(--text-primary)]">{s.value}</p>
              <span className="font-mono text-[0.625rem] text-[var(--text-muted)]">{s.bloco}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
