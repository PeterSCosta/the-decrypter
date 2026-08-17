import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";
import { ChevronRight, Download, FileSearch, Upload, Wand2 } from "lucide-react";
import { type DragEvent, useCallback, useMemo, useRef, useState } from "react";
import { AudioPainel } from "../audio/components/audio-painel";
import type { Recorte } from "../carve";
import { DocumentoPainel } from "../documento/components/documento-painel";
import { type Ficha, calcularHashes, montarFicha } from "../ficha";
import { ImagemPainel } from "../imagem/components/imagem-painel";
import { type Achado, type NoDeArquivo, analisar, noDeRecorte, noRaiz } from "../no";
import { VideoPainel } from "../video/components/video-painel";
import { YoutubePainel } from "../youtube/components/youtube-painel";
import { Hexdump } from "./hexdump";

const tamanho = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : n >= 1024
      ? `${Math.round(n / 1024)} KB`
      : `${n} bytes`;

const TOM: Record<Achado["peso"], "pulse" | "info" | "neutral"> = {
  forte: "pulse",
  medio: "info",
  fraco: "neutral",
};

/**
 * A aba **Arquivo** — uma porta para todo tipo de arquivo.
 *
 * A primeira pergunta quando um arquivo de prova chega nunca é "o que quero
 * fazer com este áudio?", é **"o que é isto, de verdade?"** — e isso se responde
 * nos bytes. Uma aba por tipo obrigaria a escolher o tipo no exato momento em
 * que a chance de errar é máxima (um `.wav` que é JPEG), e o caso de um áudio
 * com uma foto colada dentro não teria endereço nenhum: é um arquivo que é dois
 * tipos ao mesmo tempo.
 *
 * O arquivo é um NÓ, não uma folha: todo recorte volta ao topo do mesmo funil.
 */
