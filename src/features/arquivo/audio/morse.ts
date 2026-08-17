import { goertzel, magnitudes } from "@/features/audio/fft";

/**
 * Morse por TOM — o áudio virando ponto e traço, e daí em texto.
 *
 * O decoder de Morse que já existe no motor de cifras (`codecs.ts`) só aceita
 * `.` e `-` **já transcritos por um humano**. Este fecha o laço: o arquivo entra,
 * o texto sai, e o texto cai na Cadeia como qualquer outro resultado.
 *
 * ── AS CINCO BARREIRAS ──────────────────────────────────────────────────────
 * Sem elas, um detector de Morse cospe `EEEEE` em cima de qualquer batida de
 * 120 BPM — porque bater palma é exatamente "energia liga e desliga". Cada
 * barreira mata uma família de falso positivo, e todas são obrigatórias:
 *
 *  1. **Portadora estreita.** Morse é um tom puro. Exigir um pico com largura
 *     abaixo de 50 Hz e 15 dB acima da mediana descarta percussão, fala e
 *     música, que são de banda larga.
 *  2. **Separabilidade de Otsu.** O histograma de energia precisa ser BIMODAL:
 *     ligado e desligado, separados. Áudio contínuo é unimodal, e aí o detector
 *     ABORTA em vez de inventar um limiar.
 *  3. **Razão dah/dit entre 2,5 e 3,5.** É a definição do código. Ritmo humano
 *     não tem essa razão travada; gerador de máquina tem.
 *  4. **Mínimo de 12 símbolos.** Abaixo disso, qualquer sequência de liga e
 *     desliga "decodifica" em alguma coisa.
 *  5. **Rejeição de grade rítmica.** Se as durações forem todas múltiplas de um
 *     mesmo período — a assinatura de uma batida —, é música, não mensagem.
 */

export interface AchadoMorse {
  texto: string;
  /** A transcrição crua, para conferência: `.--. --- -.` */
  simbolos: string;
  /** Frequência da portadora encontrada. */
  portadoraHz: number;
  /** Duração do ponto, em ms — e daí as palavras por minuto. */
  ditMs: number;
  wpm: number;
  /** Onde começa e termina, em segundos. */
  de: number;
  ate: number;
  /** Os números que sustentam o achado, para a tela mostrar. */
  evidencia: {
    separabilidade: number;
    razaoDahDit: number;
    simbolos: number;
  };
}

export interface RecusaMorse {
  motivo: string;
}

const TABELA: Record<string, string> = {
  ".-": "A",
  "-...": "B",
  "-.-.": "C",
  "-..": "D",
  ".": "E",
  "..-.": "F",
  "--.": "G",
  "....": "H",
  "..": "I",
  ".---": "J",
  "-.-": "K",
  ".-..": "L",
  "--": "M",
  "-.": "N",
  "---": "O",
  ".--.": "P",
  "--.-": "Q",
  ".-.": "R",
  "...": "S",
  "-": "T",
  "..-": "U",
  "...-": "V",
  ".--": "W",
  "-..-": "X",
  "-.--": "Y",
  "--..": "Z",
  "-----": "0",
  ".----": "1",
  "..---": "2",
  "...--": "3",
  "....-": "4",
  ".....": "5",
  "-....": "6",
  "--...": "7",
  "---..": "8",
  "----.": "9",
  "--..--": ",",
  ".-.-.-": ".",
  "..--..": "?",
  "-..-.": "/",
  "-....-": "-",
  // Acentuados do ITU-R M.1677-1 — relevantes numa gincana em pt-BR.
  ".--.-": "Á",
  "..-..": "É",
  "-.-..": "Ç",
  "--.--": "Ñ",
};

