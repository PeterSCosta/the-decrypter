import { Card } from "@/components/ui/card";
import { GRUPOS_GEO } from "@/features/geo/formatos";
import type { ReactNode } from "react";
import {
  ICS_NOTAS,
  ICS_SIGNIFICADOS,
  NYCTOGRAFICO_NOTAS,
  RUNAS_ARMADILHAS,
  RUNAS_NOTAS,
} from "../alfabetos-visuais";
import { COLORS } from "../colors";
import { COMPOUNDS } from "../compounds";
import { DOC_FORMATS, lengthLabel } from "../digit-table";
import { LIBRAS, LIBRAS_NOTES, PIGPEN_GROUPS, PIGPEN_NOTES } from "../glyphs";
import { REGUA_IC, REGUA_IC_NOTAS } from "../regua-ic";
import { SOLETRACAO, SOLETRACAO_DIGITOS, SOLETRACAO_NOTAS } from "../soletracao";
import { BANCADAS_EXTERNAS, SOURCES_INTRO, sourcesByStatus } from "../sources";

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

/**
 * Os formatos de coordenada, DERIVADOS da aba de Geolocalização.
 *
 * Aqui havia uma lista de dez escrita à mão, e ela envelheceu: `geo/formatos.ts`
 * se declara a fonte única e tem 26 fichas. Quem abria a Cola sob pressão não
 * via MGRS, GEOREF, GARS, carta e grade do IBGE, Mapcode, GeoTude, Placekey,
 * C-squares, Geo URI, ISO 6709, link do OSM nem a estação geodésica — metade do
 * que a bancada lê. Duas listas do mesmo assunto sempre divergem; agora é uma.
 */
const COORD_FORMATS: [name: string, example: string][] = GRUPOS_GEO.flatMap((g) =>
  g.formatos.map((f): [string, string] => [f.nome, f.exemplo.entrada]),
);

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

