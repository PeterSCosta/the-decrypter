/**
 * A camada dos BITS — esteganografia nas amostras.
 *
 * O princípio: o bit menos significativo de uma amostra de 16 bits vale
 * 1/32768 da escala. Trocá-lo muda o som em −90 dBFS, ou seja, nada que um
 * ouvido perceba — e cabe 1 bit por amostra, 44.100 bits por segundo por canal,
 * 5,5 KB de texto por segundo. É o esconderijo mais barato e mais usado.
 *
 * **Isto só funciona sobre os BYTES DO ARQUIVO, nunca sobre o `AudioBuffer`.**
 * O `decodeAudioData` converte para float, pode reamostrar e normaliza — e o
 * bit menos significativo é justamente o primeiro a morrer nessa viagem. Medida
 * conhecida: reamostrar 44100→48000→44100 deixa o LSB correto em ~51% das
 * amostras, ou seja, cara ou coroa. Por isso a análise mora aqui, no PCM cru.
 *
 * **Disciplina do falso positivo.** Este módulo NÃO afirma que encontrou
 * mensagem. Ele extrai, mede e devolve evidência: a maior corrida de caracteres
 * legíveis, o desvio estatístico do bit, e o texto para o humano ler. Áudio
 * limpo produz corridas legíveis por puro acaso — a régua está em
 * `corteMinimo()` — que ESCALA com o tamanho da busca —, e mesmo acima dele o
 * vocabulário é "possível", nunca "é".
 */

export interface OpcoesLsb {
  /** Bits por amostra do PCM: 8, 16, 24 ou 32. */
  bitsPorAmostra: number;
  /** Quantos bits baixos ler de cada amostra (1 a 4). */
  quantosBits: number;
  /** Canais intercalados no arquivo. */
  canais: number;
  /** Ler só um canal (0 = esquerdo, 1 = direito) ou todos (null). */
  canal: number | null;
  /** Como os bits se juntam em bytes. */
  ordem: "msb-primeiro" | "lsb-primeiro";
  /** Onde o PCM começa no arquivo. */
  offset: number;
}

export interface ResultadoLsb {
  opcoes: OpcoesLsb;
  /** Os bytes montados a partir dos bits extraídos. */
  bytes: Uint8Array;
  /** O maior trecho contíguo de caracteres imprimíveis. */
  maiorCorrida: string;
  /** Todo texto legível de tamanho razoável, em ordem de aparição. */
  trechos: string[];
  /** Fração de bytes que são ASCII imprimível — texto real fica perto de 1. */
  fracaoImprimivel: number;
  /** O corte usado, para a tela poder mostrá-lo junto do resultado. */
  corteUsado: number;
}

/** Fração de bytes que é ASCII imprimível num fluxo aleatório: 96/256. */
const P_IMPRIMIVEL = 96 / 256;

/** Quantos falsos aceitamos por arquivo analisado. */
const FALSOS_TOLERADOS = 0.01;

/** Piso: abaixo disto nem vale mostrar, mesmo em arquivo minúsculo. */
const CORRIDA_PISO = 12;

/**
 * O corte de "isto é mensagem" **escala com o tamanho da busca**.
 *
 * Esta função substituiu uma constante — `CORRIDA_MINIMA = 16` — e a razão é
 * uma correção de comparações múltiplas que a versão anterior ignorava. A conta:
 * a chance de um byte aleatório ser imprimível é 0,375, então a de uma corrida
 * de L é 0,375^L por posição; com M bytes examinados, os falsos ESPERADOS são
 * M × 0,375^L. E M cresce duas vezes — com a duração do áudio e com o número de
 * interpretações que a varredura testa (canal × ordem × quantidade de bits).
 *
 * Com o 16 fixo, varrendo 12 combinações:
 *
 * | duração | bytes examinados | falsos esperados a L=16 |
 * |---|---:|---:|
 * | 1 s | 132 mil | 0,02 |
 * | 60 s | 7,9 milhões | **1,2** |
 * | 5 min | 39,7 milhões | **6,1** |
 *
 * Ou seja: o teste de "áudio limpo não produz corrida longa" passava porque a
 * fixture tinha 1 segundo. Num arquivo de prova de verdade, a ferramenta
 * anunciaria meia dúzia de mensagens inexistentes — exatamente o pecado que
 * este módulo diz não cometer.
 *
 * O corte resultante fica entre 15 e 24 na prática, e o número **vai para a
 * tela** junto com o resultado: quem lê precisa saber quantas interpretações
 * foram testadas para calibrar o que "achou" significa.
 */
