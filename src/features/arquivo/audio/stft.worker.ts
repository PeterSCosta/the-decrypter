import { type OpcoesStft, calcularStft } from "@/features/audio/stft";

/**
 * A STFT fora da thread principal.
 *
 * Medido no plano: ~932 ms para 60 s estéreo com N=2048 e 75% de sobreposição.
 * Um segundo de interface congelada por arquivo é o tipo de coisa que faz a
 * pessoa achar que a ferramenta travou — e como a aba calcula TRÊS vistas
 * (esquerdo, direito, diferença), o custo real é o triplo.
 *
 * O `Float32Array` das amostras vai por transferência, não por cópia: 22 MB por
 * minuto de estéreo, e copiar isso duas vezes é mais caro que a conta.
 */

export interface PedidoStft {
  amostras: Float32Array;
  taxa: number;
  opcoes: OpcoesStft;
}

export interface RespostaStft {
  /** Achatado: `quadros * bins`, para ir por transferência num buffer só. */
  dados: Float32Array;
  quadros: number;
  bins: number;
  resolucaoHz: number;
  resolucaoSegundos: number;
  taxa: number;
  duracao: number;
}

self.onmessage = (e: MessageEvent<PedidoStft>) => {
  const { amostras, taxa, opcoes } = e.data;
  const esp = calcularStft(amostras, taxa, opcoes);

  // Achatar num buffer só evita mandar milhares de Float32Array separados, que
  // é onde a serialização estrutural fica cara de verdade.
  const dados = new Float32Array(esp.quadros.length * esp.bins);
  for (let t = 0; t < esp.quadros.length; t++) dados.set(esp.quadros[t], t * esp.bins);

  const resposta: RespostaStft = {
    dados,
    quadros: esp.quadros.length,
    bins: esp.bins,
    resolucaoHz: esp.resolucaoHz,
    resolucaoSegundos: esp.resolucaoSegundos,
    taxa: esp.taxa,
    duracao: esp.duracao,
  };
  (self as unknown as Worker).postMessage(resposta, [dados.buffer as ArrayBuffer]);
};
