import { corteMinimo } from "@/features/audio/lsb";

/**
 * LSB de IMAGEM — a mensagem escondida no bit menos significativo do pixel.
 *
 * O princípio é o mesmo do áudio: trocar o último bit de um canal de cor muda o
 * valor em 1/255, invisível a olho nu, e cabe 1 bit por canal por pixel. Numa
 * foto de 12 megapixels são 4,5 MB de esconderijo.
 *
 * ── A CONDIÇÃO QUE PRECISA ESTAR NA TELA, NÃO SÓ AQUI ─────────────────────
 * **Isto só vale em formato SEM PERDA** — PNG, BMP, TIFF, GIF. JPEG e WebP com
 * perda destroem o bit baixo por construção: a compressão trabalha justamente
 * descartando o que o olho não vê, que é exatamente onde a mensagem mora.
 * Rodar a varredura num JPEG não devolve "não achei": devolve ruído com a mesma
 * cara de "não achei", e quem lê não tem como distinguir. Por isso o painel
 * DESLIGA o card em JPEG e diz por quê, em vez de rodar e calar.
 *
 * ── O QUE ESTE MÓDULO SE RECUSA A DIZER ───────────────────────────────────
 * Ele não afirma que encontrou mensagem. Extrai, mede e devolve evidência: o
 * maior trecho legível, quantas interpretações foram testadas e qual o corte
 * usado. Imagem limpa produz corridas legíveis por acaso — e quanto mais
 * interpretações se testa, mais acaso se colhe. É o mesmo `corteMinimo` do LSB
 * de áudio, e ele é reusado em vez de recalculado justamente para as duas
 * telas não divergirem no que consideram evidência.
 */

/** Uma cadeia de caracteres iguais não é texto — ver `strings.ts`. */
const temVariedade = (s: string, minimoDistintos = 5): boolean =>
  new Set(s).size >= minimoDistintos;

const IMPRIMIVEL = (b: number) => (b >= 0x20 && b < 0x7f) || b === 0x0a || b === 0x0d || b === 0x09;

export interface OpcoesLsbImagem {
  /** Quais canais entram, e em que ordem. */
  conjunto: "rgb" | "r" | "g" | "b" | "rgba";
  /** Ordem de leitura dos pixels. */
  varredura: "linha" | "coluna";
  /** Como os bits se juntam em bytes. */
  ordem: "msb-primeiro" | "lsb-primeiro";
  /** Quantos bits baixos ler de cada canal. */
  quantosBits: 1 | 2;
}

export interface ResultadoLsbImagem {
  opcoes: OpcoesLsbImagem;
  /** O maior trecho contíguo de caracteres imprimíveis. */
  maiorCorrida: string;
  /** Os trechos que passaram do corte, em ordem de aparição. */
  trechos: string[];
  fracaoImprimivel: number;
  /** O corte usado — vai para a tela, para quem lê calibrar o "achou". */
  corteUsado: number;
  /** Quantos bytes esta interpretação montou. */
  bytesLidos: number;
}

const CANAIS: Record<OpcoesLsbImagem["conjunto"], number[]> = {
  rgb: [0, 1, 2],
  r: [0],
  g: [1],
  b: [2],
  rgba: [0, 1, 2, 3],
};

/**
 * Teto de bytes por interpretação.
 *
 * Uma foto de 8 megapixels dá 3 MB por interpretação, e são 40 delas. Sem teto
 * a varredura congela a aba por segundos — e o que se procura é uma mensagem,
 * que cabe muito antes disso. Quem esconde texto numa imagem começa do primeiro
 * pixel, porque é o único ponto de partida que o outro lado sabe achar.
 */
export const MAX_BYTES = 64 * 1024;