/** Lista de notas — o formato que toda legenda desta Cola usa. */
function Notas({ itens }: { itens: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm text-[var(--text-secondary)]">
      {itens.map((n) => (
        <li key={n.slice(0, 40)} className="flex gap-2">
          <span className="text-[var(--text-muted)]">·</span>
          <span>{n}</span>
        </li>
      ))}
    </ul>
  );
}

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

      {/* Quem está numa gincana às 23h abre a Cola — então o mapa das bases,
          inclusive o que está bloqueado e por quê, mora aqui. */}
      {/* As bancadas de fora vêm ANTES das bases: quem abre a Cola no meio de
          uma prova quer saber "onde resolvo isto agora", e às vezes a resposta
          honesta é outra aba. */}
      <Section title="Outras bancadas — quando abrir">
        <p className="mb-2 text-sm text-[var(--text-secondary)]">
          Percorridas aba a aba em 19/08/2026. Não estão aqui como concorrência: estão porque há
          momentos em que abrir uma delas é mais rápido que esperar esta crescer — e saber quando é
          a informação que vale.
        </p>
        <div className="flex flex-col gap-2">
          {BANCADAS_EXTERNAS.map((b) => (
            <Card key={b.id} className="p-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-display text-sm text-[var(--text-primary)]">{b.name}</span>
                <span className="font-mono text-xs text-[var(--text-muted)]">{b.size}</span>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto shrink-0 text-xs text-[var(--text-secondary)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-primary)]"
                >
                  {b.urlLabel}
                </a>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{b.use}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{b.note}</p>
            </Card>
          ))}
        </div>
      </Section>

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

      {/*
        LEGENDAS DE FORMA — o caminho inverso: da FOTO para a letra.
        O conteúdo é a lista do que ENGANA, não arte ASCII: 24 runas desenhadas
        em monoespaçada saem ruins e ocupam a Cola; o que resolve às 23h é saber
        que ᛖ parece M e vale E.
      */}
      <Section title="Runas — o que engana">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 text-left text-xs text-[var(--text-muted)]">
                <th className="px-3 py-2 font-medium">Glifo</th>
                <th className="px-3 py-2 font-medium">Vale</th>
                <th className="px-3 py-2 font-medium">A armadilha</th>
              </tr>
            </thead>
            <tbody>
              {RUNAS_ARMADILHAS.map((r) => (
                <tr key={r.glifo} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-3 py-2 align-top font-mono text-lg text-[var(--text-primary)]">
                    {r.glifo}
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap text-[var(--text-primary)]">
                    {r.valor}
                  </td>
                  <td className="px-3 py-2 align-top text-[var(--text-secondary)]">
                    {r.armadilha}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Notas itens={RUNAS_NOTAS} />
      </Section>

      <Section title="Nyctográfico — a regra de construção">
        <Notas itens={NYCTOGRAFICO_NOTAS} />
      </Section>

      <Section title="Bandeiras do Código Internacional de Sinais">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {ICS_SIGNIFICADOS.map((b) => (
                <tr key={b.letra} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-3 py-1.5 align-top font-mono text-[var(--text-primary)]">
                    {b.letra}
                  </td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">{b.significado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Notas itens={ICS_NOTAS} />
      </Section>

      {/*
        SOLETRAÇÃO — legenda, e não tabela de decoder. Ver o cabeçalho de
        `soletracao.ts`: não existe norma brasileira em palavras portuguesas, e a
        lista mais citada não tem fonte primária. Quem decodifica é a FORMA
        "X de Palavra", que se autoverifica pela acrofonia.
      */}
      <Section title="Soletração — “A de Amor”">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 text-left text-xs text-[var(--text-muted)]">
                <th className="px-3 py-2 font-medium">Letra</th>
                <th className="px-3 py-2 font-medium">ICAO (oficial no Brasil)</th>
                <th className="px-3 py-2 font-medium">Corrente BR (sem fonte)</th>
                <th className="px-3 py-2 font-medium">ICAO 1947 América Latina</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {SOLETRACAO.map((l) => (
                <tr key={l.letra} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{l.letra}</td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">{l.icao}</td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">{l.br}</td>
                  <td className="px-3 py-1.5 text-[var(--text-muted)]">{l.latina}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 text-left text-xs text-[var(--text-muted)]">
                <th className="px-3 py-2 font-medium">Dígito</th>
                <th className="px-3 py-2 font-medium">Brasil (DECEA MCA 100-16)</th>
                <th className="px-3 py-2 font-medium">ICAO</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {SOLETRACAO_DIGITOS.map((d) => (
                <tr key={d.digito} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-3 py-1.5 text-[var(--text-primary)]">{d.digito}</td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">{d.brasil}</td>
                  <td className="px-3 py-1.5 text-[var(--text-muted)]">{d.icao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <ul className="flex flex-col gap-1.5 text-sm text-[var(--text-secondary)]">
          {SOLETRACAO_NOTAS.map((nota) => (
            <li key={nota.slice(0, 40)} className="flex gap-2">
              <span className="text-[var(--text-muted)]">·</span>
              <span>{nota}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/*
        A RÉGUA DO IC — a legenda da aba Retrato.
        Fica por último de propósito: é a única seção que não é tabela de
        consulta, e sim leitura de um número. Quem chega aqui já viu o número.
      */}
      <Section title="Índice de coincidência — o que o número quer dizer">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 text-left text-xs text-[var(--text-muted)]">
                <th className="px-3 py-2 font-medium">Faixa</th>
                <th className="px-3 py-2 font-medium">IC</th>
                <th className="px-3 py-2 font-medium">Significa</th>
              </tr>
            </thead>
            <tbody>
              {REGUA_IC.map((f) => (
                <tr key={f.faixa} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-3 py-2 align-top text-[var(--text-primary)]">{f.faixa}</td>
                  <td className="px-3 py-2 align-top font-mono text-xs text-[var(--text-muted)]">
                    {f.ic}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="block text-[var(--text-primary)]">{f.significa}</span>
                    <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                      {f.ondeOlhar}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <ul className="flex flex-col gap-1.5 text-sm text-[var(--text-secondary)]">
          {REGUA_IC_NOTAS.map((nota) => (
            <li key={nota.slice(0, 40)} className="flex gap-2">
              <span className="text-[var(--text-muted)]">·</span>
              <span>{semNegrito(nota)}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/** As notas usam `**` para marcar a abertura; a Cola renderiza texto puro. */
function semNegrito(t: string): ReactNode {
  const partes = t.split(/\*\*(.+?)\*\*/g);
  return partes.map((p, i) =>
    i % 2 === 1 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: as partes vêm de um split posicional
      <strong key={i} className="text-[var(--text-primary)]">
        {p}
      </strong>
    ) : (
      p
    ),
  );
}
