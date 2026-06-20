import { describe, expect, it } from "vitest";
import {
  afterPunctuation,
  capitals,
  columnRead,
  diagonalRead,
  firstOfLines,
  firstOfWords,
  lastOfLines,
  lastOfWords,
  repeatedWords,
  reversedAll,
  reversedWords,
  textStats,
} from "./extract";

describe("extrator de texto", () => {
  it("primeiras/últimas letras de linhas", () => {
    const t = "Casa\nAzul\nMar\nPaz";
    expect(firstOfLines(t)).toBe("CAMP");
    expect(lastOfLines(t)).toBe("alrz");
  });

  it("primeiras/últimas letras de palavras", () => {
    const t = "sol e mar azul";
    expect(firstOfWords(t)).toBe("sema");
    expect(lastOfWords(t)).toBe("lerl");
  });

  it("maiúsculas escondidas na ordem", () => {
    expect(capitals("aBcDeF gHi")).toBe("BDFH");
  });

  it("letra após pontuação", () => {
    expect(afterPunctuation("oi, Mundo. teste; fim")).toBe("Mtf");
  });

  it("espelhamentos", () => {
    expect(reversedAll("abc def")).toBe("fed cba");
    expect(reversedWords("abc def")).toBe("cba fed");
  });

  it("leitura em coluna e diagonal", () => {
    // colunas: SOL · OVA · LOR  → "SOLOVALOR"; diagonal: S, V, R
    expect(columnRead("SOL\nOVO\nLAR")).toBe("SOLOVALOR");
    expect(diagonalRead("SOL\nOVO\nLAR")).toBe("SVR");
  });

  it("palavras repetidas com contagem", () => {
    expect(repeatedWords("sol mar sol sol mar")).toBe("sol (3) · mar (2)");
  });

  it("contagens", () => {
    const s = textStats("Oi mundo. Tudo bem?");
    expect(s.words).toBe(4);
    expect(s.sentences).toBe(2);
    expect(s.lines).toBe(1);
  });
});
