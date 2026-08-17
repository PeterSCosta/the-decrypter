/**
 * Planos de bit e canais — o que o Stegsolve faz, e a ferramenta mais barata
 * de esteganografia em imagem que existe.
 *
 * O princípio: uma imagem de 8 bits por canal é, na prática, OITO imagens de
 * 1 bit empilhadas. Os planos altos carregam a figura; os baixos carregam
 * ruído de sensor — e é exatamente por isso que quem esconde escreve neles.
 * Isolado, um plano baixo com mensagem aparece como texto ou desenho nítido
 * contra o chuvisco dos demais.
 *
 * Nada aqui depende de servidor: entra `ImageData`, sai `ImageData`.
 */

export type Canal = "vermelho" | "verde" | "azul" | "alfa" | "cinza";

const INDICE: Record<Exclude<Canal, "cinza">, number> = {
  vermelho: 0,
  verde: 1,
  azul: 2,
  alfa: 3,
};

/**
 * Isola um plano de bit de um canal, em preto e branco.
 *
 * `bit` 0 é o menos significativo — o esconderijo clássico — e 7 o mais.
 */
export function planoDeBit(
  origem: Uint8ClampedArray,
  canal: Exclude<Canal, "cinza">,
  bit: number,
): Uint8ClampedArray {
  const saida = new Uint8ClampedArray(origem.length);
  const c = INDICE[canal];
  for (let i = 0; i < origem.length; i += 4) {
    const ligado = ((origem[i + c] >> bit) & 1) === 1 ? 255 : 0;
    saida[i] = ligado;
    saida[i + 1] = ligado;
    saida[i + 2] = ligado;
    saida[i + 3] = 255;
  }
  return saida;
}

/** Um canal sozinho, em tons de cinza. */
export function apenasCanal(origem: Uint8ClampedArray, canal: Canal): Uint8ClampedArray {
  const saida = new Uint8ClampedArray(origem.length);
  for (let i = 0; i < origem.length; i += 4) {
    const v =
      canal === "cinza"
        ? Math.round(0.299 * origem[i] + 0.587 * origem[i + 1] + 0.114 * origem[i + 2])
        : origem[i + INDICE[canal]];
    saida[i] = v;
    saida[i + 1] = v;
    saida[i + 2] = v;
    saida[i + 3] = 255;
  }
  return saida;
}

/**
 * O canal alfa, revelado.
 *
 * Um pixel totalmente transparente ainda carrega RGB — o navegador só não o
 * desenha. Pintar a figura toda com alfa 0 numa região é esconder à vista de
 * todos, e o único jeito de ver é forçar a opacidade.
 */
export function alfaOpaco(origem: Uint8ClampedArray): {
  imagem: Uint8ClampedArray;
  pixelsInvisiveis: number;
  comCorEscondida: number;
} {
  const saida = new Uint8ClampedArray(origem.length);
  let invisiveis = 0;
  let comCor = 0;
  for (let i = 0; i < origem.length; i += 4) {
    saida[i] = origem[i];
    saida[i + 1] = origem[i + 1];
    saida[i + 2] = origem[i + 2];
    saida[i + 3] = 255;
    if (origem[i + 3] === 0) {
      invisiveis++;
      // Transparente E colorido: o pixel guarda informação que ninguém vê.
      if (origem[i] || origem[i + 1] || origem[i + 2]) comCor++;
    }
  }
  return { imagem: saida, pixelsInvisiveis: invisiveis, comCorEscondida: comCor };
}

export interface LeituraDePlanos {
  /** Fração de pixels em que o bit 0 do canal está ligado. */
  proporcao: Record<Exclude<Canal, "cinza">, number>;
  /**
   * Quão "estruturado" é o plano menos significativo, de 0 a 1.
   *
   * Ruído de sensor não tem estrutura: vizinhos são independentes, e a fração
   * de pixels iguais ao vizinho da direita fica perto de 0,5. Texto, desenho e
   * áreas chapadas produzem valores muito acima disso — e é o indício mais
   * barato de que alguém escreveu ali.
   */
  continuidade: Record<Exclude<Canal, "cinza">, number>;
  leitura: string;
}

export function medirPlanos(origem: Uint8ClampedArray, largura: number): LeituraDePlanos {
  const canais: Exclude<Canal, "cinza">[] = ["vermelho", "verde", "azul"];
  const proporcao = {} as Record<Exclude<Canal, "cinza">, number>;
  const continuidade = {} as Record<Exclude<Canal, "cinza">, number>;
  const total = origem.length / 4;

  for (const canal of canais) {
    const c = INDICE[canal];
    let uns = 0;
    let iguais = 0;
    let pares = 0;
    for (let i = 0; i < origem.length; i += 4) {
      const bit = origem[i + c] & 1;
      uns += bit;
      const px = i / 4;
      // Só compara dentro da mesma linha; cruzar a borda inventaria vizinhança.
      if ((px + 1) % largura !== 0 && i + 4 < origem.length) {
        pares++;
        if ((origem[i + 4 + c] & 1) === bit) iguais++;
      }
    }
    proporcao[canal] = total ? uns / total : 0;
    continuidade[canal] = pares ? iguais / pares : 0;
  }

  const maiorCont = Math.max(...canais.map((c) => continuidade[c]));
  let leitura: string;
  if (maiorCont > 0.75) {
    leitura =
      "O plano menos significativo tem MUITA estrutura: vizinhos concordam bem acima do acaso. Isso acontece com imagem sem perdas de área chapada — e também com desenho ou texto escrito ali. Olhe os planos.";
  } else if (maiorCont < 0.55) {
    leitura =
      "O plano menos significativo parece ruído (vizinhos concordam perto de 50%), que é o esperado de foto natural — e também de dado cifrado embutido. Ausência de estrutura não é ausência de mensagem.";
  } else {
    leitura = "O plano menos significativo tem estrutura moderada, sem nada que salte aos olhos.";
  }

  return { proporcao, continuidade, leitura };
}
