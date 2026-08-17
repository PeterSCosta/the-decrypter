import { goertzel } from "@/features/audio/fft";

/**
 * DTMF — os tons do teclado do telefone.
 *
 * Cada tecla é a SOMA de dois senos: um da linha, um da coluna. É o esquema
 * mais bem definido que existe em áudio, e por isso o detector pode ser
 * rigoroso sem virar chute.
 *
 * O Goertzel é o algoritmo certo aqui, e não a FFT: são 8 frequências
 * conhecidas, e ele custa O(n) por frequência contra O(n log n) da FFT inteira.
 * De quebra, não sofre com a quantização em bins — 697 Hz não precisa cair no
 * centro de um bin para ser medido.
 */

const LINHAS = [697, 770, 852, 941];
const COLUNAS = [1209, 1336, 1477, 1633];
const TECLAS = [
  ["1", "2", "3", "A"],
  ["4", "5", "6", "B"],
  ["7", "8", "9", "C"],
  ["*", "0", "#", "D"],
];

export interface DigitoDtmf {
  tecla: string;
  de: number;
  ate: number;
  /** Quão acima do resto do espectro o par está, em dB. */
  forcaDb: number;
}

export interface AchadoDtmf {
  digitos: DigitoDtmf[];
  /** A sequência pronta para copiar e mandar ao Decodificador. */
  texto: string;
}

export interface RecusaDtmf {
  motivo: string;
}

export const ehDtmf = (r: AchadoDtmf | RecusaDtmf): r is AchadoDtmf => "digitos" in r;

/**
 * Duração mínima de um dígito. A norma manda 40 ms; telefone real usa 70 a 100.
 * Abaixo de 30 ms qualquer transiente de música dispara.
 */
const MINIMO_MS = 35;

/**
 * O par tem de DOMINAR: as duas frequências escolhidas precisam estar bem acima
 * das outras seis. É esta razão que separa DTMF de música — um acorde tem
 * energia espalhada, um dígito tem exatamente dois picos.
 */
const RAZAO_MINIMA = 4;

export function lerDtmf(amostras: Float32Array, taxa: number): AchadoDtmf | RecusaDtmf {
  const janela = Math.round(taxa * 0.02); // 20 ms
  const passo = Math.round(taxa * 0.01); // 10 ms
  if (amostras.length < janela * 4) return { motivo: "Áudio curto demais para conter DTMF." };

  const quadros: (string | null)[] = [];
  const forcas: number[] = [];
  const buffer = new Float64Array(janela);

  for (let off = 0; off + janela <= amostras.length; off += passo) {
    for (let i = 0; i < janela; i++) buffer[i] = amostras[off + i];

    const l = LINHAS.map((f) => goertzel(buffer, taxa, f));
    const c = COLUNAS.map((f) => goertzel(buffer, taxa, f));
    const iL = l.indexOf(Math.max(...l));
    const iC = c.indexOf(Math.max(...c));

    // O segundo colocado de cada grupo é a referência: se o primeiro não o
    // domina, não há par definido — é ruído ou música.
    const segundoL = Math.max(...l.filter((_, i) => i !== iL));
    const segundoC = Math.max(...c.filter((_, i) => i !== iC));
    const razao = Math.min(l[iL] / (segundoL + 1e-12), c[iC] / (segundoC + 1e-12));

    // As duas linhas também precisam ter energia parecida: num par legítimo a
    // diferença entre linha e coluna fica dentro de ~8 dB.
    const equilibrio = Math.abs(20 * Math.log10((l[iL] + 1e-12) / (c[iC] + 1e-12)));

    const valido = razao >= RAZAO_MINIMA && equilibrio < 10;
    quadros.push(valido ? TECLAS[iL][iC] : null);
    forcas.push(valido ? 20 * Math.log10(razao) : 0);
  }

  // Corridas do mesmo dígito viram um evento.
  const digitos: DigitoDtmf[] = [];
  let atual: string | null = null;
  let inicio = 0;
  let somaForca = 0;
  const fecha = (fim: number) => {
    if (atual === null) return;
    const ms = (fim - inicio) * 10;
    if (ms >= MINIMO_MS) {
      digitos.push({
        tecla: atual,
        de: (inicio * passo) / taxa,
        ate: (fim * passo) / taxa,
        forcaDb: somaForca / Math.max(1, fim - inicio),
      });
    }
  };
  for (let i = 0; i < quadros.length; i++) {
    if (quadros[i] !== atual) {
      fecha(i);
      atual = quadros[i];
      inicio = i;
      somaForca = 0;
    }
    somaForca += forcas[i];
  }
  fecha(quadros.length);

  if (!digitos.length) {
    return {
      motivo:
        "Nenhum par de tons do teclado telefônico com duração e dominância suficientes. DTMF são DOIS senos ao mesmo tempo, cada um dominando seu grupo — música tem energia espalhada e não passa aqui.",
    };
  }

  return { digitos, texto: digitos.map((d) => d.tecla).join("") };
}
