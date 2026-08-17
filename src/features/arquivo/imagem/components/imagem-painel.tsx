import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";
import { Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Exif, lerExif } from "../exif";
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
  const ref = useRef<HTMLCanvasElement>(null);

  const exif: Exif | null = useMemo(() => lerExif(bytes), [bytes]);

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
