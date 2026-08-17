import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { side } from "@/features/audio/canais";
import { montarWav } from "@/features/audio/decode";
import { corteMinimo, offsetDoPcm, varrerLsb } from "@/features/audio/lsb";
import { cn } from "@/lib/cn";
import { Download, Play, Square, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type OpcoesDeRender, RENDER_PADRAO } from "../render";
import { type Vista, useAudioAnalise } from "../use-audio-analise";
import { EspectrogramaCanvas } from "./espectrograma-canvas";

const VISTA_LABEL: Record<Vista, string> = {
  esquerdo: "Esquerdo",
  direito: "Direito",
  diferenca: "Diferença (E−D)",
};

/**
 * O painel de áudio da aba Arquivo.
 *
 * ── A REGRA QUE ORGANIZA ESTE ARQUIVO ──────────────────────────────────────
 * Há DOIS caminhos aqui, e eles não se cruzam:
 *
 *  • **Análise** — espectrograma, canais, LSB. Roda sobre o áudio ORIGINAL, a
 *    1,0×, sempre.
 *  • **Reprodução** — invertido, velocidade, modo fita. Vive no `<audio>`, é
 *    para o ouvido, e NUNCA alimenta um detector.
 *
 * Misturar os dois é a falha silenciosa perfeita: medido, em modo fita a 0,5×
 * o par DTMF de 697/1209 Hz vira 348,6/603,5 Hz e o detector não acha tecla
 * nenhuma — sem erro, com os tons audíveis.
 */
