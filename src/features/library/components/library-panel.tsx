import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buscar as buscarLojas } from "@/features/loja/types";
import {
  SOURCES,
  SOURCE_STATUS_HINT,
  SOURCE_STATUS_LABEL,
  type SourceStatus,
} from "@/features/reference/sources";
import { apiFetch } from "@/lib/api";
import { loadLojas } from "@/lib/data";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { ArrowLeft, Database, ExternalLink, Loader2, MapPinned, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface BaseDoAcervo {
  id: string;
  nome: string;
  indexa: string;
  origem: string;
  registros: number;
  navegavel: boolean;
  /**
   * Base que vive NO NAVEGADOR e navega SEM a API.
   *
   * Sem este campo, `navegavel: true` numa base local quebra em SILÊNCIO: o
   * botão "Navegar" chama `/library/{id}`, o switch do backend não conhece o id
   * e devolve 404, e o `catch` do Navegador apenas zera os dados — a pessoa fica
   * com uma tabela sem cabeçalho e sem uma palavra dizendo o que houve. Com o
   * provedor, a base é navegável de verdade e continua funcionando com a API
   * fora do ar, que é o caso da gincana.
   */
  local?: (termo: string) => Promise<Record<string, unknown>[]>;
}

/**
 * Bases que vivem NO NAVEGADOR e por isso não aparecem no catálogo da API.
 *
 * Sem elas a Biblioteca mentiria por omissão: o vocabulário do realce de
 * palavra real é a maior base do app em número de registros, e o rol de ruas é
 * consultado localmente pelos decoders — o da API é a mesma coisa, servida para
 * quem quiser navegar.
 */
const LOCAIS: BaseDoAcervo[] = [
  {
    id: "vocabulario",
    nome: "Vocabulário (pt + en)",
    indexa: "palavra dobrada sem acento → existe ou não (realce de palavra real)",
    origem: "pythonprobr/palavras + /usr/share/dict/words · embarcada no app",
    registros: 451016,
    navegavel: false,
  },
];

const TOM: Record<SourceStatus, "success" | "info" | "pulse" | "neutral"> = {
  aberta: "success",
  "consulta-manual": "info",
  bloqueada: "pulse",
  adiada: "neutral",
};

/**
 * Biblioteca: o que a bancada sabe, e onde consultar o que ela não sabe.
 *
 * As duas metades juntas de propósito. A de cima vem do banco (contagem de
 * verdade, não número chumbado); a de baixo é o catálogo de bases externas que
 * já vivia na Cola — e que continua respondendo "essa base existe, o link é
 * este" quando a resposta não está aqui dentro.
 */
export function LibraryPanel({ aoAbrirPostes }: { aoAbrirPostes: () => void }) {
  const [bases, setBases] = useState<BaseDoAcervo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<BaseDoAcervo | null>(null);
  const [lojas, setLojas] = useState<BaseDoAcervo | null>(null);

  /**
   * As lojas dos shoppings são a primeira base local NAVEGÁVEL, e a contagem
   * dela sai do próprio artefato — nunca de um literal.
   *
   * O `451016` chumbado do vocabulário, logo abaixo, é exatamente o defeito que
   * o cabeçalho do `LibraryController` condena: "uma biblioteca que mente sobre
   * o próprio tamanho é pior que não ter biblioteca". Aqui a contagem é `count`.
   */
  useEffect(() => {
    let vivo = true;
    loadLojas()
      .then((d) => {
        if (!vivo) return;
        setLojas({
          id: "loja-blumenau",
          nome: "Lojas dos shoppings de Blumenau",
          indexa: `número da unidade → loja, piso e ala · ${d.comIdentificador} das ${d.count} publicam o número`,
          origem: d.source,
          registros: d.count,
          navegavel: true,
          local: async (termo) =>
            buscarLojas(d, termo).map((l) => ({
              shopping: l.shopping.nome,
              identificador: l.identificador,
              loja: l.nome,
              piso: l.piso,
              ala: l.ala,
              ramo: l.ramo.join(" · "),
              quiosque: l.quiosque ? "sim" : "",
            })),
        });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    apiFetch<{ hits: BaseDoAcervo[] }>("/library")
      .then((r) => setBases(r.hits))
      // Mesmo sem a API, as bases locais existem e devem aparecer.
      .catch((e) => {
        setBases([]);
        setErro((e as Error).message);
      });
  }, []);

  // As locais entram na renderização, e não no estado, para a chegada do
  // artefato não depender da resposta da API nem o contrário.
  const todas = bases === null ? null : [...bases, ...LOCAIS, ...(lojas ? [lojas] : [])];

  if (aberta) return <Navegador base={aberta} aoVoltar={() => setAberta(null)} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">Biblioteca</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Tudo que a bancada conhece, com o tamanho real de cada base — e, embaixo, as bases
          públicas que ainda se consultam à mão.
        </p>
      </div>

      {erro ? (
        <Card className="border-[var(--color-pulse-600)] p-3">
          <p className="text-sm text-[var(--color-pulse-600)]">{erro}</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <p className="border-b border-[var(--border-subtle)] px-4 py-2.5 font-display text-sm text-[var(--text-primary)]">
          No acervo
        </p>
        {todas === null && !erro ? (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)]">Carregando…</p>
        ) : (
          todas?.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
            >
              <Database className="h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--text-primary)]">{b.nome}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {b.indexa} · {b.origem}
                </p>
              </div>
              <span className="font-mono text-sm tabular-nums text-[var(--text-secondary)]">
                {b.registros.toLocaleString("pt-BR")}
              </span>
              {/* Os postes abrem no mapa, não numa tabela: 45 mil pontos
                  geolocalizados se leem espacialmente, e o mapa já carrega por
                  viewport com teto no servidor. */}
              {!b.navegavel ? (
                <span className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--text-muted)]">
                  no navegador
                </span>
              ) : b.id === "poste" ? (
                <button
                  type="button"
                  onClick={aoAbrirPostes}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 text-xs font-medium text-[var(--brand-strong)] hover:bg-[var(--surface-sunken)]"
                >
                  <MapPinned className="h-3.5 w-3.5" /> No mapa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAberta(b)}
                  className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 text-xs font-medium text-[var(--brand-strong)] hover:bg-[var(--surface-sunken)]"
                >
                  Navegar
                </button>
              )}
            </div>
          ))
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] px-4 py-2.5">
          <p className="font-display text-sm text-[var(--text-primary)]">
            Fora do acervo — onde consultar
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {SOURCE_STATUS_HINT["consulta-manual"]}
          </p>
        </div>
        {SOURCES.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--text-primary)]">{s.name}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">{s.indexes}</p>
            </div>
            <Badge tone={TOM[s.status]}>{SOURCE_STATUS_LABEL[s.status]}</Badge>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--brand-strong)] hover:underline"
            >
              {s.urlLabel} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
      </Card>
    </div>
  );
}

