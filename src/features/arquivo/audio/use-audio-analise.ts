import { type MetricasDeCanal, medirCanais, side } from "@/features/audio/canais";
import { type AudioCarregado, carregarAudio } from "@/features/audio/decode";
import {
  type Espectrograma,
  PADRAO,
  acharCorteDoCodec,
  energiaPorFaixa,
} from "@/features/audio/stft";
import { useEffect, useState } from "react";
import type { PedidoStft, RespostaStft } from "./stft.worker";

export type Vista = "esquerdo" | "direito" | "diferenca";

export interface AudioAnalisado {
  carregado: AudioCarregado;
  metricas: MetricasDeCanal;
  /** Um espectrograma por vista disponível. */
  espectros: Partial<Record<Vista, Espectrograma>>;
  corteDoCodec: number | null;
  faixas: { faixa: [number, number]; db: number }[];
}

function daResposta(r: RespostaStft): Espectrograma {
  const quadros: Float32Array[] = [];
  for (let t = 0; t < r.quadros; t++) {
    quadros.push(r.dados.subarray(t * r.bins, (t + 1) * r.bins));
  }
  return {
    quadros,
    bins: r.bins,
    resolucaoHz: r.resolucaoHz,
    resolucaoSegundos: r.resolucaoSegundos,
    taxa: r.taxa,
    duracao: r.duracao,
  };
}

/**
 * Carrega o áudio e calcula as vistas.
 *
 * ── A REGRA INEGOCIÁVEL, e ela mora aqui ───────────────────────────────────
 * Tudo neste hook trabalha sobre o `AudioBuffer` ORIGINAL, a 1,0×. A variante
 * de reprodução — invertida, acelerada, em modo fita — é outro objeto, vive no
 * `<audio>` do painel e NUNCA chega a um detector.
 *
 * Não é preciosismo: medido no plano, em modo fita a 0,5× o par DTMF de
 * 697/1209 Hz vira 348,6/603,5 Hz, e o detector não acha tecla nenhuma — sem
 * erro, sem aviso, com os tons perfeitamente audíveis. É a falha silenciosa
 * perfeita, e o tipo de coisa que faz alguém desistir de uma prova achando que
 * não há nada ali.
 */
export function useAudioAnalise(
  bytes: Uint8Array,
  nome: string,
): {
  analise: AudioAnalisado | null;
  carregando: boolean;
  erro: string | null;
} {
  const [analise, setAnalise] = useState<AudioAnalisado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    setAnalise(null);

    const stft = (amostras: Float32Array, taxa: number): Promise<Espectrograma> =>
      new Promise((resolve, reject) => {
        const w = new Worker(new URL("./stft.worker.ts", import.meta.url), { type: "module" });
        w.onmessage = (e: MessageEvent<RespostaStft>) => {
          resolve(daResposta(e.data));
          w.terminate();
        };
        w.onerror = (e) => {
          reject(new Error(e.message));
          w.terminate();
        };
        // Cópia antes de transferir: o array original continua sendo usado pelo
        // painel (canais, LSB, download), e transferir o esvaziaria.
        const copia = amostras.slice();
        const pedido: PedidoStft = { amostras: copia, taxa, opcoes: PADRAO };
        // O cast existe porque `TypedArray.buffer` é `ArrayBufferLike`, que inclui
        // `SharedArrayBuffer` — e esse não é transferível. Aqui nunca é: `slice()`
        // sempre devolve um `ArrayBuffer` comum.
        w.postMessage(pedido, [copia.buffer as ArrayBuffer]);
      });

    (async () => {
      try {
        const carregado = await carregarAudio(new Blob([bytes as unknown as BlobPart]), nome);
        if (!vivo) return;
        const metricas = medirCanais(carregado.canais);

        const [e, d] = carregado.canais;
        const espectros: Partial<Record<Vista, Espectrograma>> = {};
        espectros.esquerdo = await stft(e, carregado.taxa);
        if (!vivo) return;
        if (d) {
          espectros.direito = await stft(d, carregado.taxa);
          if (!vivo) return;
          // A Diferença só vale a vista quando existe diferença: em mono
          // duplicado ela é uma faixa preta, e mostrar isso é ruído.
          if (metricas.maiorDiferenca > 0) {
            espectros.diferenca = await stft(side(e, d), carregado.taxa);
            if (!vivo) return;
          }
        }

        const principal = espectros.esquerdo;
        setAnalise({
          carregado,
          metricas,
          espectros,
          corteDoCodec: principal ? acharCorteDoCodec(principal) : null,
          faixas: principal
            ? energiaPorFaixa(principal, [
                [0, 20],
                [20, 300],
                [300, 5000],
                [5000, 16000],
                [16000, carregado.taxa / 2],
              ])
            : [],
        });
      } catch (x) {
        if (vivo) setErro(x instanceof Error ? x.message : "Não consegui decodificar este áudio.");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();

    return () => {
      vivo = false;
    };
  }, [bytes, nome]);

  return { analise, carregando, erro };
}
