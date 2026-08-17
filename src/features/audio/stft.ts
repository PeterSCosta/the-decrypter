import { hann, magnitudes } from "./fft";

/**
 * A camada do ESPECTRO — onde mora o truque mais visual de todos: escrever a
 * resposta desenhando no espectrograma.
 *
 * Ferramentas como Coagula, Photosounder e Spectrology convertem uma imagem em
 * som; tocado, vira ruído sem sentido, e só o espectrograma revela o texto. É
 * inaudível por construção, então nenhum detector de som acha — precisa do olho.
 *
 * O que este módulo entrega é a matriz tempo × frequência. Quem a pinta é o
 * `render.ts`; quem procura estrutura não-natural nela é o `espectro.ts`.
 */

export interface Espectrograma {
  /** `quadros[t][f]` em dB, de `pisoDb` a 0. */
  quadros: Float32Array[];
  /** Quantos bins de frequência (n/2 + 1). */
  bins: number;
  /** Hz por bin. */
  resolucaoHz: number;
  /** Segundos por quadro. */
  resolucaoSegundos: number;
  taxa: number;
  duracao: number;
}

export interface OpcoesStft {
  /** Tamanho da janela, potência de 2. 2048 a 44,1 kHz dá 21,5 Hz por bin. */
  n: number;
  /** Avanço entre janelas. n/4 dá 75% de sobreposição — bom para desenho. */
  salto: number;
  /** Abaixo disto tudo vira fundo. −90 dB revela o que −60 esconde. */
  pisoDb: number;
}

export const PADRAO: OpcoesStft = { n: 2048, salto: 512, pisoDb: -100 };

/**
 * Calcula a STFT de um canal.
 *
 * Custo medido no plano: ~932 ms para 60 s estéreo com estes parâmetros. É por
 * isso que a aba de áudio não pode viver dentro do fan-out do Decodificador,
 * que roda a cada tecla — e por isso este cálculo vai para um Worker quando o
 * arquivo é longo.
 */
export function calcularStft(
  amostras: Float32Array,
  taxa: number,
  opcoes: OpcoesStft = PADRAO,
): Espectrograma {
  const { n, salto, pisoDb } = opcoes;
  const janela = hann(n);
  const bins = n / 2 + 1;
  const quadros: Float32Array[] = [];
  const buffer = new Float64Array(n);

  // Normalização coerente: a soma da janela, para que um seno de amplitude 1
  // dê 0 dB e não um número que depende do tamanho da janela.
  let somaJanela = 0;
  for (let i = 0; i < n; i++) somaJanela += janela[i];
  const escala = 2 / somaJanela;

  for (let inicio = 0; inicio + n <= amostras.length; inicio += salto) {
    for (let i = 0; i < n; i++) buffer[i] = amostras[inicio + i] * janela[i];
    const mag = magnitudes(buffer);
    const quadro = new Float32Array(bins);
    for (let i = 0; i < bins; i++) {
      const db = 20 * Math.log10(mag[i] * escala + 1e-12);
      quadro[i] = db < pisoDb ? pisoDb : db;
    }
    quadros.push(quadro);
  }

  return {
    quadros,
    bins,
    resolucaoHz: taxa / n,
    resolucaoSegundos: salto / taxa,
    taxa,
    duracao: amostras.length / taxa,
  };
}

/**
 * Energia média por faixa de frequência, em dB.
 *
 * Serve para o diagnóstico barato: quanta energia existe acima de 16 kHz (onde
 * o ouvido adulto já não chega e o MP3 costuma cortar), e quanta abaixo de
 * 20 Hz. Energia forte numa faixa que deveria estar vazia é o indício de
 * portadora fora da percepção.
 */
export function energiaPorFaixa(
  esp: Espectrograma,
  faixas: [number, number][],
): { faixa: [number, number]; db: number }[] {
  return faixas.map(([de, ate]) => {
    const binDe = Math.max(0, Math.floor(de / esp.resolucaoHz));
    const binAte = Math.min(esp.bins - 1, Math.ceil(ate / esp.resolucaoHz));
    let soma = 0;
    let n = 0;
    for (const q of esp.quadros) {
      for (let b = binDe; b <= binAte; b++) {
        // Volta de dB para potência antes de somar: média de decibéis é
        // média de logaritmo, e o pico se dilui no meio dos silêncios.
        soma += 10 ** (q[b] / 10);
        n++;
      }
    }
    return {
      faixa: [de, ate] as [number, number],
      db: n ? 10 * Math.log10(soma / n) : Number.NEGATIVE_INFINITY,
    };
  });
}

/**
 * O corte do codec: a frequência acima da qual não há praticamente nada.
 *
 * Um MP3 a 128 kbps corta perto de 16 kHz; um WAV não corta. Saber o corte
 * REAL importa por dois motivos: um arquivo `.wav` com corte de 16 kHz passou
 * por MP3 em algum momento (e portanto LSB ali é inútil), e uma portadora
 * ultrassônica acima do corte é impossível de ter sobrevivido — logo, se
 * existe, foi posta depois.
 */
export function acharCorteDoCodec(esp: Espectrograma): number | null {
  // Perfil médio em potência, por bin.
  const perfil = new Float64Array(esp.bins);
  for (const q of esp.quadros) for (let b = 0; b < esp.bins; b++) perfil[b] += 10 ** (q[b] / 10);
  for (let b = 0; b < esp.bins; b++) perfil[b] /= esp.quadros.length || 1;

  // Referência: a mediana da metade de baixo do espectro.
  const metade = Array.from(perfil.subarray(0, Math.floor(esp.bins / 2))).sort((a, b) => a - b);
  const referencia = metade[Math.floor(metade.length / 2)] || 1e-12;
  const limiar = referencia * 1e-4; // −40 dB abaixo da mediana

  for (let b = esp.bins - 1; b > 0; b--) {
    if (perfil[b] > limiar) {
      const hz = b * esp.resolucaoHz;
      // Perto de Nyquist não há corte nenhum — é só o fim do espectro.
      return hz >= esp.taxa / 2 - esp.resolucaoHz * 2 ? null : hz;
    }
  }
  return null;
}
