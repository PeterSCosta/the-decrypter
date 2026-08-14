import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";
import { COLORS } from "../colors";
import { COMPOUNDS } from "../compounds";
import { DOC_FORMATS, lengthLabel } from "../digit-table";
import { LIBRAS, LIBRAS_NOTES, PIGPEN_GROUPS, PIGPEN_NOTES } from "../glyphs";
import { SOURCES_INTRO, sourcesByStatus } from "../sources";

// Documentos/códigos agrupados por quantidade de dígitos (ordem do gabarito).
const DIGIT_GROUPS: [label: string, names: string[]][] = (() => {
  const map = new Map<string, string[]>();
  for (const d of DOC_FORMATS) {
    const k = lengthLabel(d);
    const arr = map.get(k) ?? [];
    arr.push(d.name);
    map.set(k, arr);
  }
  return [...map.entries()];
})();

const ALPHABET = Array.from({ length: 26 }, (_, i) => ({
  letter: String.fromCharCode(65 + i),
  n: i + 1,
  rev: 26 - i,
}));

const COORD_FORMATS: [name: string, example: string][] = [
  ["Graus decimais (DD)", "-26.9906, -48.6356"],
  ["Graus/min/seg (DMS)", `26°59'26"S 48°38'08"W`],
  ["Graus e minutos (DDM)", "26°59.4'S 48°38.1'W"],
  ["UTM", "22J 734643E 7012408N"],
  ["Geohash", "6gjqmq88k7k"],
  ["Plus Code", "585H2957+QQ6"],
  ["Maidenhead", "GG53qa32"],
  ["Quadkey", "210311232332101222"],
  ["H3 (hexágonos)", "89a835d5acbffff"],
  ["what3words", "///palavra.palavra.palavra"],
];