export function ArquivoPanel({
  onDecodificador,
}: {
  onDecodificador?: (texto: string) => void;
}) {
  const [trilha, setTrilha] = useState<NoDeArquivo[]>([]);
  const [ancora, setAncora] = useState<number | undefined>(undefined);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modificadoEm, setModificadoEm] = useState<number | null>(null);
  const [hashes, setHashes] = useState<{ sha1: string; sha256: string } | null>(null);
  const refInput = useRef<HTMLInputElement>(null);

  const atual = trilha[trilha.length - 1] ?? null;

  const carregar = useCallback(async (arquivo: File) => {
    setErro(null);
    try {
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      setModificadoEm(arquivo.lastModified || null);
      setTrilha([noRaiz(bytes, arquivo.name, arquivo.type || null)]);
      setAncora(undefined);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui ler o arquivo.");
    }
  }, []);

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    const f = e.dataTransfer.files[0];
    if (f) void carregar(f);
  };

  /** Bytes que vieram de fora do arquivo (quadro de vídeo, quadro do YouTube). */
  const abrirBytes = (novos: Uint8Array, nomeNovo: string, origem: string, mime: string | null) => {
    setTrilha((t) => {
      const pai = t[t.length - 1];
      return [
        ...t,
        {
          nome: nomeNovo,
          bytes: novos,
          origem,
          profundidade: (pai?.profundidade ?? -1) + 1,
          analise: analisar(novos, nomeNovo, mime),
        },
      ];
    });
    setAncora(undefined);
    setHashes(null);
  };

  const abrirRecorte = (r: Recorte) => {
    if (!atual) return;
    const novo = noDeRecorte(atual, r);
    if (!novo) return;
    setTrilha((t) => [...t, novo]);
    setAncora(undefined);
    // Os hashes são do nó anterior; deixá-los seria mentir sobre o recorte.
    setHashes(null);
  };

  const baixar = (bytes: Uint8Array, nome: string) => {
    const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart]));
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── vazio ────────────────────────────────────────────────────────────────
  if (!atual) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={soltar}
          onClick={() => refInput.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed p-10 text-center transition-colors sm:p-16",
            arrastando
              ? "border-[var(--brand)] bg-[var(--surface-sunken)]"
              : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
          )}
        >
          <FileSearch className="h-8 w-8 text-[var(--text-muted)]" />
          <span className="font-display text-base text-[var(--text-primary)]">
            Solte um arquivo aqui, ou clique para escolher
          </span>
          <span className="max-w-md text-sm text-[var(--text-secondary)]">
            Áudio, imagem, vídeo, documento, qualquer coisa. Eu digo o que o arquivo tem — quem
            decide se é a resposta é você.
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Nada sai do seu navegador: a leitura é toda local.
          </span>
        </button>
        <input
          ref={refInput}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void carregar(f);
          }}
        />
        {erro ? <p className="text-sm text-[var(--color-pulse-600)]">{erro}</p> : null}

        {/* Prova costuma vir como LINK, não como arquivo — e não havia onde
            colar um. O que o YouTube publica de propósito entra por aqui. */}
        <YoutubePainel
          aoAnalisarQuadro={(b, n) =>
            abrirBytes(b, n, "quadro publicado pelo YouTube", "image/jpeg")
          }
        />
      </div>
    );
  }

  const { analise } = atual;
  const confirmados = analise.embutidos.filter((e) => e.forca === "confirmado" && e.bytes);

  // ── carregado ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Cabeçalho e migalhas */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-base text-[var(--text-primary)]">
              {atual.nome}
            </h2>
            <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
              {tamanho(atual.bytes.length)} · {analise.identidade.tipo ?? "formato não reconhecido"}
              {analise.identidade.extensao ? ` · .${analise.identidade.extensao}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="secondary" onClick={() => baixar(atual.bytes, atual.nome)}>
              <Download className="h-4 w-4" />
              Baixar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setTrilha([])}>
              <Upload className="h-4 w-4" />
              Trocar
            </Button>
          </div>
        </div>

        {trilha.length > 1 ? (
          <nav className="mt-3 flex flex-wrap items-center gap-1 text-xs">
            {trilha.map((n, i) => (
              <span key={`${n.nome}-${n.profundidade}`} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" /> : null}
                <button
                  type="button"
                  onClick={() => setTrilha((t) => t.slice(0, i + 1))}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono",
                    i === trilha.length - 1
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
                  )}
                >
                  {n.nome}
                </button>
              </span>
            ))}
          </nav>
        ) : null}
      </Card>

      {/* Primeira olhada */}
      <Card className="p-4">
        <h3 className="font-display text-sm text-[var(--text-primary)]">Primeira olhada</h3>
        {analise.achados.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Nada de estranho nas camadas que eu sei olhar: o arquivo declara o próprio tamanho e o
            cumpre, a extensão bate com o conteúdo, não há outro arquivo embutido e a entropia não
            tem degrau.{" "}
            <span className="text-[var(--text-muted)]">
              Isso não prova que não há nada escondido — prova que não está NESTAS camadas.
            </span>
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {analise.achados.map((a) => (
              <li
                key={`${a.titulo}-${a.offset ?? 0}`}
                className="rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TOM[a.peso]}>{a.rotulo}</Badge>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{a.titulo}</span>
                  {a.offset !== undefined ? (
                    <button
                      type="button"
                      onClick={() => setAncora(a.offset)}
                      className="font-mono text-xs text-[var(--brand-ink-on-surface,var(--text-secondary))] underline underline-offset-2 hover:text-[var(--text-primary)]"
                    >
                      ver no byte {a.offset.toLocaleString("pt-BR")}
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 break-words text-sm text-[var(--text-secondary)]">{a.detalhe}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Arquivos dentro do arquivo */}
      {confirmados.length ? (
        <Card className="p-4">
          <h3 className="font-display text-sm text-[var(--text-primary)]">
            Arquivos dentro deste arquivo
          </h3>
          <ul className="mt-3 space-y-2">
            {confirmados.map((r) => (
              <li
                key={r.inicio}
                className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-3"
              >
                <Badge tone="brand">{r.tipo}</Badge>
                <span className="font-mono text-xs text-[var(--text-secondary)]">
                  {tamanho(r.tamanho ?? 0)} · byte {r.inicio.toLocaleString("pt-BR")}
                </span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => abrirRecorte(r)}>
                    Analisar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      r.bytes &&
                      baixar(r.bytes, `${atual.nome}-${r.tipo.toLowerCase()}-${r.inicio}`)
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Texto encontrado */}
      {analise.textos.length ? (
        <Card className="p-4">
          <h3 className="font-display text-sm text-[var(--text-primary)]">
            Texto legível ({analise.textos.length})
          </h3>
          <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
            {analise.textos.slice(0, 60).map((t) => (
              <li
                key={`${t.offset}-${t.codificacao}`}
                className="flex items-start gap-2 rounded px-2 py-1 hover:bg-[var(--surface-sunken)]"
              >
                <button
                  type="button"
                  onClick={() => setAncora(t.offset)}
                  className="shrink-0 font-mono text-[0.6875rem] text-[var(--text-muted)]"
                >
                  {t.offset.toLocaleString("pt-BR")}
                </button>
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--text-primary)]">
                  {t.texto}
                </code>
                <CopyButton value={t.texto} />
                {onDecodificador ? (
                  <button
                    type="button"
                    title="Mandar ao Decodificador"
                    onClick={() => onDecodificador(t.texto)}
                    className="shrink-0 rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)]"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Se é imagem, MOSTRA a imagem — e deixa cavar nela. */}
      {analise.identidade.familia === "imagem" ? (
        <ImagemPainel bytes={atual.bytes} nome={atual.nome} onDecodificador={onDecodificador} />
      ) : null}

      {/* Compactado ou documento do Office: os dois são ZIP. */}
      {analise.identidade.familia === "arquivo-comprimido" || analise.identidade.tipo === "ZIP" ? (
        <DocumentoPainel bytes={atual.bytes} onDecodificador={onDecodificador} />
      ) : null}

      {/* Vídeo: cada quadro extraído volta ao funil como PNG. */}
      {analise.identidade.familia === "video" ? (
        <VideoPainel
          bytes={atual.bytes}
          nome={atual.nome}
          aoExtrairQuadro={(png, nomeDoQuadro) =>
            abrirBytes(png, nomeDoQuadro, `quadro de ${atual.nome}`, "image/png")
          }
        />
      ) : null}

      {/* Painel do tipo. */}
      {analise.identidade.familia === "audio" ? (
        <AudioPainel bytes={atual.bytes} nome={atual.nome} onDecodificador={onDecodificador} />
      ) : null}

      {/* Entropia */}
      <Card className="p-4">
        <h3 className="font-display text-sm text-[var(--text-primary)]">Entropia</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{analise.entropia.leitura}</p>
        <div className="mt-3 flex h-16 items-end gap-px overflow-hidden rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] p-1">
          {analise.entropia.blocos.slice(0, 400).map((b) => (
            <button
              key={b.offset}
              type="button"
              title={`byte ${b.offset.toLocaleString("pt-BR")} · ${b.entropia.toFixed(2)} bits/byte`}
              onClick={() => setAncora(b.offset)}
              style={{ height: `${(b.entropia / 8) * 100}%` }}
              className="min-w-[2px] flex-1 rounded-t-[1px] bg-[var(--brand)] opacity-80 hover:opacity-100"
            />
          ))}
        </div>
        <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
          média {analise.entropia.media.toFixed(2)} · mínimo {analise.entropia.minimo.toFixed(2)} ·
          máximo {analise.entropia.maximo.toFixed(2)} bits/byte
        </p>
      </Card>

      {/* Ficha — os metadados e os detalhes do formato. */}
      <FichaCard
        bytes={atual.bytes}
        nome={atual.nome}
        identidade={analise.identidade}
        modificadoEm={atual.profundidade === 0 ? modificadoEm : null}
        hashes={hashes}
        aoPedirHashes={() => {
          void calcularHashes(atual.bytes).then(setHashes);
        }}
        onDecodificador={onDecodificador}
      />

      {/* Bytes */}
      <Card className="p-4">
        <h3 className="font-display text-sm text-[var(--text-primary)]">Bytes</h3>
        <p className="mt-1 mb-3 text-xs text-[var(--text-secondary)]">
          É aqui que se confere qualquer afirmação acima, em vez de acreditar nela.
        </p>
        <Hexdump bytes={atual.bytes} ancora={ancora} />
      </Card>
    </div>
  );
}

/**
 * A ficha do arquivo — o que ele É, em detalhe.
 *
 * Fica no fim da página de propósito: a "primeira olhada" responde "tem algo
 * estranho aqui?", e esta responde "o que exatamente é isto?". Quem chega com
 * pressa lê a primeira; quem já sabe que achou alguma coisa desce até aqui.
 */
function FichaCard({
  bytes,
  nome,
  identidade,
  modificadoEm,
  hashes,
  aoPedirHashes,
  onDecodificador,
}: {
  bytes: Uint8Array;
  nome: string;
  identidade: Parameters<typeof montarFicha>[2];
  modificadoEm: number | null;
  hashes: { sha1: string; sha256: string } | null;
  aoPedirHashes: () => void;
  onDecodificador?: (texto: string) => void;
}) {
  const ficha: Ficha = useMemo(
    () => montarFicha(bytes, nome, identidade, modificadoEm),
    [bytes, nome, identidade, modificadoEm],
  );

  return (
    <Card className="p-4">
      <h3 className="font-display text-sm text-[var(--text-primary)]">Ficha do arquivo</h3>

      {ficha.grupos.map((g) => (
        <div key={g.titulo} className="mt-3">
          <h4 className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
            {g.titulo}
          </h4>
          <dl className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {g.campos.map((c) => (
              <div key={`${g.titulo}-${c.rotulo}`} className="flex flex-wrap items-baseline gap-2">
                <dt className="font-mono text-xs text-[var(--text-muted)]">{c.rotulo}</dt>
                <dd className="font-mono text-xs text-[var(--text-primary)]">{c.valor}</dd>
                {c.atencao ? <Badge tone="pulse">{c.atencao}</Badge> : null}
              </div>
            ))}
          </dl>
        </div>
      ))}

      {ficha.tags.length ? (
        <div className="mt-4">
          <h4 className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
            Tags e metadados
          </h4>
          <ul className="mt-1 space-y-1">
            {ficha.tags.map((t) => (
              <li key={`${t.fonte}-${t.texto}`} className="flex items-start gap-2">
                <span className="shrink-0 font-mono text-[0.6875rem] text-[var(--text-muted)]">
                  {t.fonte}
                </span>
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--text-primary)]">
                  {t.texto}
                </code>
                <CopyButton value={t.texto} />
                {onDecodificador ? (
                  <button
                    type="button"
                    title="Mandar ao Decodificador"
                    onClick={() => onDecodificador(t.texto)}
                    className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <h4 className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
          Impressão digital
        </h4>
        {hashes ? (
          <dl className="mt-1 space-y-1">
            {(["sha1", "sha256"] as const).map((k) => (
              <div key={k} className="flex flex-wrap items-baseline gap-2">
                <dt className="font-mono text-xs text-[var(--text-muted)]">
                  {k === "sha1" ? "SHA-1" : "SHA-256"}
                </dt>
                <dd className="min-w-0 flex-1 break-all font-mono text-[0.6875rem] text-[var(--text-primary)]">
                  {hashes[k]}
                </dd>
                <CopyButton value={hashes[k]} />
              </div>
            ))}
          </dl>
        ) : (
          <div className="mt-1">
            <Button size="sm" variant="secondary" onClick={aoPedirHashes}>
              Calcular SHA-1 e SHA-256
            </Button>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Serve para comparar com outro arquivo, ou para procurar o original na internet.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