/** Tabela paginada de uma base. */
function Navegador({ base, aoVoltar }: { base: BaseDoAcervo; aoVoltar: () => void }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [dados, setDados] = useState<{ total: number; hits: Record<string, unknown>[] } | null>(
    null,
  );
  const [carregando, setCarregando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const debQ = useDebouncedValue(q, 300);

  // Filtro novo volta para a primeira página: senão a pessoa filtra e cai numa
  // página que já não existe, vendo lista vazia com resultados disponíveis. O
  // corpo não lê `debQ` — é a mudança dela que precisa disparar o reset.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a troca do filtro É o gatilho
  useEffect(() => setPage(0), [debQ]);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    // Base local pagina em memória; base do acervo pagina no servidor. A tela
    // daqui para baixo é a mesma nos dois casos — quem muda é só a origem.
    const pedido = base.local
      ? base.local(debQ).then((linhas) => ({
          total: linhas.length,
          hits: linhas.slice(page * 50, page * 50 + 50),
        }))
      : apiFetch<{ total: number; hits: Record<string, unknown>[] }>(
          `/library/${base.id}?q=${encodeURIComponent(debQ)}&page=${page}&size=50`,
        );
    pedido
      .then((r) => vivo && setDados(r))
      .catch((e) => {
        if (!vivo) return;
        // Vazio calado é o que a casa proíbe: sem esta linha, base fora do ar e
        // busca sem resultado ficam com exatamente a mesma tela.
        setDados(null);
        setFalha((e as Error).message);
      })
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [base.id, base.local, debQ, page]);

  /**
   * TODAS as colunas, não as seis primeiras.
   *
   * O corte antigo escondia justamente o que difere uma linha da outra — as
   * ruas repetem código e nome entre bairros, e a `localizacao` (que é o que
   * distingue) ficava fora da tela. A tabela rola na horizontal; a informação
   * não pode sumir. As chaves saem da união de todas as linhas da página, e não
   * só da primeira, porque um campo nulo no primeiro registro apagaria a coluna.
   */
  const colunas = dados?.hits.length ? [...new Set(dados.hits.flatMap((l) => Object.keys(l)))] : [];
  const paginas = dados ? Math.ceil(dados.total / 50) : 0;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={aoVoltar}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Biblioteca
      </button>

      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">{base.nome}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {base.indexa} · {base.registros.toLocaleString("pt-BR")} registros · {base.origem}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar…"
          aria-label={`Filtrar ${base.nome}`}
          className="pl-9"
        />
        {carregando ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--text-muted)]" />
        ) : null}
      </div>

      <Card className="overflow-x-auto">
        {/* Rola na horizontal: com todas as colunas, `street` tem 14 e `bridge`
            tem 20. Esconder coluna para caber seria esconder dado. */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              {colunas.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 text-left text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados?.hits.map((linha, i) => (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: a linha da tabela não tem id estável entre bases
                key={i}
                className="border-b border-[var(--border-subtle)] last:border-0"
              >
                {colunas.map((c) => {
                  const v = linha[c];
                  const texto = v === null || v === undefined || v === "" ? "—" : String(v);
                  return (
                    <td
                      key={c}
                      // `title` porque o texto é truncado: o conteúdo inteiro
                      // continua alcançável sem esticar a tabela.
                      title={texto}
                      className="max-w-[18rem] truncate px-3 py-1.5 font-mono text-xs"
                    >
                      {texto}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {dados && dados.hits.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)]">Nada encontrado.</p>
        ) : null}
        {!dados && !carregando ? (
          <p className="px-4 py-6 text-sm text-[var(--color-pulse-600)]">
            {falha ?? "Não consegui abrir esta base."}
          </p>
        ) : null}
      </Card>

      {paginas > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            {dados?.total.toLocaleString("pt-BR")} registros · página {page + 1} de{" "}
            {paginas.toLocaleString("pt-BR")}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 text-xs disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page + 1 >= paginas}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 text-xs disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
