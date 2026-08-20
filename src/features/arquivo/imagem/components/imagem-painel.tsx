import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";
import { ScanLine, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type CodigoLido, lerCodigos, rotuloDoFormato, temLeitorNativo } from "../codigo";
import { type Exif, lerExif } from "../exif";
import { MAX_BYTES, type VarreduraLsbImagem, varrerLsbImagem } from "../lsb";
import { alfaOpaco, apenasCanal, medirPlanos, planoDeBit } from "../planos";

type Vista =
  | { tipo: "original" }
  | { tipo: "canal"; canal: "vermelho" | "verde" | "azul" | "cinza" }
  | { tipo: "plano"; canal: "vermelho" | "verde" | "azul"; bit: number }
  | { tipo: "alfa" };

/**
 * O painel de imagem.
 *
 * ── A ARMADILHA QUE ESTE COMPONENTE EVITA ──────────────────────────────────
 * Ler pixels de um `<canvas>` depois de desenhar um JPEG **não devolve os
 * bytes originais**: o navegador aplica conversão de cor, e o valor lido pode
 * diferir do que o arquivo contém. Para JPEG isso é aceitável (a compressão
 * com perdas já destruiu o bit menos significativo, então não há LSB a
 * preservar). Para PNG **importa**, porque ali o LSB sobrevive — e é por isso
 * que a leitura pede `colorSpaceConversion: "none"`, que é o que o Chrome
 * respeita. No Safari não há `ImageDecoder` e o caminho é o canvas mesmo: a
 * tela avisa quando não pôde garantir o pixel exato.
 */