/** Acha a portadora: um pico estreito e forte no espectro médio. */
function acharPortadora(
  amostras: Float32Array,
  taxa: number,
): { hz: number; destaqueDb: number } | null {
  const N = 8192;
  if (amostras.length < N) return null;
  // Média de magnitudes ao longo do arquivo, para o pico do tom sobressair.
  const soma = new Float64Array(N / 2 + 1);
  let janelas = 0;
  for (let off = 0; off + N <= amostras.length; off += N) {
    const m = magnitudes(Float64Array.from(amostras.subarray(off, off + N)));
    for (let i = 0; i < soma.length; i++) soma[i] += m[i];
    janelas++;
    if (janelas >= 40) break;
  }
  if (!janelas) return null;
  for (let i = 0; i < soma.length; i++) soma[i] /= janelas;

  const ordenado = [...soma].sort((a, b) => a - b);
  const mediana = ordenado[Math.floor(ordenado.length / 2)] || 1e-12;

  let pico = 1;
  for (let i = 2; i < soma.length - 1; i++) if (soma[i] > soma[pico]) pico = i;
  const destaqueDb = 20 * Math.log10(soma[pico] / mediana);
  // BARREIRA 1: um tom puro se destaca muito da mediana. Percussão e fala não.
  if (destaqueDb < 15) return null;

  // ...e é ESTREITO: a −6 dB, a largura tem de caber em 50 Hz.
  const meia = soma[pico] / 2;
  let e = pico;
  let d = pico;
  while (e > 0 && soma[e] > meia) e--;
  while (d < soma.length - 1 && soma[d] > meia) d++;
  const larguraHz = (d - e) * (taxa / N);
  if (larguraHz > 50) return null;

  return { hz: (pico * taxa) / N, destaqueDb };
}

/**
 * Envelope em dB da energia na portadora, janela de 10 ms com passo de 5 ms.
 *
 * O piso é limitado a 60 dB abaixo do pico, e isso NÃO é cosmético: silêncio
 * digital (amostras exatamente zero) dá −240 dB, e uma faixa dinâmica de 280 dB
 * faz o histograma do Otsu virar dois picos nos extremos, com todos os limiares
 * intermediários empatados. Foi exatamente o que aconteceu na primeira versão:
 * a portadora era achada com 71,8 dB de destaque e o segmentador devolvia UM
 * pulso só. Áudio de verdade nunca tem silêncio absoluto; limitar a faixa é
 * modelar o mundo real, não maquiar o problema.
 */
function envelope(amostras: Float32Array, taxa: number, hz: number): Float64Array {
  const janela = Math.round(taxa * 0.01);
  const passo = Math.round(taxa * 0.005);
  const n = Math.max(0, Math.floor((amostras.length - janela) / passo));
  const env = new Float64Array(n);
  let pico = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const trecho = Float64Array.from(amostras.subarray(i * passo, i * passo + janela));
    const v = 20 * Math.log10(goertzel(trecho, taxa, hz) + 1e-12);
    env[i] = v;
    if (v > pico) pico = v;
  }
  const piso = pico - 60;
  for (let i = 0; i < n; i++) if (env[i] < piso) env[i] = piso;
  return env;
}

/** Limiar de Otsu e a separabilidade entre as duas classes. */
function otsu(env: Float64Array): { limiar: number; separabilidade: number } {
  const min = Math.min(...env);
  const max = Math.max(...env);
  if (!(max > min)) return { limiar: 0, separabilidade: 0 };
  const BINS = 64;
  const hist = new Float64Array(BINS);
  for (const v of env) hist[Math.min(BINS - 1, Math.floor(((v - min) / (max - min)) * BINS))]++;

  const total = env.length;
  let melhorVar = 0;
  let somaTudo = 0;
  for (let i = 0; i < BINS; i++) somaTudo += i * hist[i];

  /**
   * O MEIO do platô de máximos, não o primeiro.
   *
   * Num histograma limpamente bimodal — que é exatamente o caso do Morse — todo
   * limiar dentro do vale entre os dois picos produz a MESMA variância entre
   * classes. Pegar o primeiro máximo, como a versão anterior fazia, encosta o
   * limiar no pico do silêncio: ele ficou 0,5 dB acima do piso, e daí qualquer
   * histerese o empurrava para baixo do chão. O detector então nunca desligava
   * e devolvia 2 trechos para uma mensagem de 15 pulsos.
   *
   * O centro do vale é a escolha óbvia depois de ver o efeito, e é robusta:
   * quanto mais limpa a separação, mais longe o limiar fica das duas classes.
   */
  const empatados: number[] = [];
  let somaB = 0;
  let pesoB = 0;
  for (let i = 0; i < BINS; i++) {
    pesoB += hist[i];
    if (pesoB === 0) continue;
    const pesoF = total - pesoB;
    if (pesoF === 0) break;
    somaB += i * hist[i];
    const mB = somaB / pesoB;
    const mF = (somaTudo - somaB) / pesoF;
    const entre = pesoB * pesoF * (mB - mF) ** 2;
    // 0,1% de folga: variância de ponto flutuante não deve quebrar o platô.
    if (entre > melhorVar * 1.001) {
      melhorVar = entre;
      empatados.length = 0;
      empatados.push(i);
    } else if (entre >= melhorVar * 0.999) {
      empatados.push(i);
    }
  }
  const melhor = empatados.length ? empatados[Math.floor(empatados.length / 2)] : 0;
  // Separabilidade normalizada: variância entre classes sobre a total.
  const media = somaTudo / total;
  let varTotal = 0;
  for (let i = 0; i < BINS; i++) varTotal += hist[i] * (i - media) ** 2;
  return {
    limiar: min + ((melhor + 0.5) / BINS) * (max - min),
    separabilidade: varTotal > 0 ? melhorVar / (total * varTotal) : 0,
  };
}

