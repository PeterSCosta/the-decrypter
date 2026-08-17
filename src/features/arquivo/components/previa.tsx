import { Card } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";

/**
 * Se é imagem, MOSTRA a imagem.
 *
 * Parece óbvio depois de dito, e não estava lá: a aba recortava um JPEG de
 * dentro de um WAV, oferecia baixar, e a pessoa tinha de sair do navegador para
 * ver o que tinha achado. Metade das provas de imagem se resolve olhando.
 *
 * O `img` carrega de um blob local — nada sai do navegador — e a dimensão real
 * aparece ao lado, porque **dimensão que não bate com o cabeçalho** é um truque
 * conhecido: um PNG que declara 100×100 e desenha 800×600 esconde o resto da
 * figura de quem só lê o cabeçalho.
 */
export function PreviaDeImagem({ bytes, nome }: { bytes: Uint8Array; nome: string }) {
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [erro, setErro] = useState(false);

  const url = useMemo(() => URL.createObjectURL(new Blob([bytes as unknown as BlobPart])), [bytes]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-display text-sm text-[var(--text-primary)]">Imagem</h3>
        {dim ? (
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {dim.w} × {dim.h} px
          </span>
        ) : null}
      </div>
      {erro ? (
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          O navegador não conseguiu desenhar esta imagem. Ela pode estar truncada, ou o cabeçalho
          pode estar adulterado — as camadas de bytes acima continuam valendo.
        </p>
      ) : (
        <img
          src={url}
          alt={`Prévia de ${nome}`}
          onLoad={(e) =>
            setDim({
              w: (e.target as HTMLImageElement).naturalWidth,
              h: (e.target as HTMLImageElement).naturalHeight,
            })
          }
          onError={() => setErro(true)}
          className="mt-3 max-h-[420px] w-auto max-w-full rounded-[var(--radius-md)] bg-[var(--surface-sunken)] object-contain"
        />
      )}
    </Card>
  );
}
