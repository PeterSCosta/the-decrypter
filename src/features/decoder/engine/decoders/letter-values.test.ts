import { describe, expect, it } from "vitest";
import { cipherDecoders } from "../ciphers";
import type { DecodeContext } from "../types";
import { decoders as letterValues } from "./letter-values";

const ctx = (only?: string): DecodeContext => ({ key: "", only, streets: null, ceps: null });
const decode = (input: string, only?: string) => letterValues.decode(input, ctx(only));
const out = (input: string, only?: string) => decode(input, only).map((c) => c.output);
const byLabel = (input: string, needle: string, only?: string) =>
  decode(input, only).find((c) => c.label?.includes(needle));

describe("valor das letras — letra → número", () => {
  // Âncora: "primos + gematria" é a cifra registrada da Scotland Yard (CG 2019,
  // 0/4) no DICIONARIO-CIFRAS.md do acervo. O enunciado da prova não está no
  // acervo, então as âncoras aqui são as tabelas em si.
  it("primos: A=2, B=3, C=5 … S=67, T=71", () => {
    expect(byLabel("scotland", "primos")?.output).toBe("67 5 47 71 37 2 43 7");
  });

  it("gematria clássica: unidades, dezenas e centenas", () => {
    const c = byLabel("scotland", "gematria");
    expect(c?.output).toBe("100 3 60 200 30 1 50 4");
    expect(c?.notes).toBe("soma 448 · raiz digital 7");
  });

  it("redução 1–9 dá a raiz digital de cada letra (S volta a 1)", () => {
    expect(byLabel("scotland", "redução")?.output).toBe("1 3 6 2 3 1 5 4");
  });

  it("TALA (Bar do Tala, P7 de 2019) soma 232 em gematria", () => {
    const c = byLabel("tala", "gematria");
    expect(c?.output).toBe("200 1 30 1");
    expect(c?.notes).toContain("soma 232");
  });

  it("acento cai antes de valer número", () => {
    expect(byLabel("ação", "gematria")?.output).toBe("1 3 1 60");
  });

  it("números não são texto: a saída leva forcedScore", () => {
    expect(byLabel("scotland", "primos")?.forcedScore).toBe(0.5);
  });
});

describe("valor das letras — não colide com o A1Z26", () => {
  it("palavra só de A–I: só primos sobra, o ordinal é do a1z26", () => {
    expect(out("abc")).toEqual(["2 3 5"]);
  });

  it("e o cartão do a1z26-encode continua respondendo por '1 2 3'", () => {
    const a1z26 = cipherDecoders.find((d) => d.id === "a1z26-encode");
    expect(a1z26?.decode("abc", ctx())[0]?.output).toBe("1 2 3");
  });
});

describe("valor das letras — número → letras", () => {
  it("lista de primos volta a ser palavra", () => {
    expect(out("67 5 47 71 37 2 43 7")).toContain("scotland");
  });

  it("lista de gematria volta a ser palavra", () => {
    expect(out("100 3 60 200 30 1 50 4")).toContain("scotland");
  });

  it("saída de texto não usa forcedScore (o realce de palavra real decide)", () => {
    expect(decode("67 5 47 71 37 2 43 7")[0]?.forcedScore).toBeUndefined();
  });

  it("valor fora da tabela derruba o esquema inteiro", () => {
    // 100 não é primo da tabela; 67 não é valor de gematria.
    expect(out("67 5 100")).toEqual([]);
  });

  it("lista que o a1z26 já lê não vira cartão", () => {
    expect(out("1 2 3")).toEqual([]);
  });
});

describe("valor das letras — o portão", () => {
  it("uma palavra só, fora do modo solo", () => {
    expect(out("Bar do Tala")).toEqual([]);
  });

  it("no modo solo a frase inteira passa, palavra a palavra", () => {
    const c = byLabel("Bar do Tala", "primos", "letter-values");
    expect(c?.output).toBe("3 2 61 / 7 47 / 71 2 37 2");
  });

  it("dígito na entrada não é palavra", () => {
    expect(out("abc123")).toEqual([]);
    expect(out("88306445")).toEqual([]);
  });

  it("pontuação e prosa longa ficam de fora", () => {
    expect(out("quem, afinal?")).toEqual([]);
    expect(out("o assassino esteve na cena do crime antes de todos")).toEqual([]);
  });

  it("uma letra só é a tabela, não uma resposta", () => {
    expect(out("a")).toEqual([]);
  });

  it("dois números não bastam para inverter", () => {
    expect(out("67 5")).toEqual([]);
  });
});
