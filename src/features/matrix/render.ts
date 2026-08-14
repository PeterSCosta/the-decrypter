/**
 * Saída visual da aba Matriz: a matriz booleana virando pixels.
 *
 * Duas saídas, uma fonte só de verdade. `toRgba` monta o buffer RGBA cru (puro,
 * sem DOM — dá para testar e é exatamente o que o leitor de QR recebe) e
 * `toPng` só o despeja num canvas. Ter UM lugar que decide qual pixel é escuro
 * garante que o PNG que a pessoa baixa é byte a byte o que o decodificador viu:
 * se o leitor falhou, não foi porque a imagem baixada é outra.
 *
 * Sobre cores em hexadecimal aqui, contra a regra da casa: isto não é UI, é
 * codificação. Um QR é lido por limiar de luminância — precisa de preto e
 * branco chapados, não de `--surface-*` (que muda com o tema e mataria a
 * leitura no escuro). Os tokens semânticos valem para a grade na tela; o
 * bitmap exportado é outro bicho.
 */

/**
 * A matriz pintada: `true` = módulo escuro. Linhas de tamanhos diferentes são
 * toleradas (o que falta conta como apagado) — colagem torta é o normal em
 * prova, e recusar a grade inteira por causa de uma linha curta seria pior.
 */
export type Bitmap = readonly (readonly boolean[])[];

/** Pixels por módulo no padrão. 8 é o mínimo confortável para leitor de celular. */
export const MODULO_PADRAO = 8;

/**
 * Margem (quiet zone) padrão, EM MÓDULOS. Quatro é o que a norma do QR exige, e
 * é a pegadinha mais cara da aba: o PNG exportado sem essa borda branca não é
 * lido por câmera de celular nenhuma, e a pessoa conclui que errou a regra da
 * prova quando só faltou a margem. Por isso o padrão já vem certo — e não é
 * zero por acidente nunca. (Medido: o leitor interno, que recebe a imagem
 * limpa, lê mesmo sem margem; o de fora, não. Ver `avisoDeMargem` em `qr.ts`.)
 */
export const MARGEM_PADRAO = 4;

/**
 * Teto do lado da imagem, em pixels. Uma matriz 177×177 (QR versão 40) com
 * escala 4 daria ~6 mil pixels de lado, ou seja ~140 MB de buffer RGBA — trava
 * a aba. Passando disso, o tamanho do módulo cede; a imagem sai menor, não
 * quebrada.
 */
export const LADO_MAXIMO = 4096;

export interface OpcoesRender {
  /** Pixels por módulo antes da escala. Padrão `MODULO_PADRAO`. */
  modulo?: number;
  /** Quiet zone em MÓDULOS (não em pixels). Padrão `MARGEM_PADRAO`. */
  margem?: number;
  /** Multiplicador final sobre o módulo. Padrão 1. */
  escala?: number;
  /**
   * Troca aceso por apagado — mas SÓ dentro da matriz. A quiet zone nunca
   * inverte: ela é justamente o que faz o leitor achar o código, e uma borda
   * escura some com ele. Quem quer a arte toda invertida troca as duas cores.
   */
  inverter?: boolean;
  /** Cor do módulo aceso, `#rgb` ou `#rrggbb`. Padrão preto. */
  corEscura?: string;
  /** Cor do fundo e dos módulos apagados. Padrão branco. */
  corClara?: string;
  /** Fundo transparente (o claro vira alfa 0). Não use para ler QR. */
  fundoTransparente?: boolean;
}

interface OpcoesResolvidas {
  modulo: number;
  margem: number;
  escala: number;
  inverter: boolean;
  escura: RGB;
  clara: RGB;
  fundoTransparente: boolean;
}

type RGB = [number, number, number];

const PRETO: RGB = [0, 0, 0];
const BRANCO: RGB = [255, 255, 255];

/**
 * `#rgb` ou `#rrggbb` → componentes. Devolve `null` no que não reconhece para
 * o chamador cair no padrão em vez de desenhar um retângulo preto misterioso.
 */
export function lerHex(hex: string): RGB | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const s = m[1];
  const cheio =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  return [
    Number.parseInt(cheio.slice(0, 2), 16),
    Number.parseInt(cheio.slice(2, 4), 16),
    Number.parseInt(cheio.slice(4, 6), 16),
  ];
}

function resolver(opts: OpcoesRender = {}): OpcoesResolvidas {
  return {
    modulo: Number.isFinite(opts.modulo) ? Math.max(1, opts.modulo as number) : MODULO_PADRAO,
    margem: Number.isFinite(opts.margem)
      ? Math.max(0, Math.round(opts.margem as number))
      : MARGEM_PADRAO,
    escala: Number.isFinite(opts.escala) ? Math.max(0.05, opts.escala as number) : 1,
    inverter: opts.inverter === true,
    escura: (opts.corEscura && lerHex(opts.corEscura)) || PRETO,
    clara: (opts.corClara && lerHex(opts.corClara)) || BRANCO,
    fundoTransparente: opts.fundoTransparente === true,
  };
}

export interface Dimensoes {
  linhas: number;
  colunas: number;
  /** `true` quando as linhas não têm todas o mesmo comprimento. */
  irregular: boolean;
}

/** Dimensões da matriz. `colunas` é a linha MAIS LONGA — o que falta é apagado. */
export function dimensoes(bitmap: Bitmap): Dimensoes {
  const linhas = bitmap.length;
  let colunas = 0;
  let irregular = false;
  for (const l of bitmap) {
    if (colunas !== 0 && l.length !== colunas) irregular = true;
    colunas = Math.max(colunas, l.length);
  }
  return { linhas, colunas, irregular };
}

