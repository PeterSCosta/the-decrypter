import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Quadro, comoTempo, instantesDaTira, listaDeInstantes } from "../quadros";

/**
 * O painel de vídeo.
 *
 * Duas coisas, e as duas voltam ao funil: pegar o quadro de um segundo
 * específico, e ver uma tira de miniaturas para ACHAR o segundo que interessa.
 * Cada quadro extraído vira um PNG, e um PNG é um arquivo — então ele pode ser
 * analisado como qualquer outro, com planos de bit, EXIF e o resto.
 *
 * ── O QUE A TELA PRECISA SER HONESTA SOBRE ─────────────────────────────────
 * `currentTime = 37.5` não garante o quadro de 37,5 s: o navegador salta para o
 * quadro decodificável mais próximo, e com keyframe a cada 2 s o erro passa de
 * um segundo. Por isso o painel mostra o instante REAL entregue ao lado do
 * pedido — quem cita um instante numa resposta precisa citar o certo.
 */
export function VideoPainel({
  bytes,
  nome,
  aoExtrairQuadro,
}: {
  bytes: Uint8Array;
  nome: string;
  /** Manda o quadro de volta ao topo da análise, como arquivo novo. */
  aoExtrairQuadro?: (png: Uint8Array, nome: string) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [pronto, setPronto] = useState(false);
  const [duracao, setDuracao] = useState(0);
  const [instante, setInstante] = useState("0:05");
  const [quadros, setQuadros] = useState<Quadro[]>([]);
  const [tira, setTira] = useState<Quadro[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const url = useMemo(() => URL.createObjectURL(new Blob([bytes as unknown as BlobPart])), [bytes]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  /** Vai ao segundo pedido e devolve o quadro — com o instante REAL. */
  const pegarQuadro = (segundo: number): Promise<Quadro> =>
    new Promise((resolve, reject) => {
      const v = ref.current;
      if (!v) return reject(new Error("sem vídeo"));
      const aoChegar = () => {
        v.removeEventListener("seeked", aoChegar);
        const c = document.createElement("canvas");
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("sem canvas"));
        ctx.drawImage(v, 0, 0);
        c.toBlob(async (b) => {
          if (!b) return reject(new Error("não consegui gerar o PNG"));
          resolve({
            pedido: segundo,
            // O que o vídeo ENTREGOU, que pode não ser o que se pediu.
            real: v.currentTime,
            bytes: new Uint8Array(await b.arrayBuffer()),
            largura: c.width,
            altura: c.height,
          });
        }, "image/png");
      };
      v.addEventListener("seeked", aoChegar);
      v.currentTime = Math.min(segundo, Math.max(0, v.duration - 0.05));
    });

  // Quantos quadros o texto pede — calculado antes do clique de propósito: é o
  // que desfaz a ambiguidade da vírgula ("14,60" é um instante ou dois?) sem
  // obrigar ninguém a decorar a regra.
  const pedidos = useMemo(() => listaDeInstantes(instante), [instante]);

  const extrair = async () => {
    if (!pedidos?.length) {
      return setErro(
        "Não entendi o instante. Use 37, 37,5, 1:23,4 — ou uma lista: 14, 60, 72, 90.",
      );
    }
    setErro(null);
    setOcupado(true);
    try {
      const novos: Quadro[] = [];
      // Sequencial: um elemento de vídeo não está em dois instantes ao mesmo
      // tempo, e seeks em paralelo devolvem o mesmo quadro repetido.
      for (const s of pedidos) novos.push(await pegarQuadro(s));
      // Os mais novos no topo, na ordem em que foram pedidos.
      setQuadros((lista) => [...novos.reverse(), ...lista].slice(0, 24));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "não consegui extrair o quadro");
    } finally {
      setOcupado(false);
    }
  };

  const gerarTira = async () => {
    setOcupado(true);
    setErro(null);
    try {
      const novos: Quadro[] = [];
      // Sequencial de propósito: um único elemento de vídeo não tem como estar
      // em dois instantes ao mesmo tempo, e disparar seeks em paralelo devolve
      // o mesmo quadro várias vezes.
      for (const s of instantesDaTira(duracao)) novos.push(await pegarQuadro(s));
      setTira(novos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "não consegui gerar a tira");
    } finally {
      setOcupado(false);
    }
  };

  const baixar = (q: Quadro) => {
    const u = URL.createObjectURL(
      new Blob([q.bytes as unknown as BlobPart], { type: "image/png" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = `${nome}-${q.real.toFixed(2)}s.png`;
    a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <Card className="p-4">
      <h3 className="font-display text-sm text-[var(--text-primary)]">Vídeo</h3>

      {/** biome-ignore lint/a11y/useMediaCaption: vídeo de prova, sem faixa de legenda possível */}
      <video
        ref={ref}
        src={url}
        controls
        preload="metadata"
        className="mt-3 max-h-[360px] w-full rounded-[var(--radius-md)] bg-black"
        onLoadedMetadata={(e) => {
          setDuracao(e.currentTarget.duration || 0);
          setPronto(true);
        }}
        onError={() => setErro("O navegador não sabe decodificar este vídeo.")}
      />

      {pronto ? (
        <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
          {comoTempo(duracao)} · {ref.current?.videoWidth ?? 0} × {ref.current?.videoHeight ?? 0} px
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={instante}
          onChange={(e) => setInstante(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void extrair()}
          placeholder="14, 60, 72, 90"
          aria-label="Instantes a extrair"
          className="h-8 w-56 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 font-mono text-xs text-[var(--text-primary)]"
        />
        <Button size="sm" variant="secondary" disabled={!pronto || ocupado} onClick={extrair}>
          {pedidos && pedidos.length > 1 ? `Pegar ${pedidos.length} quadros` : "Pegar quadro"}
        </Button>
        <Button size="sm" variant="ghost" disabled={!pronto || ocupado} onClick={gerarTira}>
          Tira de miniaturas
        </Button>
      </div>

      {pedidos && pedidos.length > 1 ? (
        <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
          {pedidos.map((s) => comoTempo(s)).join(" · ")}
        </p>
      ) : null}

      {erro ? <p className="mt-2 text-sm text-[var(--color-pulse-600)]">{erro}</p> : null}

      {tira.length ? (
        <div className="mt-4">
          <h4 className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
            Tira — clique para ir ao instante
          </h4>
          <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
            {tira.map((q) => (
              <button
                key={q.real}
                type="button"
                onClick={() => setInstante(comoTempo(q.real).replace(".", ","))}
                className="shrink-0 text-left"
              >
                <img
                  src={URL.createObjectURL(
                    new Blob([q.bytes as unknown as BlobPart], { type: "image/png" }),
                  )}
                  alt={`Quadro em ${comoTempo(q.real)}`}
                  className="h-16 w-auto rounded-[var(--radius-sm)]"
                />
                <span className="block text-center font-mono text-[0.625rem] text-[var(--text-muted)]">
                  {comoTempo(q.real)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {quadros.length ? (
        <div className="mt-4 space-y-3">
          <h4 className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
            Quadros extraídos
          </h4>
          {quadros.map((q) => (
            <div
              key={`${q.pedido}-${q.real}`}
              className="rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{comoTempo(q.real)}</Badge>
                {Math.abs(q.real - q.pedido) > 0.05 ? (
                  <span className="text-xs text-[var(--text-secondary)]">
                    você pediu {comoTempo(q.pedido)} — o vídeo entregou o quadro decodificável mais
                    próximo
                  </span>
                ) : null}
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {q.largura} × {q.altura}
                </span>
                <div className="ml-auto flex gap-2">
                  {aoExtrairQuadro ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => aoExtrairQuadro(q.bytes, `${nome}-${q.real.toFixed(2)}s.png`)}
                    >
                      <Search className="h-4 w-4" />
                      Analisar
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => baixar(q)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <img
                src={URL.createObjectURL(
                  new Blob([q.bytes as unknown as BlobPart], { type: "image/png" }),
                )}
                alt={`Quadro em ${comoTempo(q.real)}`}
                className="mt-2 max-h-64 w-auto rounded-[var(--radius-sm)]"
              />
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Um quadro extraído é um PNG, e um PNG é um arquivo: “Analisar” o manda de volta ao topo,
        onde ele passa por planos de bit, EXIF e o resto.
      </p>
    </Card>
  );
}
