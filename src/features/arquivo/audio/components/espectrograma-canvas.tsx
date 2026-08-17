import type { Espectrograma } from "@/features/audio/stft";
import { cn } from "@/lib/cn";
import { useEffect, useRef, useState } from "react";
import { type OpcoesDeRender, pintar } from "../render";

/**
 * O espectrograma pintado, com leitura de tempo e frequência sob o cursor, e
 * seleção de trecho por arraste.
 *
 * A leitura não é enfeite: quando alguém acha um risco no espectro, a pergunta
 * seguinte é sempre "em que segundo e em que frequência?" — e é dali que sai o
 * parâmetro para filtrar, ou o dado que a prova pede.
 */
export function EspectrogramaCanvas({
  espectro,
  opcoes,
  altura = 220,
  selecao,
  aoSelecionar,
}: {
  espectro: Espectrograma;
  opcoes: OpcoesDeRender;
  altura?: number;
  /** Trecho selecionado, em segundos. */
  selecao?: { de: number; ate: number } | null;
  /**
   * Arrastar no espectrograma escolhe um trecho.
   *
   * É deliberadamente MANUAL. Detectar sozinho onde uma música acaba e outra
   * começa erra justamente nos casos que importam — transição sem silêncio,
   * fade cruzado, mixagem contínua. E quem está olhando o espectrograma VÊ a
   * fronteira: a mudança de textura salta aos olhos muito antes de qualquer
   * heurística acertar.
   */
  aoSelecionar?: (s: { de: number; ate: number } | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [sob, setSob] = useState<{ s: number; hz: number } | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const largura = canvas.clientWidth || 800;
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dados = pintar(espectro, largura, altura, opcoes);
    // `createImageData` + `set` em vez de `new ImageData(dados, …)`: o
    // construtor exige `Uint8ClampedArray<ArrayBuffer>`, e o genérico novo de
    // TypedArray do TS não aceita o `ArrayBufferLike` que sai de um array
    // comum. Este caminho é o mesmo custo e não precisa de cast.
    const img = ctx.createImageData(largura, altura);
    img.data.set(dados);
    ctx.putImageData(img, 0, 0);
  }, [espectro, opcoes, altura]);

  const segundoNoEvento = (e: { clientX: number; currentTarget: HTMLElement }) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * espectro.duracao;
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        <canvas
          ref={ref}
          className={cn(
            "block h-auto w-full rounded-[var(--radius-md)] bg-black",
            aoSelecionar ? "cursor-crosshair" : undefined,
          )}
          style={{ height: altura }}
          onMouseDown={(e) => {
            if (!aoSelecionar) return;
            setArrastando(segundoNoEvento(e));
          }}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;
            const [de, ate] = opcoes.faixaHz;
            setSob({ s: x * espectro.duracao, hz: de + (1 - y) * (ate - de) });
            if (arrastando !== null && aoSelecionar) {
              const agora = segundoNoEvento(e);
              aoSelecionar({ de: Math.min(arrastando, agora), ate: Math.max(arrastando, agora) });
            }
          }}
          onMouseUp={(e) => {
            if (arrastando === null || !aoSelecionar) return;
            const agora = segundoNoEvento(e);
            // Clique sem arrastar limpa a seleção, em vez de criar um trecho de
            // zero segundo que não serve para nada.
            aoSelecionar(
              Math.abs(agora - arrastando) < 0.15
                ? null
                : { de: Math.min(arrastando, agora), ate: Math.max(arrastando, agora) },
            );
            setArrastando(null);
          }}
          onMouseLeave={() => {
            setSob(null);
            setArrastando(null);
          }}
        />
        {selecao && espectro.duracao > 0 ? (
          <div
            className="pointer-events-none absolute inset-y-0 border-[var(--brand)] border-x-2 bg-[var(--brand)]/20"
            style={{
              left: `${(selecao.de / espectro.duracao) * 100}%`,
              width: `${((selecao.ate - selecao.de) / espectro.duracao) * 100}%`,
            }}
          />
        ) : null}
      </div>
      <div className="flex justify-between font-mono text-[0.6875rem] text-[var(--text-muted)]">
        <span>0 s</span>
        <span>
          {sob
            ? `${sob.s.toFixed(2)} s · ${Math.round(sob.hz).toLocaleString("pt-BR")} Hz`
            : aoSelecionar
              ? "arraste para recortar um trecho"
              : `${Math.round(opcoes.faixaHz[1]).toLocaleString("pt-BR")} Hz no topo`}
        </span>
        <span>{espectro.duracao.toFixed(1)} s</span>
      </div>
    </div>
  );
}
