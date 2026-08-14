import { describe, expect, it } from "vitest";
import {
  type Bitmap,
  LADO_MAXIMO,
  MARGEM_PADRAO,
  MODULO_PADRAO,
  baixarPng,
  calcularTamanho,
  celula,
  dimensoes,
  lerHex,
  toPng,
  toRgba,
} from "./render";

/** Arte ASCII → matriz. `#` é módulo aceso; qualquer outra coisa é apagado. */
const arte = (linhas: string[]): Bitmap => linhas.map((l) => [...l].map((c) => c === "#"));

/** O dígito 8 na fonte 3×5 de segmentos — o caso do ITC 2019/2023. */
const OITO = arte(["###", "#.#", "###", "#.#", "###"]);

/** Cor RGBA do pixel (x, y). */
function pixel(rgba: { data: Uint8ClampedArray; width: number }, x: number, y: number) {
  const i = (y * rgba.width + x) * 4;
  return [rgba.data[i], rgba.data[i + 1], rgba.data[i + 2], rgba.data[i + 3]];
}

const PRETO = [0, 0, 0, 255];
const BRANCO = [255, 255, 255, 255];

describe("lerHex", () => {
  it("aceita as duas formas e ignora o cerquilha", () => {
    expect(lerHex("#000")).toEqual([0, 0, 0]);
    expect(lerHex("ffffff")).toEqual([255, 255, 255]);
    expect(lerHex("#C6F135")).toEqual([198, 241, 53]);
  });

  it("recusa o que não é cor, para o chamador cair no padrão", () => {
    expect(lerHex("var(--brand)")).toBeNull();
    expect(lerHex("#12345")).toBeNull();
    expect(lerHex("")).toBeNull();
  });
});

describe("dimensoes", () => {
  it("mede a matriz e denuncia linha de tamanho diferente", () => {
    expect(dimensoes(OITO)).toEqual({ linhas: 5, colunas: 3, irregular: false });
    expect(dimensoes(arte(["###", "#", "###"]))).toEqual({
      linhas: 3,
      colunas: 3,
      irregular: true,
    });
  });

  it("aguenta matriz vazia sem lançar", () => {
    expect(dimensoes([])).toEqual({ linhas: 0, colunas: 0, irregular: false });
  });
});

describe("celula", () => {
  it("trata fora-da-matriz e linha curta como apagado", () => {
    const torta = arte(["##", "#"]);
    expect(celula(torta, 0, 1)).toBe(true);
    expect(celula(torta, 1, 1)).toBe(false);
    expect(celula(torta, 9, 9)).toBe(false);
    expect(celula(torta, -1, 0)).toBe(false);
  });
});

describe("calcularTamanho", () => {
  it("conta a quiet zone dos DOIS lados", () => {
    const t = calcularTamanho(OITO);
    // (3 colunas + 4 de margem de cada lado) × 8 px
    expect(t.px).toBe(MODULO_PADRAO);
    expect(t.margemPx).toBe(MARGEM_PADRAO * MODULO_PADRAO);
    expect(t.largura).toBe((3 + 2 * MARGEM_PADRAO) * MODULO_PADRAO);
    expect(t.altura).toBe((5 + 2 * MARGEM_PADRAO) * MODULO_PADRAO);
    expect(t.reduzido).toBe(false);
  });

  it("margem zero encosta a imagem na matriz", () => {
    const t = calcularTamanho(OITO, { margem: 0 });
    expect(t.margemPx).toBe(0);
    expect(t.largura).toBe(3 * MODULO_PADRAO);
  });

  it("aplica a escala sobre o módulo, sempre em pixel inteiro", () => {
    // 8 × 2,5 = 20 exato; 8 × 1,1 = 8,8 arredonda para 9 (módulo fracionário
    // deixaria a borda cinza e o leitor erraria o módulo).
    expect(calcularTamanho(OITO, { escala: 2.5 }).px).toBe(20);
    expect(calcularTamanho(OITO, { escala: 1.1 }).px).toBe(9);
  });

  it("cede no tamanho do módulo em vez de estourar a memória", () => {
    const grande = arte(Array.from({ length: 177 }, () => "#".repeat(177)));
    const t = calcularTamanho(grande, { modulo: 16, escala: 4 });
    expect(t.reduzido).toBe(true);
    expect(Math.max(t.largura, t.altura)).toBeLessThanOrEqual(LADO_MAXIMO);
    expect(t.px).toBeGreaterThanOrEqual(1);
  });

  it("matriz vazia dá imagem de tamanho zero, não NaN", () => {
    const t = calcularTamanho([]);
    expect(t.largura).toBe(0);
    expect(t.altura).toBe(0);
  });
});

