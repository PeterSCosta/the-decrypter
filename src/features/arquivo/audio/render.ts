import type { Espectrograma } from "@/features/audio/stft";

/**
 * A matriz tempo × frequência virando imagem.
 *
 * O espectrograma é a ferramenta que revela o truque mais visual de todos —
 * escrever a resposta desenhando no espectro (Coagula, Photosounder,
 * Spectrology). É inaudível por construção: nenhum detector de som acha, só o
 * olho. Por isso o que importa aqui não é ser bonito, é ser **legível**.
 *
 * Duas decisões que vêm daí:
 *
 * 1. **Eixo de frequência LINEAR por padrão.** A escala logarítmica é melhor
 *    para ouvir música e péssima para ler desenho: ela espreme as frequências
 *    altas, que é justamente onde as ferramentas de "imagem para som" escrevem.
 * 2. **Faixa dinâmica ajustável.** Uma mensagem gravada a −70 dBFS some por
 *    completo numa janela de 60 dB; o que a revela é abrir para 100 e deixar o
 *    fundo cinza em vez de preto.
 */

export interface OpcoesDeRender {
  /** dB que viram preto. Abaixo disso, tudo é fundo. */
  pisoDb: number;
  /** dB que viram branco/lima. */
  tetoDb: number;
  /** Recorte de frequência, em Hz. */
  faixaHz: [number, number];
  /** `lima` combina com a identidade; `cinza` é o mais neutro para ler texto. */
  rampa: "lima" | "cinza" | "calor";
}

export const RENDER_PADRAO: OpcoesDeRender = {
  pisoDb: -90,
  tetoDb: -10,
  faixaHz: [0, 22050],
  rampa: "lima",
};

/** 0..1 → RGB. */
function cor(v: number, rampa: OpcoesDeRender["rampa"]): [number, number, number] {
  const t = v < 0 ? 0 : v > 1 ? 1 : v;
  if (rampa === "cinza") {
    const g = Math.round(t * 255);
    return [g, g, g];
  }
  if (rampa === "calor") {
    // preto → vermelho → amarelo → branco
    const r = Math.round(Math.min(1, t * 3) * 255);
    const g = Math.round(Math.min(1, Math.max(0, t * 3 - 1)) * 255);
    const b = Math.round(Math.min(1, Math.max(0, t * 3 - 2)) * 255);
    return [r, g, b];
  }
  // Lima da identidade (#C6F135) sobre tinta, com meio-tom esverdeado.
  return [Math.round(t * 198), Math.round(t * 241), Math.round(t * 53)];
}

/**
 * Pinta o espectrograma num buffer RGBA.
 *
 * `largura` e `altura` são as do canvas; a matriz é reamostrada por vizinho
 * mais próximo, que é o certo aqui: interpolar borraria justamente a borda reta
 * que denuncia um desenho artificial.
 *
 * O eixo Y é invertido de propósito — grave embaixo, agudo em cima, como todo
 * mundo desenha e como todo espectrograma do mundo mostra.
 */
export function pintar(
  esp: Espectrograma,
  largura: number,
  altura: number,
  opcoes: OpcoesDeRender = RENDER_PADRAO,
): Uint8ClampedArray {
  const saida = new Uint8ClampedArray(largura * altura * 4);
  const nQuadros = esp.quadros.length;
  if (nQuadros === 0 || largura <= 0 || altura <= 0) return saida;

  const binDe = Math.max(0, Math.floor(opcoes.faixaHz[0] / esp.resolucaoHz));
  const binAte = Math.min(esp.bins - 1, Math.ceil(opcoes.faixaHz[1] / esp.resolucaoHz));
  const nBins = Math.max(1, binAte - binDe);
  const amplitude = Math.max(1e-6, opcoes.tetoDb - opcoes.pisoDb);

  for (let x = 0; x < largura; x++) {
    const q = esp.quadros[Math.min(nQuadros - 1, Math.floor((x / largura) * nQuadros))];
    for (let y = 0; y < altura; y++) {
      // Y invertido: a linha 0 do canvas é o topo, e o topo é a frequência alta.
      const bin = binDe + Math.min(nBins, Math.floor(((altura - 1 - y) / altura) * nBins));
      const db = q[bin] ?? opcoes.pisoDb;
      const [r, g, b] = cor((db - opcoes.pisoDb) / amplitude, opcoes.rampa);
      const i = (y * largura + x) * 4;
      saida[i] = r;
      saida[i + 1] = g;
      saida[i + 2] = b;
      saida[i + 3] = 255;
    }
  }
  return saida;
}

/**
 * Procura estrutura NÃO-NATURAL no espectro.
 *
 * Som natural é contínuo e irregular; desenho é reto. O sinal mais barato de
 * "isto foi desenhado" é a **borda vertical**: uma coluna inteira que liga ou
 * desliga de uma vez, em muitas frequências ao mesmo tempo.
 *
 * O falso positivo óbvio, e por isso tratado: **percussão faz exatamente isso**.
 * Uma batida de caixa é energia de banda larga começando junto. O que separa os
 * dois é a repetição regular — batida tem período, desenho não — e é por isso
 * que a leitura NUNCA afirma "há um desenho", só diz onde olhar.
 */
export function bordasVerticais(esp: Espectrograma): { quadro: number; forca: number }[] {
  const bordas: { quadro: number; forca: number }[] = [];
  if (esp.quadros.length < 3) return bordas;

  for (let t = 1; t < esp.quadros.length; t++) {
    const a = esp.quadros[t - 1];
    const b = esp.quadros[t];
    let mudou = 0;
    for (let f = 0; f < esp.bins; f++) {
      // 12 dB de salto num bin é mudança grande; contar em quantos bins isso
      // acontece ao mesmo tempo é o que caracteriza a borda.
      if (Math.abs(b[f] - a[f]) > 12) mudou++;
    }
    const forca = mudou / esp.bins;
    if (forca > 0.35) bordas.push({ quadro: t, forca });
  }
  return bordas;
}