const CHECKLIST: { title: string; items: string[] }[] = [
  {
    title: "Texto",
    items: [
      "1ª/última letra de cada linha ou palavra",
      "Maiúsculas/minúsculas no meio do texto",
      "Letra após ponto/vírgula",
      "Anagrama, contagem de letras/palavras/frases",
      "Letras ou palavras que se repetem",
      "Texto espelhado; leitura vertical ou diagonal",
      "Transformar letra em número (A1Z26)",
      "Verbos de ação (contar, somar, salvar…)",
      "Pesquisar nomes (tradução/significado/origem)",
    ],
  },
  {
    title: "Números & coordenadas",
    items: [
      "Teclado de celular/computador (telefone, CEP)",
      "Números romanos; medidas (polegadas, pés…)",
      "Coordenadas: DD, DMS, DDM, UTM, Geohash, H3…",
      "Jogar o resultado no Google",
    ],
  },
  {
    title: "Imagens",
    items: [
      "Busca reversa (Google Imagens / Lens)",
      "Propriedades do arquivo / EXIF",
      "Cores da prova original",
      "Esteganografia / imagem oculta no PowerPoint",
      "Linkar imagem com partes de Blumenau",
    ],
  },
  {
    title: "Geral · vídeo/som",
    items: [
      "Luz negra, lupa, ferro de passar, vela",
      "Pontos, círculos ou traços além do texto",
      "Notas musicais em letras ou números",
      "Informação oculta no vídeo / propriedades",
    ],
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-display text-sm uppercase tracking-wide text-[var(--text-secondary)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ReferencePanel() {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">Cola — referência</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          As tabelas do gabarito da Equipe Arromba para consulta rápida.
        </p>
      </div>

      {/* CORES */}
      <Section title="Cores">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 text-left text-xs text-[var(--text-muted)]">
                <th className="px-3 py-2 font-medium">Cor</th>
                <th className="px-3 py-2 text-right font-medium">Letras</th>
                <th className="px-3 py-2 text-right font-medium">Soma A1Z26</th>
                <th className="px-3 py-2 text-right font-medium">HEX</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {COLORS.map((c) => (
                <tr key={c.name} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 shrink-0 rounded border border-[var(--border-strong)]"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[var(--text-primary)]">{c.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-[var(--text-secondary)]">
                    {c.letters}
                  </td>
                  <td className="px-3 py-1.5 text-right text-[var(--text-secondary)]">{c.sum}</td>
                  <td className="px-3 py-1.5 text-right text-[var(--text-muted)]">{c.hex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-[var(--text-muted)]">
          No gabarito original, Branco e Preto vêm com o HEX trocado (#000000 / #FFFFFF).
        </p>
      </Section>

      {/* QUANTIDADE DE DÍGITOS */}
      <Section title="Quantidade de dígitos">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {DIGIT_GROUPS.map(([label, names]) => (
                <tr key={label} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="w-16 px-3 py-1.5 text-right align-top font-mono text-[var(--brand-strong)]">
                    {label}
                  </td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">{names.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>

      {/* A1Z26 */}
      <Section title="Alfabeto A1Z26 (normal e invertido)">
        <Card className="overflow-x-auto p-3">
          <table className="w-full min-w-[34rem] text-center font-mono text-xs">
            <tbody>
              <tr>
                <td className="py-1 pr-2 text-left text-[var(--text-muted)]">Letra</td>
                {ALPHABET.map((a) => (
                  <td key={a.letter} className="py-1 text-[var(--text-primary)]">
                    {a.letter}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 pr-2 text-left text-[var(--text-muted)]">Normal</td>
                {ALPHABET.map((a) => (
                  <td key={a.letter} className="py-1 text-[var(--text-secondary)]">
                    {a.n}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 pr-2 text-left text-[var(--text-muted)]">Invertido</td>
                {ALPHABET.map((a) => (
                  <td key={a.letter} className="py-1 text-[var(--text-secondary)]">
                    {a.rev}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>
      </Section>

      {/* FORMATOS DE COORDENADA */}
      <Section title="Formatos de coordenada">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="font-mono">
              {COORD_FORMATS.map(([name, ex]) => (
                <tr key={name} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-3 py-1.5 align-top text-[var(--text-primary)]">{name}</td>
                  <td className="px-3 py-1.5 text-right text-[var(--text-muted)]">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>

      {/* CHECKLIST */}
      <Section title="Checklist de técnicas">
        <div className="grid gap-3 sm:grid-cols-2">
          {CHECKLIST.map((group) => (
            <Card key={group.title} className="p-3">
              <div className="mb-2 text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
                {group.title}
              </div>
              <ul className="flex flex-col gap-1 text-sm text-[var(--text-secondary)]">
                {group.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span className="text-[var(--brand-strong)]">·</span>
                    {it}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      {/* Quem está numa gincana às 23h abre a Cola, não o Roadmap — então o mapa
          das bases (inclusive o que está bloqueado e por quê) mora aqui. */}
      <Section title="Bases e onde consultar">
        <p className="mb-2 text-sm text-[var(--text-secondary)]">{SOURCES_INTRO}</p>
        <div className="flex flex-col gap-3">
          {sourcesByStatus().map((group) => (
            <div key={group.status}>
              <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                <span className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
                  {group.label}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{group.hint}</span>
              </div>
              <div className="flex flex-col gap-2">
                {group.items.map((s) => (
                  <Card key={s.id} className="p-3">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-display text-sm text-[var(--text-primary)]">
                        {s.name}
                      </span>
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        {s.indexes}
                      </span>
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto shrink-0 text-xs text-[var(--text-secondary)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-primary)]"
                        >
                          {s.urlLabel}
                        </a>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{s.use}</p>
                    {s.note ? (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{s.note}</p>
                    ) : null}
                    {s.anchors?.length ? (
                      <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                        {s.anchors.join(" · ")}
                      </p>
                    ) : null}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Pigpen não pode virar decoder: não há bloco Unicode e a entrada é
          imagem. Descrever o glifo é mais lento do que olhar a legenda. */}
      <Section title="Pigpen / maçônico">
        <div className="flex flex-col gap-3">
          {PIGPEN_GROUPS.map((g) => (
            <div key={g.grid}>
              <div className="mb-1.5 text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
                {g.title}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {g.letters.map((gl) => (
                  <Card key={gl.letter} className="flex flex-col items-center gap-1 p-2">
                    <pre className="font-mono text-[0.6875rem] leading-tight text-[var(--text-secondary)]">
                      {gl.ascii.join("\n")}
                    </pre>
                    <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                      {gl.letter}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          <ul className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
            {PIGPEN_NOTES.map((n) => (
              <li key={n}>· {n}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Libras — alfabeto manual">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {LIBRAS.map((s) => (
                <tr key={s.letter} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-3 py-1.5 align-top font-mono font-semibold text-[var(--text-primary)]">
                    {s.letter}
                  </td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">
                    {s.hand}
                    {s.movement ? (
                      <span className="block text-xs text-[var(--color-pulse-600)]">
                        movimento: {s.movement}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <ul className="mt-2 flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          {LIBRAS_NOTES.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      </Section>

      <Section title="Compostos químicos (nome → fórmula)">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="font-mono">
              {COMPOUNDS.map((c) => (
                <tr
                  key={c.formula}
                  className="border-b border-[var(--border-subtle)] last:border-0"
                >
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{c.name}</td>
                  <td className="px-3 py-1.5 text-right text-[var(--text-muted)]">{c.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>
    </div>
  );
}