export function corteMinimo(bytesExaminados: number): number {
  if (bytesExaminados <= 0) return CORRIDA_PISO;
  const l = Math.log(FALSOS_TOLERADOS / bytesExaminados) / Math.log(P_IMPRIMIVEL);
  return Math.max(CORRIDA_PISO, Math.ceil(l));
}

const IMPRIMIVEL = (b: number) => (b >= 0x20 && b < 0x7f) || b === 0x0a || b === 0x0d || b === 0x09;

/** Onde o PCM começa num WAV: logo depois do cabeçalho do chunk `data`. */
export function offsetDoPcm(bytes: Uint8Array): number | null {
  if (bytes.length < 12) return null;
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== "RIFF") return null;
  let off = 12;
  while (off + 8 <= bytes.length) {
    const id = String.fromCharCode(...bytes.subarray(off, off + 4));
    const tam =
      bytes[off + 4] |
      (bytes[off + 5] << 8) |
      (bytes[off + 6] << 16) |
      (bytes[off + 7] * 0x1000000);
    if (id === "data") return off + 8;
    if (tam <= 0) return null;
    off += 8 + tam + (tam % 2);
  }
  return null;
}

/**
 * Extrai os bits baixos das amostras e monta bytes.
 *
 * O `bitsPorAmostra` decide o passo em bytes; o byte MENOS significativo de cada
 * amostra é o primeiro (PCM em WAV é little-endian), e é dele que saem os bits.
 */
export function extrairLsb(bytes: Uint8Array, opcoes: OpcoesLsb, corte?: number): ResultadoLsb {
  const { bitsPorAmostra, quantosBits, canais, canal, ordem, offset } = opcoes;
  const bytesPorAmostra = bitsPorAmostra / 8;
  const passo = bytesPorAmostra * canais;

  const saida: number[] = [];
  let acumulador = 0;
  let nBits = 0;

  for (let p = offset; p + passo <= bytes.length; p += passo) {
    for (let c = 0; c < canais; c++) {
      if (canal !== null && c !== canal) continue;
      // Little-endian: o byte de índice 0 da amostra é o menos significativo.
      const amostra = bytes[p + c * bytesPorAmostra];
      for (let b = 0; b < quantosBits; b++) {
        const bit = (amostra >> b) & 1;
        if (ordem === "msb-primeiro") acumulador = (acumulador << 1) | bit;
        else acumulador |= bit << nBits;
        nBits++;
        if (nBits === 8) {
          saida.push(acumulador & 0xff);
          acumulador = 0;
          nBits = 0;
        }
      }
    }
  }

  const montados = Uint8Array.from(saida);
  // Sem corte informado, calcula pelo que ESTA extração examinou. Quem varre
  // várias interpretações passa o corte da varredura inteira, que é maior.
  const corteEfetivo = corte ?? corteMinimo(montados.length);

  // Maior corrida de imprimíveis, e todos os trechos que valem leitura.
  let corrida = "";
  let maior = "";
  const trechos: string[] = [];
  let imprimiveis = 0;
  for (const b of montados) {
    if (IMPRIMIVEL(b)) {
      imprimiveis++;
      corrida += String.fromCharCode(b);
    } else {
      if (corrida.length >= corteEfetivo) trechos.push(corrida);
      if (corrida.length > maior.length) maior = corrida;
      corrida = "";
    }
  }
  if (corrida.length >= corteEfetivo) trechos.push(corrida);
  if (corrida.length > maior.length) maior = corrida;

  return {
    opcoes,
    bytes: montados,
    maiorCorrida: maior,
    trechos,
    fracaoImprimivel: montados.length ? imprimiveis / montados.length : 0,
    corteUsado: corteEfetivo,
  };
}

/**
 * Varredura: todas as combinações plausíveis, ordenadas pela força da evidência.
 *
 * Quem esconde não avisa a ordem dos bits nem o canal, e testar à mão é 16
 * tentativas. A varredura custa milissegundos e devolve o ranking.
 */
