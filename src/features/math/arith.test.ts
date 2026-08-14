import { describe, expect, it } from "vitest";
import {
  a1z26,
  analyzeArithmetic,
  coordinateFromDigits,
  exactSqrt,
  fmt,
  gcdAll,
  kaprekarChain,
  lcmAll,
  parseBlocks,
  parseNumbers,
  wrapA1Z26,
} from "./arith";

describe("parsing pt-BR", () => {
  it("milhar com ponto e decimal com vírgula", () => {
    expect(parseNumbers("R$ 15.586.677,75")).toEqual([
      { value: 15586677.75, percent: false, raw: "15.586.677,75" },
    ]);
  });

  it("marca a porcentagem", () => {
    expect(parseNumbers("taxação de 17,5%")).toEqual([{ value: 17.5, percent: true, raw: "17,5" }]);
  });

  it("ponto só é milhar em grupos de 3 — o código do GeoTude são cinco números", () => {
    // 68130.89.91.15.12 é o código de coordenada de GIA-27, não 68.130 e tal
    expect(parseNumbers("68130.89.91.15.12").map((n) => n.value)).toEqual([68130, 89, 91, 15, 12]);
  });

  it("blocos são parágrafos, e parágrafo sem número não conta", () => {
    const blocks = parseBlocks("tem 12 e 25 aqui\n\nnada aqui\n\ne 7 ali");
    expect(blocks.map((b) => b.map((n) => n.value))).toEqual([[12, 25], [7]]);
  });
});

describe("operações", () => {
  it("MDC e MMC dos números de GIA-27", () => {
    const v = [21, 15, 45, 60, 63, 12, 15];
    expect(gcdAll(v)).toBe(3);
    expect(lcmAll(v)).toBe(1260);
    expect(a1z26(v.map((x) => x / 3))).toBe("GEOTUDE");
  });

  it("raiz exata só de quadrado perfeito", () => {
    expect(exactSqrt(2304)).toBe(48);
    expect(exactSqrt(8100)).toBe(90);
    expect(exactSqrt(2305)).toBeNull();
  });

  it("A1Z26 morre se um único valor sair da faixa", () => {
    expect(a1z26([26, 9, 48, 1, 8])).toBeNull();
    expect(wrapA1Z26(45)).toBe(19);
    expect(wrapA1Z26(26)).toBe(26);
    expect(wrapA1Z26(27)).toBe(1);
  });

  it("coordenada de dois blocos de dígitos (GIA-21)", () => {
    expect(coordinateFromDigits(["2694818", "4907202"])).toBe("-26.94818, -49.07202");
    // fora da faixa do Brasil: dois telefones não viram coordenada
    expect(coordinateFromDigits(["4733334444", "4799998888"])).toBeNull();
    expect(coordinateFromDigits(["2694818"])).toBeNull();
  });

  it("Kaprekar converge, e o repdígito não", () => {
    expect(kaprekarChain(2019)?.length).toBe(4);
    expect(kaprekarChain(1949)?.length).toBe(7);
    expect(kaprekarChain(1905)?.length).toBe(7);
    expect(kaprekarChain(6174)?.length).toBe(0);
    expect(kaprekarChain(1111)).toBeNull();
  });

  /**
   * DIVERGÊNCIA CONHECIDA — não ajustar o algoritmo para bater com o gabarito.
   * O gabarito da P7 de 2019 (acervo: RESOLUCOES.md:271) registra 4/4/7/7 para
   * 2019/2010/1949/1905 → código 4477. Em contagem estrita, 2010 fecha em 3:
   * 2100−0012=2088, 8820−0288=8532, 8532−2358=6174. O código verídico é 4377.
   */
  it("2010 dá 3 passos, contra os 4 do gabarito de 2019", () => {
    expect(kaprekarChain(2010)).toEqual([2088, 8532, 6174]);
  });

  it("formata em pt-BR sem cauda de zeros", () => {
    expect(fmt(89066730)).toBe("89066730");
    expect(fmt(15586677.75)).toBe("15586677,75");
  });
});

describe("relatório", () => {
  const blocks = parseBlocks("21 15 45 60 63 12 15");

  it("painel completo traz MDC, MMC, soma e resto", () => {
    const ops = analyzeArithmetic(blocks).lines.map((l) => l.op);
    expect(ops).toContain("mdc");
    expect(ops).toContain("mmc");
    expect(ops).toContain("soma");
  });

  it("filtro de operação devolve só a linha pedida", () => {
    const r = analyzeArithmetic(blocks, ["mdc"]);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].text).toBe("MDC = 3 → 7 5 15 20 21 4 5 → GEOTUDE");
    expect(r.lines[0].reading).toBe("GEOTUDE");
  });

  it("divisão pela alíquota vira CEP (GIA-06)", () => {
    const r = analyzeArithmetic(parseBlocks("15.586.677,75 e 17,5%"), ["divisao"]);
    expect(r.lines[0].text).toBe("15.586.677,75 ÷ 17,5% = 89066730 · CEP 89066-730");
    expect(r.lines[0].chain).toBe("89066730");
  });
});