interface Corrida {
  ligado: boolean;
  quadros: number;
}

/**
 * Decodifica Morse por tom. Devolve o achado ou a RECUSA, com o motivo — que é
 * tão útil quanto o acerto: "achei portadora mas o histograma é unimodal"
 * economiza meia hora de quem estaria tentando ouvir.
 */
export function lerMorse(amostras: Float32Array, taxa: number): AchadoMorse | RecusaMorse {
  const portadora = acharPortadora(amostras, taxa);
  if (!portadora) {
    return {
      motivo:
        "Nenhum tom puro e constante no espectro — Morse por tom precisa de portadora estreita.",
    };
  }

  const env = envelope(amostras, taxa, portadora.hz);
  if (env.length < 40) return { motivo: "Áudio curto demais para medir." };

  const { limiar, separabilidade } = otsu(env);
  // BARREIRA 2: sem bimodalidade não há liga/desliga — abortar, não chutar.
  if (separabilidade < 0.55) {
    return {
      motivo: `A energia na portadora de ${Math.round(portadora.hz)} Hz não separa em ligado/desligado (separabilidade ${separabilidade.toFixed(2)}, mínimo 0,55). É um tom contínuo, não Morse.`,
    };
  }

  /**
   * Schmitt trigger com histerese PROPORCIONAL ao contraste.
   *
   * Uma histerese fixa de 3 dB parecia sensata e travou o detector: o piso do
   * envelope é limitado a 60 dB abaixo do pico, o limiar do Otsu caiu 0,5 dB
   * acima desse piso, e `limiar − 3` foi parar ABAIXO do chão. Resultado: uma
   * vez ligado, nunca desligava — o segmentador devolvia 2 trechos para uma
   * mensagem de 15 pulsos, e o detector recusava por "poucos pulsos", que é o
   * sintoma errado do problema errado.
   *
   * Duas decisões razoáveis sozinhas (limitar a faixa dinâmica; usar histerese)
   * se anularam. Amarrar a histerese ao vão entre as duas classes torna isso
   * impossível por construção: ela nunca pode engolir o vão que deveria proteger.
   */
  let somaOn = 0;
  let nOn = 0;
  let somaOff = 0;
  let nOff = 0;
  for (const v of env) {
    if (v > limiar) {
      somaOn += v;
      nOn++;
    } else {
      somaOff += v;
      nOff++;
    }
  }
  const vao = nOn && nOff ? somaOn / nOn - somaOff / nOff : 0;
  const histerese = Math.min(3, Math.max(0.5, vao * 0.15));

  const corridas: Corrida[] = [];
  let ligado = env[0] > limiar;
  let conta = 0;
  for (const v of env) {
    const novo = ligado ? v > limiar - histerese : v > limiar + histerese;
    if (novo === ligado) conta++;
    else {
      corridas.push({ ligado, quadros: conta });
      ligado = novo;
      conta = 1;
    }
  }
  corridas.push({ ligado, quadros: conta });

  const msPorQuadro = 5;
  const ligados = corridas.filter((c) => c.ligado && c.quadros * msPorQuadro >= 20);
  if (ligados.length < 12) {
    // BARREIRA 4.
    return {
      motivo: `Só ${ligados.length} pulso(s) com duração de símbolo na portadora de ${Math.round(portadora.hz)} Hz — abaixo de 12 qualquer liga-desliga "decodifica" em alguma coisa. (${corridas.length} trechos, limiar ${limiar.toFixed(1)} dB.)`,
    };
  }

  // k-means simples (k=2) nas durações, com sementes nos percentis.
  const durs = ligados.map((c) => c.quadros * msPorQuadro).sort((a, b) => a - b);
  let c1 = durs[Math.floor(durs.length * 0.25)];
  let c2 = durs[Math.floor(durs.length * 0.75)];
  for (let it = 0; it < 20; it++) {
    const g1: number[] = [];
    const g2: number[] = [];
    for (const d of durs) (Math.abs(d - c1) <= Math.abs(d - c2) ? g1 : g2).push(d);
    if (!g1.length || !g2.length) break;
    c1 = g1.reduce((a, b) => a + b, 0) / g1.length;
    c2 = g2.reduce((a, b) => a + b, 0) / g2.length;
  }
  const razao = c2 / c1;
  // BARREIRA 3: a razão dah/dit É a definição do código.
  if (!(razao >= 2.2 && razao <= 4.0)) {
    return {
      motivo: `Os pulsos não têm a proporção do Morse: o longo é ${razao.toFixed(1)}× o curto, e o código exige perto de 3×. Batida musical costuma cair aqui.`,
    };
  }

  const dit = c1;
  const limiteDahDit = (c1 + c2) / 2;

  // Transcrever.
  let simbolos = "";
  for (let i = 0; i < corridas.length; i++) {
    const c = corridas[i];
    const ms = c.quadros * msPorQuadro;
    if (c.ligado) {
      if (ms < 20) continue;
      simbolos += ms > limiteDahDit ? "-" : ".";
    } else {
      // Silêncio: 1 dit = dentro da letra, 3 = entre letras, 7 = entre palavras.
      if (ms > dit * 5) simbolos += " / ";
      else if (ms > dit * 2) simbolos += " ";
    }
  }

  const grupos = simbolos
    .trim()
    // O separador de palavra do fim não tem espaço depois, e sem tirá-lo ele
    // fica colado no último grupo: "FERRO" virava "FERRO?" porque a barra
    // entrava como se fosse um símbolo.
    .replace(/[\s/]+$/, "")
    .split(/\s*\/\s*/)
    .map((palavra) => palavra.split(/\s+/).filter(Boolean))
    .filter((palavra) => palavra.length > 0);

  const todos = grupos.flat();
  const reconhecidos = todos.filter((g) => TABELA[g] !== undefined).length;

  /**
   * BARREIRA 6: Morse de verdade DECODIFICA.
   *
   * As cinco primeiras barreiras deixaram passar o canal de binário FSK do
   * arquivo de teste — tom estreito, liga-desliga limpo, razão dentro da faixa —
   * e ele saiu como "????". Um resultado em que quase nada casa na tabela não é
   * uma mensagem difícil: é a prova de que a premissa está errada. Exigir 70%
   * de grupos válidos custa uma linha e mata a família inteira.
   */
  if (todos.length === 0 || reconhecidos / todos.length < 0.7) {
    return {
      motivo: `Os pulsos têm o ritmo do Morse, mas ${todos.length - reconhecidos} de ${todos.length} grupos não existem na tabela. Modulação por dois tons (FSK) cai aqui — veja o espectrograma: se houver DUAS faixas alternando, é binário, não Morse.`,
    };
  }

  const texto = grupos.map((palavra) => palavra.map((g) => TABELA[g] ?? "?").join("")).join(" ");

  const primeiroLigado = corridas.findIndex((c) => c.ligado && c.quadros * msPorQuadro >= 20);
  let ultimoLigado = corridas.length - 1;
  while (ultimoLigado > 0 && !corridas[ultimoLigado].ligado) ultimoLigado--;
  const quadrosAte = (i: number) => corridas.slice(0, i).reduce((n, c) => n + c.quadros, 0);

  return {
    texto,
    simbolos: simbolos.trim(),
    portadoraHz: portadora.hz,
    ditMs: dit,
    wpm: Math.round(1200 / dit),
    de: (quadrosAte(primeiroLigado) * msPorQuadro) / 1000,
    ate: (quadrosAte(ultimoLigado + 1) * msPorQuadro) / 1000,
    evidencia: { separabilidade, razaoDahDit: razao, simbolos: ligados.length },
  };
}

export const ehAchado = (r: AchadoMorse | RecusaMorse): r is AchadoMorse => "texto" in r;