export function varrerLsb(
  bytes: Uint8Array,
  base: { bitsPorAmostra: number; canais: number; offset: number },
): ResultadoLsb[] {
  const canaisPossiveis: (number | null)[] = base.canais > 1 ? [null, 0, 1] : [null];
  const combinacoes: OpcoesLsb[] = [];
  for (const canal of canaisPossiveis) {
    for (const ordem of ["msb-primeiro", "lsb-primeiro"] as const) {
      for (const quantosBits of [1, 2]) {
        combinacoes.push({ ...base, canal, ordem, quantosBits });
      }
    }
  }

  // O corte vale para a VARREDURA, não para cada extração isolada: testar 12
  // interpretações multiplica por 12 a chance de topar com texto por acaso, e
  // um corte por extração ignoraria justamente isso.
  const amostras = Math.max(0, bytes.length - base.offset) / (base.bitsPorAmostra / 8);
  const bytesExaminados = combinacoes.reduce(
    (n, c) => n + (amostras * (c.canal === null ? base.canais : 1) * c.quantosBits) / 8,
    0,
  );
  const corte = corteMinimo(bytesExaminados);
  const resultados = combinacoes.map((c) => extrairLsb(bytes, c, corte));
  // Corrida legível é o sinal mais forte; a fração imprimível desempata.
  return resultados.sort(
    (a, b) =>
      b.maiorCorrida.length - a.maiorCorrida.length || b.fracaoImprimivel - a.fracaoImprimivel,
  );
}

export interface AnomaliaDeBit {
  /** Fração de amostras com o bit baixo em 1. Áudio natural fica perto de 0,5. */
  proporcaoDeUns: number;
  /**
   * Qui-quadrado do teste de pares (Westfeld & Pfitzmann).
   *
   * A substituição clássica de LSB torna os pares (2k, 2k+1) equiprováveis: ela
   * só troca dentro do par, então as duas contagens convergem. Num áudio natural
   * o histograma é suave e as duas metades do par diferem. Valor BAIXO com
   * muitas amostras é o indício.
   */
  quiQuadradoDePares: number;
  amostrasAnalisadas: number;
  leitura: string;
}

/**
 * Procura o rastro estatístico da substituição de LSB.
 *
 * Serve para o caso em que o dado embutido está CIFRADO — aí não há texto para
 * achar, os bits parecem aleatórios, e a única pista é o histograma. Steghide e
 * DeepSound cifram por padrão, então este teste é o que sobra.
 */
export function detectarAnomaliaDeBit(
  bytes: Uint8Array,
  base: { bitsPorAmostra: number; canais: number; offset: number },
): AnomaliaDeBit {
  const bytesPorAmostra = base.bitsPorAmostra / 8;
  const passo = bytesPorAmostra;
  let uns = 0;
  let total = 0;
  // Histograma dos valores de 16 bits com sinal, para o teste de pares.
  const hist = new Map<number, number>();

  for (let p = base.offset; p + bytesPorAmostra <= bytes.length; p += passo) {
    const baixo = bytes[p];
    uns += baixo & 1;
    total++;
    if (base.bitsPorAmostra === 16) {
      const v = (bytes[p] | (bytes[p + 1] << 8)) & 0xffff;
      hist.set(v, (hist.get(v) ?? 0) + 1);
    }
  }

  let qui = 0;
  let pares = 0;
  for (const [v, n] of hist) {
    if (v % 2 !== 0) continue;
    const par = hist.get(v + 1) ?? 0;
    const soma = n + par;
    // Pares raros não dizem nada e inflam o qui-quadrado; o piso de 8 é o
    // mínimo usual para a aproximação valer.
    if (soma < 8) continue;
    const esperado = soma / 2;
    qui += (n - esperado) ** 2 / esperado;
    pares++;
  }
  const quiMedio = pares ? qui / pares : Number.NaN;
  const proporcao = total ? uns / total : 0;

  let leitura: string;
  if (total < 1000) {
    leitura = "Amostras demais de menos para uma leitura estatística.";
  } else if (Number.isNaN(quiMedio)) {
    leitura = "Formato sem teste de pares disponível (só PCM de 16 bits).";
  } else if (quiMedio < 0.5) {
    leitura =
      "O histograma tem os pares de valores quase empatados — é o rastro que a substituição de LSB deixa, inclusive quando o dado está cifrado.";
  } else if (Math.abs(proporcao - 0.5) < 0.005 && quiMedio < 1.5) {
    leitura =
      "Bit baixo distribuído como moeda honesta, o que é compatível com dado embutido — mas também com áudio ruidoso.";
  } else {
    leitura = "Nada de anormal na distribuição do bit baixo.";
  }

  return {
    proporcaoDeUns: proporcao,
    quiQuadradoDePares: quiMedio,
    amostrasAnalisadas: total,
    leitura,
  };
}