/** Célula com fronteira segura: fora da matriz (ou linha curta) é apagado. */
export function celula(bitmap: Bitmap, linha: number, coluna: number): boolean {
  return bitmap[linha]?.[coluna] === true;
}

export interface Tamanho {
  /** Pixels por módulo já com escala e teto aplicados — sempre inteiro. */
  px: number;
  /** Quiet zone em pixels (margem em módulos × `px`). */
  margemPx: number;
  largura: number;
  altura: number;
  linhas: number;
  colunas: number;
  /** `true` quando o teto de `LADO_MAXIMO` reduziu o módulo pedido. */
  reduzido: boolean;
}

/**
 * Quanta imagem a matriz vira. O `px` é arredondado para inteiro de propósito:
 * módulo fracionário deixa a borda de cada quadrado interpolada em cinza, e
 * cinza é exatamente o que faz o binarizador do leitor errar o módulo.
 */
export function calcularTamanho(bitmap: Bitmap, opts: OpcoesRender = {}): Tamanho {
  const o = resolver(opts);
  const { linhas, colunas } = dimensoes(bitmap);
  const pedido = Math.max(1, Math.round(o.modulo * o.escala));
  const maiorLado = Math.max(colunas, linhas) + 2 * o.margem;
  const teto = maiorLado > 0 ? Math.max(1, Math.floor(LADO_MAXIMO / maiorLado)) : pedido;
  const px = Math.min(pedido, teto);
  const margemPx = o.margem * px;
  return {
    px,
    margemPx,
    largura: colunas === 0 ? 0 : colunas * px + 2 * margemPx,
    altura: linhas === 0 ? 0 : linhas * px + 2 * margemPx,
    linhas,
    colunas,
    reduzido: px < pedido,
  };
}

export interface Rgba {
  /**
   * O `<ArrayBuffer>` explícito não é decoração: `new Uint8ClampedArray(n)` sai
   * tipado sobre `ArrayBufferLike`, e o construtor de `ImageData` recusa isso
   * (podia ser `SharedArrayBuffer`). Construir sobre um `ArrayBuffer` nomeado
   * resolve sem `as`.
   */
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
  tamanho: Tamanho;
}

/**
 * Matriz → buffer RGBA. Puro: nenhuma dependência de DOM, roda em teste e é o
 * formato que o `jsQR` come direto (`Uint8ClampedArray` + largura + altura),
 * o que dispensa canvas no caminho da leitura.
 *
 * Devolve buffer vazio para matriz vazia, em vez de lançar — a aba tem grade
 * zerada o tempo todo enquanto a pessoa monta as regras.
 */
export function toRgba(bitmap: Bitmap, opts: OpcoesRender = {}): Rgba {
  const o = resolver(opts);
  const tamanho = calcularTamanho(bitmap, opts);
  const { largura, altura, px, margemPx, linhas, colunas } = tamanho;
  const data = new Uint8ClampedArray(new ArrayBuffer(Math.max(0, largura * altura * 4)));
  if (largura === 0 || altura === 0) return { data, width: largura, height: altura, tamanho };

  const alfaClara = o.fundoTransparente ? 0 : 255;
  let i = 0;
  for (let y = 0; y < altura; y++) {
    const r = Math.floor((y - margemPx) / px);
    const dentroY = r >= 0 && r < linhas;
    for (let x = 0; x < largura; x++) {
      const c = Math.floor((x - margemPx) / px);
      // Fora da matriz é quiet zone, e quiet zone não inverte nunca.
      const naMatriz = dentroY && c >= 0 && c < colunas;
      const aceso = naMatriz && (o.inverter ? !celula(bitmap, r, c) : celula(bitmap, r, c));
      const cor = aceso ? o.escura : o.clara;
      data[i] = cor[0];
      data[i + 1] = cor[1];
      data[i + 2] = cor[2];
      data[i + 3] = aceso ? 255 : alfaClara;
      i += 4;
    }
  }
  return { data, width: largura, height: altura, tamanho };
}

/**
 * Matriz → data URL de PNG, para baixar e apontar o celular (o caminho que
 * funciona sempre, mesmo quando a leitura interna falha).
 *
 * Devolve `null` — nunca lança — quando não há canvas de verdade (jsdom,
 * navegador com anti-fingerprint, render fora do browser) ou quando a matriz
 * está vazia. Quem chama mostra "não deu para gerar a imagem"; ninguém quebra.
 */
export function toPng(bitmap: Bitmap, opts: OpcoesRender = {}): string | null {
  if (typeof document === "undefined" || typeof ImageData === "undefined") return null;
  const rgba = toRgba(bitmap, opts);
  if (rgba.width === 0 || rgba.height === 0) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = rgba.width;
    canvas.height = rgba.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(new ImageData(rgba.data, rgba.width, rgba.height), 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    // Canvas bloqueado ou "tainted": vira "sem imagem", não exceção na tela.
    return null;
  }
}

/**
 * Dispara o download do PNG. Devolve `false` se não deu para gerar — assim a
 * UI avisa em vez de fingir que baixou.
 */
export function baixarPng(
  bitmap: Bitmap,
  nomeArquivo = "matriz.png",
  opts: OpcoesRender = {},
): boolean {
  const url = toPng(bitmap, opts);
  if (!url || typeof document === "undefined") return false;
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo.endsWith(".png") ? nomeArquivo : `${nomeArquivo}.png`;
  a.click();
  return true;
}