describe("toRgba", () => {
  it("pinta o módulo aceso de preto e o apagado de branco", () => {
    const r = toRgba(OITO, { modulo: 2, margem: 0 });
    expect(r.width).toBe(6);
    expect(r.height).toBe(10);
    expect(pixel(r, 0, 0)).toEqual(PRETO); // (0,0) aceso
    expect(pixel(r, 2, 2)).toEqual(BRANCO); // (1,1) apagado
    expect(pixel(r, 3, 3)).toEqual(BRANCO); // mesmo módulo, outro pixel
    expect(pixel(r, 4, 2)).toEqual(PRETO); // (1,2) aceso
  });

  it("o buffer tem 4 bytes por pixel, sem sobra", () => {
    const r = toRgba(OITO, { modulo: 3, margem: 1 });
    expect(r.data.length).toBe(r.width * r.height * 4);
  });

  it("a quiet zone sai branca", () => {
    const r = toRgba(OITO, { modulo: 2, margem: 4 });
    expect(pixel(r, 0, 0)).toEqual(BRANCO);
    expect(pixel(r, r.width - 1, r.height - 1)).toEqual(BRANCO);
    // primeiro pixel logo depois da margem é o módulo (0,0), aceso
    expect(pixel(r, 8, 8)).toEqual(PRETO);
  });

  it("inverter troca os módulos e NÃO a quiet zone", () => {
    // Uma borda escura apagaria o código: é a quiet zone que faz o leitor achá-lo.
    const r = toRgba(OITO, { modulo: 2, margem: 2, inverter: true });
    expect(pixel(r, 0, 0)).toEqual(BRANCO);
    expect(pixel(r, 4, 4)).toEqual(BRANCO); // módulo (0,0) era aceso, apagou
    expect(pixel(r, 6, 6)).toEqual(PRETO); // módulo (1,1) era apagado, acendeu
  });

  it("respeita as cores pedidas e o fundo transparente", () => {
    const r = toRgba(OITO, { modulo: 1, margem: 1, corEscura: "#C6F135", fundoTransparente: true });
    expect(pixel(r, 1, 1)).toEqual([198, 241, 53, 255]);
    expect(pixel(r, 0, 0)[3]).toBe(0);
  });

  it("linha curta vira módulo apagado em vez de erro", () => {
    const r = toRgba(arte(["##", "#"]), { modulo: 1, margem: 0 });
    expect(pixel(r, 1, 1)).toEqual(BRANCO);
  });

  it("matriz vazia devolve buffer vazio", () => {
    const r = toRgba([]);
    expect(r.width).toBe(0);
    expect(r.data.length).toBe(0);
  });
});

describe("toPng", () => {
  // jsdom não tem canvas de verdade: o contrato aqui é NÃO lançar e devolver
  // null, para a aba mostrar "não deu para gerar a imagem" em vez de quebrar.
  it("devolve null sem lançar quando não há canvas", () => {
    expect(() => toPng(OITO)).not.toThrow();
    expect(toPng(OITO)).toBeNull();
  });

  it("matriz vazia não vira imagem", () => {
    expect(toPng([])).toBeNull();
  });

  it("baixarPng avisa quando não gerou, em vez de fingir que baixou", () => {
    expect(baixarPng(OITO, "runa.png")).toBe(false);
  });
});
