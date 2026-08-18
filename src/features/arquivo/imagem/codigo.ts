/**
 * Ler QR e código de barras de uma FOTO.
 *
 * ── POR QUE ISTO NÃO É O LEITOR DA ABA MATRIZ ───────────────────────────────
 * O `features/matrix/qr.ts` lê a matriz que a pessoa PINTOU: pixels chapados,
 * sem antisserrilhado, sem perspectiva, sem sombra — a imagem perfeita que uma
 * câmera nunca dá. Aqui a entrada é o oposto: o arquivo que veio da prova, com
 * JPEG borrado, papel torto e brilho de flash. São dois problemas diferentes e
 * é por isso que são dois caminhos.
 *
 * ── A ESCADA, E POR QUE NESTA ORDEM ─────────────────────────────────────────
 * 1. **`BarcodeDetector` nativo** — é o decodificador do sistema operacional, o
 *    mesmo que a câmera do celular usa. Aguenta foto torta, e de quebra lê EAN,
 *    UPC, Code128 e Data Matrix, que o `jsQR` nem tenta. Não existe em Safari
 *    nem em Firefox, então nunca é o único caminho.
 * 2. **`jsQR`** — só QR, e exigente com a foto, mas roda em qualquer navegador.
 *    Entra por `import()` dinâmico: quem nunca abre uma imagem não paga a lib.
 *
 * ── A ARMADILHA QUE O REPO JÁ PAGOU UMA VEZ ─────────────────────────────────
 * O `jsQR` devolve `null` sem motivo nenhum. O comentário de `matrix/qr.ts:13`
 * conta essa história, e a lição vale aqui: quando nada é lido, a tela precisa
 * dizer O QUE FALTOU (não achei nenhum código / achei mas não decodifiquei),
 * senão a equipe conclui "não tem QR" quando o que houve foi foto ruim.
 */

export type FormatoCodigo =
  | "qr_code"
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128"
  | "code_39"
  | "itf"
  | "data_matrix"
  | "pdf417"
  | "aztec"
  | "codabar";

export interface CodigoLido {
  /** O conteúdo. É isto que encadeia na bancada. */
  texto: string;
  formato: FormatoCodigo | string;
  /** Quem leu — a tela mostra, porque muda a confiança e explica a diferença
   *  entre um navegador e outro na mesma foto. */
  origem: "nativo" | "jsqr";
}

/** Rótulo pt-BR de cada formato; o cru (`ean_13`) não diz nada a ninguém. */
export const ROTULO_FORMATO: Record<string, string> = {
  qr_code: "QR Code",
  ean_13: "EAN-13 (código de barras de produto)",
  ean_8: "EAN-8",
  upc_a: "UPC-A",
  upc_e: "UPC-E",
  code_128: "Code 128",
  code_39: "Code 39",
  itf: "ITF (intercalado 2 de 5)",
  data_matrix: "Data Matrix",
  pdf417: "PDF417",
  aztec: "Aztec",
  codabar: "Codabar",
};

export const rotuloDoFormato = (f: string): string => ROTULO_FORMATO[f] ?? f;

/**
 * O motivo da falha, em português e ACIONÁVEL.
 *
 * Cada caso leva a uma ação diferente, e é por isso que não existe um "não
 * consegui" genérico: sem leitor, o caminho é trocar de navegador; sem código
 * na foto, é conferir se é mesmo um QR; com código ilegível, é tirar outra foto.
 */
export function motivoDaFalha(temNativo: boolean, jsqrCarregou: boolean): string {
  if (!temNativo && !jsqrCarregou) {
    return "Não consegui carregar nenhum leitor. Sem rede, o leitor de reserva não baixa — tente de novo com conexão.";
  }
  if (!temNativo) {
    return "Não achei código nenhum. Este navegador só tem o leitor de reserva, que lê apenas QR e é exigente com a foto: tente uma imagem mais nítida, ou abra no Chrome, que lê também código de barras.";
  }
  return "Não achei código nenhum na imagem. Se você VÊ um código aí, o problema é a foto (desfoque, brilho, ângulo ou recorte apertado demais) — não o arquivo.";
}

/** Só para a tela poder avisar antes de tentar. */
export const temLeitorNativo = (): boolean =>
  typeof globalThis !== "undefined" && "BarcodeDetector" in globalThis;

interface Injetaveis {
  /** Trocáveis no teste — em produção são o `BarcodeDetector` e o `jsQR`. */
  detectorNativo?: (px: ImageData) => Promise<CodigoLido[]>;
  leitorReserva?: (px: ImageData) => Promise<CodigoLido[]>;
}

async function nativo(px: ImageData): Promise<CodigoLido[]> {
  const Detector = (globalThis as unknown as { BarcodeDetector?: new (o?: unknown) => unknown })
    .BarcodeDetector;
  if (!Detector) return [];
  try {
    // Sem `formats`: pedir a lista completa é o padrão, e restringir só
    // esconderia um formato que a prova resolveu usar.
    const d = new Detector() as { detect: (i: ImageData) => Promise<unknown[]> };
    const achados = (await d.detect(px)) as { rawValue?: string; format?: string }[];
    return achados
      .filter((a) => typeof a.rawValue === "string" && a.rawValue.length > 0)
      .map((a) => ({
        texto: a.rawValue as string,
        formato: a.format ?? "desconhecido",
        origem: "nativo" as const,
      }));
  } catch {
    // Navegador que anuncia a API e falha ao construir (já aconteceu em versões
    // antigas do Chrome no Linux): cai para a reserva em vez de estourar.
    return [];
  }
}

async function reserva(px: ImageData): Promise<CodigoLido[]> {
  try {
    const mod = await import("jsqr");
    const jsQR = mod.default ?? (mod as unknown as typeof mod.default);
    // `attemptBoth` porque foto de tela e papel escuro invertem a polaridade, e
    // é barato tentar as duas.
    const r = jsQR(px.data, px.width, px.height, { inversionAttempts: "attemptBoth" });
    return r?.data ? [{ texto: r.data, formato: "qr_code", origem: "jsqr" }] : [];
  } catch {
    return [];
  }
}

/**
 * Lê todos os códigos da imagem, na escada acima.
 *
 * Devolve os DOIS caminhos somados quando ambos acham: o nativo pode ler um
 * EAN que o `jsQR` ignora, e o `jsQR` às vezes pega um QR que o nativo perdeu.
 * A deduplicação é por texto — o mesmo código lido duas vezes é um achado só.
 */
export async function lerCodigos(
  px: ImageData,
  inj: Injetaveis = {},
): Promise<{ achados: CodigoLido[]; motivo: string | null }> {
  const usarNativo = inj.detectorNativo ?? nativo;
  const usarReserva = inj.leitorReserva ?? reserva;

  const doNativo = temLeitorNativo() || inj.detectorNativo ? await usarNativo(px) : [];
  // A reserva só roda se o nativo não achou nada: quando ele acha, tentar de
  // novo custa o download da lib para repetir a mesma resposta.
  const daReserva = doNativo.length > 0 ? [] : await usarReserva(px);

  const vistos = new Set<string>();
  const achados: CodigoLido[] = [];
  for (const c of [...doNativo, ...daReserva]) {
    if (vistos.has(c.texto)) continue;
    vistos.add(c.texto);
    achados.push(c);
  }

  return {
    achados,
    motivo: achados.length > 0 ? null : motivoDaFalha(temLeitorNativo(), true),
  };
}