export function ImagemPainel({
  bytes,
  nome,
  onDecodificador,
}: {
  bytes: Uint8Array;
  nome: string;
  onDecodificador?: (texto: string) => void;
}) {
  const [px, setPx] = useState<{ dados: Uint8ClampedArray; w: number; h: number } | null>(null);
  const [exato, setExato] = useState(true);
  const [vista, setVista] = useState<Vista>({ tipo: "original" });
  const [erro, setErro] = useState<string | null>(null);
  const [codigos, setCodigos] = useState<CodigoLido[] | null>(null);
  const [lsb, setLsb] = useState<VarreduraLsbImagem | null>(null);
  const [motivoCodigo, setMotivoCodigo] = useState<string | null>(null);
  const [lendoCodigo, setLendoCodigo] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);

  const exif: Exif | null = useMemo(() => lerExif(bytes), [bytes]);

  /**
   * Ler QR / código de barras da FOTO.
   *
   * Sob demanda, e não ao abrir a imagem: o leitor de reserva é um download, e
   * a maioria das imagens de prova não tem código nenhum. O botão também deixa
   * a ação explícita — quem clica sabe o que esperar, e a ausência de resposta
   * vira uma frase em vez de silêncio.
   */
  const lerCodigo = async () => {
    if (!px) return;
    setLendoCodigo(true);
    setMotivoCodigo(null);
    try {
      // O `Uint8ClampedArray` que veio do canvas pode estar sobre um
      // `SharedArrayBuffer` no tipo, e o construtor de `ImageData` exige
      // `ArrayBuffer`. A cópia resolve o tipo e não custa nada perto do
      // trabalho de decodificar a imagem.
      const img = new ImageData(new Uint8ClampedArray(px.dados), px.w, px.h);
      const r = await lerCodigos(img);
      setCodigos(r.achados);
      setMotivoCodigo(r.motivo);
    } catch (e) {
      setMotivoCodigo(e instanceof Error ? e.message : "não consegui ler");
    } finally {
      setLendoCodigo(false);
    }
  };

  // ── carregar os pixels ────────────────────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    const blob = new Blob([bytes as unknown as BlobPart]);
    (async () => {
      try {
        const bitmap = await createImageBitmap(blob, {
          // Pede ao navegador para NÃO mexer nas cores. Onde a opção não é
          // respeitada, o aviso na tela cobre a diferença.
          colorSpaceConversion: "none",
        } as ImageBitmapOptions);
        if (!vivo) return;
        const c = document.createElement("canvas");
        c.width = bitmap.width;
        c.height = bitmap.height;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("sem canvas 2D");
        ctx.drawImage(bitmap, 0, 0);
        const img = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        setPx({ dados: img.data, w: bitmap.width, h: bitmap.height });
        setExato("ImageDecoder" in globalThis);
        bitmap.close();
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : "não consegui abrir a imagem");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [bytes]);

  // ── pintar a vista escolhida ──────────────────────────────────────────────
  /**
   * O LSB só existe em formato SEM PERDA. JPEG e WebP com perda descartam
   * justamente o bit baixo, e rodar neles devolveria ruído indistinguível de
   * "não achei" — pior que não rodar, porque quem lê não teria como saber.
   * Decidido pelos BYTES, não pela extensão, que qualquer um renomeia.
   */
  const semPerda = useMemo(() => {
    if (bytes.length < 12) return null;
    const b = bytes;
    if (b[0] === 0x89 && b[1] === 0x50) return true; // PNG
    if (b[0] === 0x42 && b[1] === 0x4d) return true; // BMP
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return true; // GIF
    if ((b[0] === 0x49 && b[1] === 0x49) || (b[0] === 0x4d && b[1] === 0x4d)) return true; // TIFF
    if (b[0] === 0xff && b[1] === 0xd8) return false; // JPEG
    if (String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP") return false;
    return null;
  }, [bytes]);

  const alfa = useMemo(() => (px ? alfaOpaco(px.dados) : null), [px]);
  const medida = useMemo(() => (px ? medirPlanos(px.dados, px.w) : null), [px]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !px) return;
    canvas.width = px.w;
    canvas.height = px.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dados =
      vista.tipo === "original"
        ? px.dados
        : vista.tipo === "canal"
          ? apenasCanal(px.dados, vista.canal)
          : vista.tipo === "plano"
            ? planoDeBit(px.dados, vista.canal, vista.bit)
            : (alfa?.imagem ?? px.dados);
    const img = ctx.createImageData(px.w, px.h);
    img.data.set(dados);
    ctx.putImageData(img, 0, 0);
  }, [px, vista, alfa]);

  if (erro) {
    return (
      <Card className="p-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Não consegui desenhar esta imagem ({erro}). Pode estar truncada ou com o cabeçalho
          adulterado — as camadas de bytes acima continuam valendo.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm text-[var(--text-primary)]">Imagem</h3>
          {px ? (
            <span className="font-mono text-xs text-[var(--text-muted)]">
              {px.w} × {px.h} px
            </span>
          ) : null}
          {!exato ? <Badge tone="pulse">pixel pode não ser exato neste navegador</Badge> : null}
        </div>

        <canvas
          ref={ref}
          className="mt-3 max-h-[420px] w-auto max-w-full rounded-[var(--radius-md)] bg-[var(--surface-sunken)] object-contain"
          style={{ imageRendering: vista.tipo === "plano" ? "pixelated" : "auto" }}
        />

        {/* Vistas */}
        <div className="mt-3 flex flex-wrap gap-1">
          {[
            { rotulo: "Original", v: { tipo: "original" } as Vista },
            { rotulo: "R", v: { tipo: "canal", canal: "vermelho" } as Vista },
            { rotulo: "G", v: { tipo: "canal", canal: "verde" } as Vista },
            { rotulo: "B", v: { tipo: "canal", canal: "azul" } as Vista },
            { rotulo: "Cinza", v: { tipo: "canal", canal: "cinza" } as Vista },
            { rotulo: "Alfa", v: { tipo: "alfa" } as Vista },
          ].map(({ rotulo, v }) => (
            <button
              key={rotulo}
              type="button"
              onClick={() => setVista(v)}
              className={cn(
                "rounded-[var(--radius-sm)] px-2 py-1 font-mono text-xs",
                JSON.stringify(vista) === JSON.stringify(v)
                  ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className="mt-2">
          <p className="mb-1 text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
            Planos de bit — 0 é o menos significativo, onde se esconde
          </p>
          <div className="flex flex-wrap gap-1">
            {(["vermelho", "verde", "azul"] as const).map((canal) =>
              [0, 1, 2, 3].map((bit) => {
                const v: Vista = { tipo: "plano", canal, bit };
                return (
                  <button
                    key={`${canal}${bit}`}
                    type="button"
                    onClick={() => setVista(v)}
                    className={cn(
                      "rounded-[var(--radius-sm)] px-2 py-1 font-mono text-xs",
                      JSON.stringify(vista) === JSON.stringify(v)
                        ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
                    )}
                  >
                    {canal[0].toUpperCase()}
                    {bit}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        {medida ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{medida.leitura}</p>
        ) : null}
        {alfa && alfa.comCorEscondida > 0 ? (
          <p className="mt-2 text-sm text-[var(--text-primary)]">
            <strong>
              {alfa.comCorEscondida.toLocaleString("pt-BR")} pixels são transparentes mas carregam
              cor
            </strong>{" "}
            — o navegador não os desenha, e eles continuam ali. Veja a vista Alfa.
          </p>
        ) : null}

        {/* ── O LSB, irmão TEXTUAL dos planos de bit acima ──────────────────
            Ali se VÊ o bit baixo; aqui se LÊ. Fica sob botão, e não automático,
            pela mesma razão do leitor de código: são 20 interpretações sobre
            até 64 KB cada, e travar a aba a cada imagem aberta seria pagar esse
            custo por quem só queria olhar a foto. */}
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!px || semPerda === false}
              onClick={() => px && setLsb(varrerLsbImagem(px.dados, px.w, px.h))}
            >
              <ScanLine className="h-4 w-4" />
              Procurar texto no bit menos significativo
            </Button>
            {semPerda === false ? (
              <span className="text-xs text-[var(--pulse)]">
                desligado: este formato tem PERDA (JPEG/WebP). A compressão descarta justamente o
                bit baixo — rodar aqui devolveria ruído com cara de “não achei”.
              </span>
            ) : null}
          </div>

          {lsb ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-[var(--text-muted)]">
                {lsb.testadas} interpretações testadas (canais × ordem de varredura × ordem dos
                bits) · corte de {lsb.corte} caracteres para um trecho contar
              </p>
              {lsb.achados.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Nenhum trecho passou do corte. Isso não quer dizer que não haja nada: quer dizer
                  que nada apareceu <strong>nestas</strong> interpretações, começando do primeiro
                  pixel e lendo até {Math.round(MAX_BYTES / 1024)} KB.
                </p>
              ) : (
                lsb.achados.slice(0, 3).map((a) => (
                  <div
                    key={`${a.opcoes.conjunto}${a.opcoes.varredura}${a.opcoes.ordem}`}
                    className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-2"
                  >
                    <p className="font-mono text-[0.6875rem] text-[var(--text-muted)]">
                      {a.opcoes.conjunto} · por {a.opcoes.varredura} · {a.opcoes.ordem}
                    </p>
                    {a.trechos.slice(0, 3).map((t) => (
                      <div key={t} className="mt-1 flex items-start gap-2">
                        <p className="min-w-0 flex-1 break-all font-mono text-sm text-[var(--text-primary)]">
                          {t.slice(0, 400)}
                        </p>
                        {onDecodificador ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onDecodificador(t)}
                            title="Abrir no Decodificador"
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>

        {/* Código impresso na imagem — QR, EAN, Code128. É a outra forma de a
            prova esconder texto numa foto, e não tem nada a ver com os planos
            de bit acima: aqui o dado está VISÍVEL, só não está legível. */}
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" disabled={!px || lendoCodigo} onClick={lerCodigo}>
              <ScanLine className="h-4 w-4" />
              {lendoCodigo ? "Lendo…" : "Ler QR / código de barras"}
            </Button>
            {!temLeitorNativo() ? (
              <span className="text-xs text-[var(--text-muted)]">
                este navegador só lê QR; o Chrome lê também código de barras
              </span>
            ) : null}
          </div>

          {codigos?.length ? (
            <div className="mt-3 space-y-2">
              {codigos.map((c) => (
                <div
                  key={c.texto}
                  className="rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{rotuloDoFormato(c.formato)}</Badge>
                    <span className="font-mono text-[0.625rem] text-[var(--text-muted)]">
                      {c.origem === "nativo" ? "leitor do sistema" : "leitor de reserva"}
                    </span>
                    <CopyButton value={c.texto} />
                    {onDecodificador ? (
                      <Button size="sm" variant="ghost" onClick={() => onDecodificador(c.texto)}>
                        <Wand2 className="h-3.5 w-3.5" />
                        usar como entrada
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-1 break-all font-mono text-sm text-[var(--text-primary)]">
                    {c.texto}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {motivoCodigo ? (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{motivoCodigo}</p>
          ) : null}
        </div>
      </Card>

      {/* EXIF */}
      {exif ? (
        <Card className="p-4">
          <h3 className="font-display text-sm text-[var(--text-primary)]">EXIF</h3>
          <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {exif.campos.map((c) => (
              <div key={`${c.grupo}-${c.tag}`} className="flex flex-wrap items-baseline gap-2">
                <dt className="font-mono text-xs text-[var(--text-muted)]">{c.tag}</dt>
                <dd className="min-w-0 break-all font-mono text-xs text-[var(--text-primary)]">
                  {c.valor}
                </dd>
                <CopyButton value={c.valor} />
                {onDecodificador ? (
                  <button
                    type="button"
                    title="Mandar ao Decodificador"
                    onClick={() => onDecodificador(c.valor)}
                    className="rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Wand2 className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ))}
          </dl>

          {exif.coordenada ? (
            <div className="mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  onDecodificador?.(`${exif.coordenada?.lat}, ${exif.coordenada?.lng}`)
                }
              >
                Mandar a coordenada ao Decodificador
              </Button>
            </div>
          ) : null}

          {exif.miniatura ? <MiniaturaExif bytes={exif.miniatura} nome={nome} /> : null}
        </Card>
      ) : null}
    </div>
  );
}

/**
 * A miniatura embutida no EXIF.
 *
 * Vale um bloco próprio porque ela é, com frequência, do arquivo **original
 * não editado**: muita ferramenta de edição regrava a imagem grande e esquece
 * a miniatura. Quando as duas divergem, a miniatura mostra o que foi apagado.
 */
function MiniaturaExif({ bytes, nome }: { bytes: Uint8Array; nome: string }) {
  const url = useMemo(
    () => URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: "image/jpeg" })),
    [bytes],
  );
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="mt-4">
      <h4 className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
        Miniatura embutida
      </h4>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Compare com a imagem acima. Muita ferramenta de edição regrava a foto grande e esquece a
        miniatura — quando as duas divergem, esta mostra o que foi apagado.
      </p>
      <img
        src={url}
        alt={`Miniatura EXIF de ${nome}`}
        className="mt-2 max-h-40 w-auto rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]"
      />
    </div>
  );
}
