import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { side } from "@/features/audio/canais";
import { montarWav } from "@/features/audio/decode";
import { corteMinimo, offsetDoPcm, varrerLsb } from "@/features/audio/lsb";
import { cn } from "@/lib/cn";
import { AVISO_DE_ENVIO, type ResultadoMusica, identificarMusica } from "@/lib/musica";
import { Download, Play, Square, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { paraSegundos } from "../../video/quadros";
import { type AchadoDtmf, type RecusaDtmf, ehDtmf, lerDtmf } from "../dtmf";
import { type AchadoMorse, type RecusaMorse, ehAchado, lerMorse } from "../morse";
import { type AchadoNotas, type RecusaNotas, ehNotas, lerNotas } from "../notas";
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
  const [morse, setMorse] = useState<Record<string, AchadoMorse | RecusaMorse> | null>(null);
  const [selecao, setSelecao] = useState<{ de: number; ate: number } | null>(null);
  const [dtmf, setDtmf] = useState<Record<string, AchadoDtmf | RecusaDtmf> | null>(null);
  const [notas, setNotas] = useState<Record<string, AchadoNotas | RecusaNotas> | null>(null);
  const [urlInvertido, setUrlInvertido] = useState<string | null>(null);
  const [canalDoRecorte, setCanalDoRecorte] = useState<"esquerdo" | "direito" | "ambos">("ambos");
  /**
   * O texto das caixas de "de/até" vive à parte da seleção.
   *
   * Se elas lessem `selecao` direto, apagar um dígito para digitar outro
   * reescreveria a seleção no meio da digitação — e o campo saltaria embaixo do
   * dedo. Aqui o texto é livre; só vira seleção quando dá para ler.
   */
  const [deTexto, setDeTexto] = useState("");
  const [ateTexto, setAteTexto] = useState("");
  const [musica, setMusica] = useState<ResultadoMusica | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroMusica, setErroMusica] = useState<string | null>(null);
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

  // Arrastar no espectrograma também escreve nas caixas: as duas formas de
  // escolher o trecho mostram sempre o mesmo trecho.
  useEffect(() => {
    if (selecao) {
      setDeTexto(selecao.de.toFixed(2));
      setAteTexto(selecao.ate.toFixed(2));
    } else {
      setDeTexto("");
      setAteTexto("");
    }
  }, [selecao]);

  const lsb = useMemo(() => {
    if (!analise) return null;
    const off = offsetDoPcm(bytes);
    if (off === null) return null;
    const canais = analise.carregado.canais.length;
    const resultados = varrerLsb(bytes, { bitsPorAmostra: 16, canais, offset: off });
    return { resultados, corte: resultados[0]?.corteUsado ?? corteMinimo(bytes.length) };
  }, [analise, bytes]);

  /**
   * A seleção digitada — "do segundo 8 ao 16".
   *
   * Arrastar no espectrograma continua sendo o caminho principal, porque ali se
   * VÊ a fronteira. Mas quando a resposta já vem escrita ("o trecho entre 8 e
   * 16 s"), reproduzir isso com o mouse é trabalho de precisão para nada — e
   * uma seleção arrastada de 8,03 a 15,87 não é o mesmo recorte.
   *
   * Aceita `8`, `8,5` e `1:23` (o mesmo leitor do painel de vídeo), e prende à
   * duração do arquivo: pedir até o segundo 300 num áudio de 12 s devolvia um
   * recorte vazio e um erro sem explicação.
   */
  const carregadoDuracao = analise?.carregado.duracao ?? 0;
  const aplicarDigitado = (de0: string, ate0: string) => {
    const de = paraSegundos(de0);
    const ate = paraSegundos(ate0);
    if (de === null || ate === null) return;
    const fim = Math.min(ate, carregadoDuracao);
    const inicio = Math.max(0, Math.min(de, fim));
    if (!(fim > inicio)) return;
    setSelecao({ de: inicio, ate: fim });
  };

  /**
   * Recorta o que está selecionado, no canal escolhido, e devolve o WAV.
   *
   * Separado do download porque é exatamente isto que um serviço de
   * reconhecimento de música vai receber: o trecho, de UM canal. Misturar os
   * dois canais é o erro que impede identificar duas músicas simultâneas —
   * a soma não casa com nenhuma delas.
   */
  const montarRecorte = (): { blob: Blob; nome: string } | null => {
    if (!analise) return null;
    const { canais, taxa } = analise.carregado;
    const i0 = selecao ? Math.floor(selecao.de * taxa) : 0;
    const i1 = selecao ? Math.ceil(selecao.ate * taxa) : canais[0].length;
    const fatiar = (c: Float32Array) => c.slice(i0, Math.min(i1, c.length));

    const escolhidos =
      canalDoRecorte === "ambos" || canais.length < 2
        ? canais.map(fatiar)
        : [fatiar(canais[canalDoRecorte === "esquerdo" ? 0 : 1])];
    if (!escolhidos[0]?.length) return null;

    const faixa = selecao ? `-${selecao.de.toFixed(1)}s-${selecao.ate.toFixed(1)}s` : "";
    const qual = canais.length > 1 && canalDoRecorte !== "ambos" ? `-${canalDoRecorte}` : "";
    return { blob: montarWav(escolhidos, taxa), nome: `${nome}${qual}${faixa}.wav` };
  };

  /**
   * Roda um leitor canal a canal, SEMPRE sobre o áudio original a 1,0×.
   *
   * Canal a canal porque o truque mais comum é pôr a mensagem num só, e a
   * mistura destruiria a portadora. E sobre o original porque a variante de
   * reprodução (velocidade, modo fita) desloca toda frequência — em modo fita a
   * 0,5× o par DTMF de 697/1209 Hz vira 348,6/603,5 e o detector não acha nada,
   * sem erro nenhum.
   */
  const porCanal = <T,>(ler: (x: Float32Array, taxa: number) => T): Record<string, T> => {
    const r: Record<string, T> = {};
    if (!analise) return r;
    const { canais, taxa } = analise.carregado;
    const [e, d] = canais;
    r[canais.length > 1 ? "Esquerdo" : "Mono"] = ler(e, taxa);
    if (d) r.Direito = ler(d, taxa);
    if (d && analise.metricas.maiorDiferenca > 0) r.Diferença = ler(side(e, d), taxa);
    return r;
  };

  /** O áudio ao contrário — para o OUVIDO, e explicitamente fora da análise. */
  const ouvirAoContrario = () => {
    if (!analise) return;
    const { canais, taxa } = analise.carregado;
    const invertidos = canais.map((c) => {
      const v = new Float32Array(c.length);
      for (let i = 0; i < c.length; i++) v[i] = c[c.length - 1 - i];
      return v;
    });
    if (urlInvertido) URL.revokeObjectURL(urlInvertido);
    setUrlInvertido(URL.createObjectURL(montarWav(invertidos, taxa)));
  };

  const baixarRecorte = () => {
    const r = montarRecorte();
    if (!r) return;
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.nome;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <EspectrogramaCanvas
            espectro={espectroAtual}
            opcoes={opcoes}
            selecao={selecao}
            aoSelecionar={setSelecao}
          />
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

      {/* Recorte — a resposta ao caso de duas músicas, uma em cada canal. */}
      <Card className="p-4">
        <h3 className="font-display text-sm text-[var(--text-primary)]">Recortar um trecho</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Arraste no espectrograma ou escreva os segundos — “faixa direita, do 8 ao 16” sai das duas
          formas, e as duas ficam em dia uma com a outra. É manual de propósito: detectar sozinho
          onde uma faixa acaba e outra começa erra justo nos casos difíceis — transição sem
          silêncio, fade cruzado, mixagem contínua —, e você está VENDO a fronteira ali em cima.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {metricas.estereo ? (
            <div className="flex gap-1">
              {(["esquerdo", "direito", "ambos"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCanalDoRecorte(c)}
                  className={cn(
                    "rounded-[var(--radius-sm)] px-2 py-1 text-xs capitalize",
                    canalDoRecorte === c
                      ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">do segundo</span>
            <input
              type="text"
              value={deTexto}
              onChange={(e) => setDeTexto(e.target.value)}
              onBlur={() => aplicarDigitado(deTexto, ateTexto)}
              onKeyDown={(e) => e.key === "Enter" && aplicarDigitado(deTexto, ateTexto)}
              placeholder="8"
              aria-label="Início do trecho, em segundos"
              className="h-7 w-16 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 font-mono text-xs text-[var(--text-primary)]"
            />
            <span className="text-xs text-[var(--text-muted)]">ao</span>
            <input
              type="text"
              value={ateTexto}
              onChange={(e) => setAteTexto(e.target.value)}
              onBlur={() => aplicarDigitado(deTexto, ateTexto)}
              onKeyDown={(e) => e.key === "Enter" && aplicarDigitado(deTexto, ateTexto)}
              placeholder="16"
              aria-label="Fim do trecho, em segundos"
              className="h-7 w-16 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 font-mono text-xs text-[var(--text-primary)]"
            />
          </div>

          <span className="font-mono text-xs text-[var(--text-secondary)]">
            {selecao
              ? `${selecao.de.toFixed(2)} – ${selecao.ate.toFixed(2)} s (${(selecao.ate - selecao.de).toFixed(2)} s)`
              : `arquivo inteiro (${carregadoDuracao.toFixed(1)} s)`}
          </span>

          {selecao ? (
            <Button size="sm" variant="ghost" onClick={() => setSelecao(null)}>
              limpar
            </Button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => baixarRecorte()}>
            <Download className="h-4 w-4" />
            Baixar recorte (WAV)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={enviando}
            onClick={async () => {
              const r = montarRecorte();
              if (!r) return;
              setErroMusica(null);
              setEnviando(true);
              try {
                setMusica(await identificarMusica(r.blob, r.nome));
              } catch (e) {
                setErroMusica(e instanceof Error ? e.message : "não consegui consultar");
              } finally {
                setEnviando(false);
              }
            }}
          >
            <Wand2 className="h-4 w-4" />
            {enviando ? "Consultando…" : "Identificar música"}
          </Button>
        </div>

        {/* O aviso vive ao lado do botão, não em letra miúda no rodapé: é a
            ÚNICA coisa desta bancada que manda dado para fora. */}
        <p className="mt-2 text-xs text-[var(--text-muted)]">{AVISO_DE_ENVIO}</p>

        {erroMusica ? (
          <p className="mt-2 text-sm text-[var(--color-pulse-600)]">{erroMusica}</p>
        ) : null}

        {musica ? (
          musica.reconhecido ? (
            <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">
                  {canalDoRecorte === "ambos" ? "os dois canais" : canalDoRecorte}
                  {selecao ? ` · ${selecao.de.toFixed(1)}–${selecao.ate.toFixed(1)} s` : ""}
                </Badge>
                <span className="font-display text-sm text-[var(--text-primary)]">
                  {musica.musica.artista} — {musica.musica.titulo}
                </span>
                <CopyButton value={`${musica.musica.artista} — ${musica.musica.titulo}`} />
                {onDecodificador ? (
                  <button
                    type="button"
                    title="Mandar o título ao Decodificador"
                    onClick={() => onDecodificador(musica.musica.titulo)}
                    className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-[0.6875rem] text-[var(--text-muted)]">
                {[
                  musica.musica.album,
                  musica.musica.lancamento,
                  musica.musica.timecode ? `trecho a partir de ${musica.musica.timecode}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {musica.musica.timecode ? (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  O “trecho a partir de” diz onde este pedaço cai DENTRO da faixa. Se dois recortes
                  vizinhos devolverem o mesmo título com tempos crescentes, é a mesma música
                  continuando — não duas execuções.
                </p>
              ) : null}
            </div>
          ) : musica.configurado === false ? (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {musica.message ?? "O reconhecimento de música não está configurado neste servidor."}{" "}
              <span className="text-[var(--text-muted)]">
                Recortar outro trecho não vai adiantar — falta a chave do serviço.
              </span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Não reconheceu este trecho.{" "}
              <span className="text-[var(--text-muted)]">
                Vale tentar outro pedaço (10 a 15 s do refrão costuma funcionar melhor que a
                introdução), e — se os canais tiverem músicas diferentes — um canal de cada vez.
              </span>
            </p>
          )
        ) : null}
        {metricas.estereo && metricas.correlacao < 0.3 ? (
          <p className="mt-2 text-xs text-[var(--text-primary)]">
            Os canais têm conteúdo bem diferente entre si — se houver uma música em cada faixa,
            recorte <strong>um canal de cada vez</strong>. Misturados, o reconhecimento não casa com
            nenhuma das duas.
          </p>
        ) : null}
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
          <Button size="sm" variant="ghost" onClick={ouvirAoContrario}>
            Ouvir ao contrário
          </Button>
        </div>
        {urlInvertido ? (
          <div className="mt-3">
            <p className="mb-1 text-xs text-[var(--text-muted)]">
              Áudio invertido. O espectrograma de magnitude do invertido é o espelho EXATO do
              original — então isto é para ouvir, não para analisar.
            </p>
            {/** biome-ignore lint/a11y/useMediaCaption: áudio de prova, sem faixa de legenda possível */}
            <audio src={urlInvertido} controls className="w-full" />
          </div>
        ) : null}
      </Card>

      {/* DTMF e notas — os dois leitores que fecham cadeia com decoders existentes. */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm text-[var(--text-primary)]">
            Tons do telefone (DTMF)
          </h3>
          <Button size="sm" variant="secondary" onClick={() => setDtmf(porCanal(lerDtmf))}>
            Procurar DTMF
          </Button>
        </div>
        {dtmf ? (
          <ul className="mt-3 space-y-2">
            {Object.entries(dtmf).map(([canal, r]) => (
              <li key={canal} className="rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ehDtmf(r) ? "brand" : "neutral"}>{canal}</Badge>
                  {ehDtmf(r) ? (
                    <>
                      <code className="font-mono text-sm tracking-widest text-[var(--text-primary)]">
                        {r.texto}
                      </code>
                      <CopyButton value={r.texto} />
                      {onDecodificador ? (
                        <button
                          type="button"
                          title="Mandar ao Decodificador"
                          onClick={() => onDecodificador(r.texto)}
                          className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)]">{r.motivo}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Cada tecla é a SOMA de dois senos, e é essa definição que torna o detector rigoroso: um
            acorde tem energia espalhada e não passa.
          </p>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm text-[var(--text-primary)]">Notas musicais</h3>
          <Button size="sm" variant="secondary" onClick={() => setNotas(porCanal(lerNotas))}>
            Identificar notas
          </Button>
        </div>
        {notas ? (
          <ul className="mt-3 space-y-2">
            {Object.entries(notas).map(([canal, r]) => (
              <li key={canal} className="rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ehNotas(r) ? "brand" : "neutral"}>{canal}</Badge>
                  {ehNotas(r) ? (
                    <>
                      <code className="font-mono text-sm text-[var(--text-primary)]">
                        {r.textoSolfejo}
                      </code>
                      <CopyButton value={r.textoSolfejo} />
                      {onDecodificador ? (
                        <button
                          type="button"
                          title="Mandar ao Decodificador (vira letras e daí A1Z26)"
                          onClick={() => onDecodificador(r.textoSolfejo)}
                          className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)]">{r.motivo}</span>
                  )}
                </div>
                {ehNotas(r) ? (
                  <p className="mt-1 font-mono text-[0.6875rem] text-[var(--text-muted)]">
                    {r.textoAnglo} · {r.notas.length} notas · afinação A4={r.a4} Hz · desvio máx{" "}
                    {Math.max(...r.notas.map((x) => Math.abs(x.centavos)))} centavos
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Lê uma sequência de notas sustentadas e devolve “Dó Ré Mi Fá” — que o decoder{" "}
            <strong>Notas musicais</strong> já converte em letras, e daí em A1Z26. Acorde é
            recusado: inventar uma linha melódica dentro dele seria inventar dado.
          </p>
        )}
      </Card>

      {/* Morse por tom */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm text-[var(--text-primary)]">Morse por tom</h3>
          <Button size="sm" variant="secondary" onClick={() => setMorse(porCanal(lerMorse))}>
            Procurar Morse
          </Button>
        </div>
        {morse ? (
          <ul className="mt-3 space-y-2">
            {Object.entries(morse).map(([canal, r]) => (
              <li key={canal} className="rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ehAchado(r) ? "brand" : "neutral"}>{canal}</Badge>
                  {ehAchado(r) ? (
                    <>
                      <code className="font-mono text-sm text-[var(--text-primary)]">
                        {r.texto}
                      </code>
                      <CopyButton value={r.texto} />
                      {onDecodificador ? (
                        <button
                          type="button"
                          title="Mandar ao Decodificador"
                          onClick={() => onDecodificador(r.texto)}
                          className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)]">{r.motivo}</span>
                  )}
                </div>
                {ehAchado(r) ? (
                  <p className="mt-1 font-mono text-[0.6875rem] text-[var(--text-muted)]">
                    {r.simbolos.slice(0, 90)}
                    {r.simbolos.length > 90 ? "…" : ""} · portadora {Math.round(r.portadoraHz)} Hz ·{" "}
                    {r.wpm} WPM · {r.de.toFixed(1)}–{r.ate.toFixed(1)} s
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Procura um tom puro que liga e desliga, e o traduz. Passa por seis barreiras antes de
            afirmar qualquer coisa — sem elas, qualquer batida de 120 BPM vira “EEEEE”. Quando
            recusa, diz por quê.
          </p>
        )}
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
