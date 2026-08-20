import { describe, expect, it } from "vitest";
import { sniff } from "./sniff";
import type { DecodeContext } from "./types";

const CTX: DecodeContext = { key: "", streets: null, ceps: null };
const ids = (input: string) => sniff(input, CTX).map((h) => h.id);
const hint = (input: string, id: string) => sniff(input, CTX).find((h) => h.id === id);

describe("sniffer de formato", () => {
  it("desfaz a confusão nº 1 do acervo: ASCII não é A1Z26", () => {
    // GIA-01 "Ask Me": 84 79 80 79 → TOPO em ASCII. Lido como A1Z26, não existe.
    expect(ids("84 79 80 79")).toContain("ascii-not-a1z26");
    expect(ids("84 79 80 79")).not.toContain("a1z26-range");
  });

  it("reconhece a faixa do A1Z26 quando ela é de fato a faixa", () => {
    expect(ids("7 5 15 20 21 4 5")).toContain("a1z26-range");
    expect(ids("7 5 15 20 21 4 5")).not.toContain("ascii-not-a1z26");
  });

  it("acha o MDC latente e já entrega a lista dividida (GIA-27)", () => {
    const h = hint("21 15 45 60 63 12 15", "gcd");
    expect(h?.label).toBe("MDC = 3");
    // 7 5 15 20 21 4 5 → GEOTUDE. É a camada seguinte, pronta para encadear.
    expect(h?.chainValue).toBe("7 5 15 20 21 4 5");
  });

  it("acha quadrados perfeitos e entrega as raízes (GIA-21)", () => {
    const h = hint("676 81 2304 1 64", "squares");
    expect(h?.chainValue).toBe("26 9 48 1 8");
  });

  it("não inventa MDC quando ele é 1", () => {
    expect(ids("7 5 15")).not.toContain("gcd");
  });

  it("dá o diagnóstico NEGATIVO do dígito verificador", () => {
    // O valor que decoder nenhum entrega: quando não se aplica, ele cala.
    const bad = hint("7891234567890", "ean-bad");
    expect(bad?.tone).toBe("warn");
    expect(bad?.detail).toMatch(/deveria ser/);
  });

  it("avisa que 11 dígitos não são um CPF válido", () => {
    expect(ids("12345678901")).toContain("cpf-bad");
    // CPF válido não gera o aviso.
    expect(ids("11144477735")).not.toContain("cpf-bad");
  });

  it("reconhece a forma do GeoTude sem decodificar", () => {
    expect(ids("68130.89.91.15.12")).toContain("geotude-shape");
    // Número de 5 dígitos sozinho não é geocódigo.
    expect(ids("68130")).not.toContain("geotude-shape");
  });

  it("reconhece a forma do what3words", () => {
    expect(ids("///palavra.outra.terceira")).toContain("w3w-shape");
  });

  it("entrada vazia não produz palpite", () => {
    expect(sniff("   ", CTX)).toEqual([]);
  });
});

/**
 * O CHIP DE ADFGVX — ele diz o nome e NÃO decifra.
 *
 * Medido antes de existir: num ADFGVX de verdade a bancada emitia **5 cards
 * acima do corte, todos errados** (`affine` 0,49, `caesar` 0,46…) e nenhum
 * nomeava a cifra. O chip troca cinco respostas erradas por uma frase certa.
 */
describe("chip de ADFGVX", () => {
  const chip = (s: string) => sniff(s, CTX).filter((c) => c.id === "adfgvx-shape");

  it("reconhece o ADFGVX (com V) e o ADFGX (sem)", () => {
    expect(chip("DFFGDDAFVDAAVFAAAXDAGXDAAVGDAAGDXAFVDGAXVDAAFGXDVAAGXDFA")[0]?.label).toContain(
      "ADFGVX",
    );
    expect(chip("ADFGXADFGXADFGXA")[0]?.label).toContain("ADFGX");
  });

  it("diz que não decifra, e por quê", () => {
    expect(chip("ADFGXADFGXADFGXA")[0]?.detail).toContain("duas chaves");
  });

  it("recusa curto demais e comprimento ímpar", () => {
    expect(chip("ADFGX")).toHaveLength(0);
    expect(chip("DFFGDDAFVDAAVFA")).toHaveLength(0);
  });

  it("não dispara em prosa nem em outro formato", () => {
    for (const s of ["A resposta esta na praca", "SGVsbG8gbXVuZG8=", "89010000"]) {
      expect(chip(s), s).toHaveLength(0);
    }
  });

  /**
   * O portão é literal, e o número que autoriza: **0 de 30.000** strings
   * alfanuméricas sorteadas acendem.
   */
  it("não acende em string alfanumérica aleatória", () => {
    let x = 99;
    const r = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let acende = 0;
    for (let i = 0; i < 8000; i++) {
      const n = 8 + Math.floor(r() * 40);
      let s = "";
      for (let j = 0; j < n; j++) s += alfabeto[Math.floor(r() * 36)];
      if (chip(s).length) acende++;
    }
    expect(acende).toBe(0);
  });
});