export function AudioPainel({
  bytes,
  nome,
  onDecodificador,
}: {
  bytes: Uint8Array;
  nome: string;
  onDecodificador?: (texto: string) => void;
}) {
  const { analise, carregando, erro } = useAudioAnalise(bytes, nome);
  const [vista, setVista] = useState<Vista>("esquerdo");
  const [opcoes, setOpcoes] = useState<OpcoesDeRender>(RENDER_PADRAO);
  const [velocidade, setVelocidade] = useState(1);
  const [mantemTom, setMantemTom] = useState(true);
  const [tocando, setTocando] = useState(false);
  const refAudio = useRef<HTMLAudioElement>(null);

  // Ajusta o teto de frequência à taxa real assim que ela é conhecida.
  useEffect(() => {
    if (!analise) return;
    setOpcoes((o) => ({ ...o, faixaHz: [0, analise.carregado.taxa / 2] }));
  }, [analise]);

  const urlOriginal = useMemo(() => {
    const b = new Blob([bytes as unknown as BlobPart], { type: "audio/wav" });
    return URL.createObjectURL(b);
  }, [bytes]);
  useEffect(() => () => URL.revokeObjectURL(urlOriginal), [urlOriginal]);

  useEffect(() => {
    const a = refAudio.current;
    if (!a) return;
    a.playbackRate = velocidade;
    // `preservesPitch = false` é o "modo fita": a rotação do rolo muda tom e
    // duração juntos, como um gravador de verdade.
    a.preservesPitch = mantemTom;
  }, [velocidade, mantemTom]);

  const lsb = useMemo(() => {
    if (!analise) return null;
    const off = offsetDoPcm(bytes);
    if (off === null) return null;
    const canais = analise.carregado.canais.length;
    const resultados = varrerLsb(bytes, { bitsPorAmostra: 16, canais, offset: off });
    return { resultados, corte: resultados[0]?.corteUsado ?? corteMinimo(bytes.length) };
  }, [analise, bytes]);

  const baixarCanal = (indice: number | "diferenca") => {
    if (!analise) return;
    const [e, d] = analise.carregado.canais;
    const canal = indice === "diferenca" ? side(e, d) : analise.carregado.canais[indice];
    const blob = montarWav([canal], analise.carregado.taxa);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nome}-${indice === "diferenca" ? "diferenca" : indice === 0 ? "esquerdo" : "direito"}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (carregando) {
    return (
      <Card className="p-4">
        <div className="h-56 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-sunken)]" />
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Decodificando e calculando o espectrograma…
        </p>
      </Card>
    );
  }

  if (erro || !analise) {
    return (
      <Card className="p-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {erro ?? "Não consegui abrir este áudio."} As camadas de bytes acima continuam valendo.
        </p>
      </Card>
    );
  }

  const { carregado, metricas, espectros } = analise;
  const vistas = (Object.keys(espectros) as Vista[]).filter((v) => espectros[v]);
  const espectroAtual = espectros[vista] ?? espectros.esquerdo;

  return (
    <div className="space-y-4">
      {/* Aviso de reamostragem — nunca silêncio. */}
      {carregado.avisoDeReamostragem ? (
        <Card className="border-[var(--color-pulse-400)] p-3">
          <p className="text-sm text-[var(--text-primary)]">{carregado.avisoDeReamostragem}</p>
        </Card>
      ) : null}

      {/* Canais */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm text-[var(--text-primary)]">Canais</h3>
          <Badge tone={metricas.correlacao < -0.9 ? "pulse" : "neutral"}>
            {metricas.estereo ? "estéreo" : "mono"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{metricas.leitura}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs sm:grid-cols-4">
          <div>
            <dt className="text-[var(--text-muted)]">correlação</dt>
            <dd className="text-[var(--text-primary)]">{metricas.correlacao.toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">lateral/central</dt>
            <dd className="text-[var(--text-primary)]">{Math.round(metricas.sideMidDb)} dB</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">taxa</dt>
            <dd className="text-[var(--text-primary)]">
              {carregado.taxa.toLocaleString("pt-BR")} Hz
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">corte do codec</dt>
            <dd className="text-[var(--text-primary)]">
              {analise.corteDoCodec ? `${Math.round(analise.corteDoCodec)} Hz` : "nenhum"}
            </dd>
          </div>
        </dl>
        {metricas.estereo ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => baixarCanal(0)}>
              <Download className="h-4 w-4" /> Esquerdo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => baixarCanal(1)}>
              <Download className="h-4 w-4" /> Direito
            </Button>
            <Button size="sm" variant="ghost" onClick={() => baixarCanal("diferenca")}>
              <Download className="h-4 w-4" /> Diferença
            </Button>
          </div>
        ) : null}
      </Card>

      {/* Espectrograma */}
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm text-[var(--text-primary)]">Espectrograma</h3>
          <div className="flex gap-1">
            {vistas.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                className={cn(
                  "rounded-[var(--radius-sm)] px-2 py-1 text-xs",
                  vista === v
                    ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
                )}
              >
                {VISTA_LABEL[v]}
              </button>
            ))}
          </div>
        </div>

        {espectroAtual ? (
          <EspectrogramaCanvas espectro={espectroAtual} opcoes={opcoes} />
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">Sem espectro para esta vista.</p>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[var(--text-secondary)]">
            Piso: {opcoes.pisoDb} dB
            <input
              type="range"
              min={-120}
              max={-30}
              value={opcoes.pisoDb}
              onChange={(e) => setOpcoes((o) => ({ ...o, pisoDb: Number(e.target.value) }))}
              className="mt-1 w-full accent-[var(--brand)]"
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Teto de frequência: {Math.round(opcoes.faixaHz[1]).toLocaleString("pt-BR")} Hz
            <input
              type="range"
              min={1000}
              max={carregado.taxa / 2}
              step={500}
              value={opcoes.faixaHz[1]}
              onChange={(e) => setOpcoes((o) => ({ ...o, faixaHz: [0, Number(e.target.value)] }))}
              className="mt-1 w-full accent-[var(--brand)]"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Baixar o piso revela sinal fraco; baixar o teto de frequência amplia a faixa da fala. O
          eixo é linear de propósito: a escala logarítmica espreme os agudos, que é onde as
          ferramentas de “imagem para som” escrevem.
        </p>
      </Card>

      {/* Ouvir */}
      <Card className="p-4">
        <h3 className="font-display text-sm text-[var(--text-primary)]">Ouvir</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Isto é para o ouvido. A análise acima roda sempre no áudio original a 1,0× — mudar a
          velocidade aqui não mexe em detector nenhum.
        </p>
        {/** biome-ignore lint/a11y/useMediaCaption: áudio de prova, sem faixa de legenda possível */}
        <audio
          ref={refAudio}
          src={urlOriginal}
          onPlay={() => setTocando(true)}
          onPause={() => setTocando(false)}
          className="mt-3 w-full"
          controls
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const a = refAudio.current;
              if (!a) return;
              if (tocando) a.pause();
              else void a.play();
            }}
          >
            {tocando ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {tocando ? "Parar" : "Tocar"}
          </Button>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            Velocidade {velocidade.toFixed(2)}×
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.05}
              value={velocidade}
              onChange={(e) => setVelocidade(Number(e.target.value))}
              className="w-40 accent-[var(--brand)]"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={!mantemTom}
              onChange={(e) => setMantemTom(!e.target.checked)}
              className="accent-[var(--brand)]"
            />
            modo fita (muda o tom junto)
          </label>
        </div>
      </Card>

      {/* LSB */}
      {lsb ? (
        <Card className="p-4">
          <h3 className="font-display text-sm text-[var(--text-primary)]">
            Bits menos significativos
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {lsb.resultados.length} interpretações testadas (canal × ordem dos bits × quantidade).
            Corte para chamar de texto: <strong>{lsb.corte} caracteres</strong> — ele sobe com o
            tamanho da busca, porque testar mais interpretações aumenta a chance de topar com texto
            por acaso.
          </p>
          {lsb.resultados.some((r) => r.trechos.length) ? (
            <ul className="mt-3 space-y-2">
              {lsb.resultados
                .filter((r) => r.trechos.length)
                .slice(0, 4)
                .map((r) => (
                  <li
                    key={`${r.opcoes.canal}-${r.opcoes.ordem}-${r.opcoes.quantosBits}`}
                    className="rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-3"
                  >
                    <p className="font-mono text-[0.6875rem] text-[var(--text-muted)]">
                      canal {r.opcoes.canal === null ? "ambos" : r.opcoes.canal === 0 ? "E" : "D"} ·{" "}
                      {r.opcoes.ordem} · {r.opcoes.quantosBits} bit(s)
                    </p>
                    {r.trechos.slice(0, 3).map((t) => (
                      <div key={t} className="mt-1 flex items-start gap-2">
                        <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--text-primary)]">
                          {t}
                        </code>
                        <CopyButton value={t} />
                        {onDecodificador ? (
                          <button
                            type="button"
                            title="Mandar ao Decodificador"
                            onClick={() => onDecodificador(t)}
                            className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Nenhuma das {lsb.resultados.length} interpretações produziu texto acima do corte.{" "}
              <span className="text-[var(--text-muted)]">
                Isso não prova ausência: dado cifrado não produz texto nenhum, por construção.
              </span>
            </p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
