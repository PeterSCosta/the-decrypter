import type { Espectrograma } from "@/features/audio/stft";
import { useEffect, useRef, useState } from "react";
import { type OpcoesDeRender, pintar } from "../render";

/**
 * O espectrograma pintado, com leitura de tempo e frequência sob o cursor.
 *
 * A leitura não é enfeite: quando alguém acha um risco no espectro, a pergunta
 * seguinte é sempre "em que segundo e em que frequência?" — e é dali que sai o
 * parâmetro para filtrar, ou o dado que a prova pede.
 */
export function EspectrogramaCanvas({
  espectro,
  opcoes,
  altura = 220,
}: {
  espectro: Espectrograma;
  opcoes: OpcoesDeRender;
  altura?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [sob, setSob] = useState<{ s: number; hz: number } | null>(null);

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

  return (
    <div className="space-y-1">
      <canvas
        ref={ref}
        className="block h-auto w-full rounded-[var(--radius-md)] bg-black"
        style={{ height: altura }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          const y = (e.clientY - r.top) / r.height;
          const [de, ate] = opcoes.faixaHz;
          setSob({ s: x * espectro.duracao, hz: de + (1 - y) * (ate - de) });
        }}
        onMouseLeave={() => setSob(null)}
      />
      <div className="flex justify-between font-mono text-[0.6875rem] text-[var(--text-muted)]">
        <span>0 s</span>
        <span>
          {sob
            ? `${sob.s.toFixed(2)} s · ${Math.round(sob.hz).toLocaleString("pt-BR")} Hz`
            : `${Math.round(opcoes.faixaHz[1]).toLocaleString("pt-BR")} Hz no topo`}
        </span>
        <span>{espectro.duracao.toFixed(1)} s</span>
      </div>
    </div>
  );
}