export function extrairLsbImagem(
  px: Uint8ClampedArray,
  w: number,
  h: number,
  opcoes: OpcoesLsbImagem,
  corte?: number,
): ResultadoLsbImagem {
  const canais = CANAIS[opcoes.conjunto];
  const bytes: number[] = [];
  let acc = 0;
  let n = 0;

  const empurrar = (bit: number) => {
    acc = opcoes.ordem === "msb-primeiro" ? (acc << 1) | bit : acc | (bit << n);
    if (++n === 8) {
      bytes.push(acc & 0xff);
      acc = 0;
      n = 0;
    }
  };

  const total = w * h;
  for (let i = 0; i < total && bytes.length < MAX_BYTES; i++) {
    // A varredura por COLUNA existe porque quem esconde às vezes escreve assim,
    // e a diferença é invisível: as duas leituras produzem bytes plausíveis.
    const idx = opcoes.varredura === "linha" ? i : ((i % h) * w + Math.floor(i / h)) % total;
    const base = idx * 4;
    for (const c of canais) {
      const v = px[base + c];
      if (opcoes.quantosBits === 1) empurrar(v & 1);
      else {
        empurrar((v >> 1) & 1);
        empurrar(v & 1);
      }
    }
  }

  const corteEfetivo = corte ?? corteMinimo(bytes.length);
  let corrida = "";
  let maior = "";
  const trechos: string[] = [];
  let imprimiveis = 0;
  for (const b of bytes) {
    if (IMPRIMIVEL(b)) {
      imprimiveis++;
      corrida += String.fromCharCode(b);
    } else {
      if (corrida.length >= corteEfetivo && temVariedade(corrida)) trechos.push(corrida);
      if (corrida.length > maior.length) maior = corrida;
      corrida = "";
    }
  }
  if (corrida.length >= corteEfetivo && temVariedade(corrida)) trechos.push(corrida);
  if (corrida.length > maior.length) maior = corrida;

  return {
    opcoes,
    maiorCorrida: maior,
    trechos,
    fracaoImprimivel: bytes.length ? imprimiveis / bytes.length : 0,
    corteUsado: corteEfetivo,
    bytesLidos: bytes.length,
  };
}

/** As 20 interpretações que a varredura testa. */
const COMBINACOES: OpcoesLsbImagem[] = (["rgb", "r", "g", "b", "rgba"] as const).flatMap(
  (conjunto) =>
    (["linha", "coluna"] as const).flatMap((varredura) =>
      (["msb-primeiro", "lsb-primeiro"] as const).map((ordem) => ({
        conjunto,
        varredura,
        ordem,
        quantosBits: 1 as const,
      })),
    ),
);

export interface VarreduraLsbImagem {
  /** Só as interpretações que falaram alguma coisa, melhor primeiro. */
  achados: ResultadoLsbImagem[];
  /** Quantas foram testadas — o número vai para a tela. */
  testadas: number;
  /** O corte comum, calculado sobre a busca INTEIRA. */
  corte: number;
}

/**
 * Testa todas as interpretações e devolve as que falaram.
 *
 * ── POR QUE O CORTE É DA VARREDURA, E NÃO DE CADA UMA ─────────────────────
 * Testar 20 interpretações é colher 20 vezes mais acaso. Um corte calculado por
 * interpretação deixaria passar, em média, 20 corridas falsas — e cada uma
 * apareceria na tela com a mesma cara de achado. O corte sobe com o tamanho da
 * busca, e o número vai junto do resultado.
 */
export function varrerLsbImagem(px: Uint8ClampedArray, w: number, h: number): VarreduraLsbImagem {
  const porInterpretacao = Math.min(MAX_BYTES, w * h * 3);
  const corte = corteMinimo(porInterpretacao * COMBINACOES.length);

  /**
   * A ordenação é pelo maior TRECHO, não pela maior corrida — e a diferença
   * decidiu um caso real. `maiorCorrida` não passa pelo filtro de variedade, e
   * o canal alfa opaco produz uma corrida enorme de `UUUU…`: ela vencia a
   * mensagem de verdade e aparecia em primeiro lugar. Quem ordena o resultado
   * tem de ordenar pelo mesmo critério que decidiu o que é resultado.
   */
  const maiorTrecho = (r: ResultadoLsbImagem) =>
    r.trechos.reduce((m, t) => Math.max(m, t.length), 0);

  const achados = COMBINACOES.map((o) => extrairLsbImagem(px, w, h, o, corte))
    .filter((r) => r.trechos.length > 0)
    .sort((a, b) => maiorTrecho(b) - maiorTrecho(a));

  return { achados, testadas: COMBINACOES.length, corte };
}
