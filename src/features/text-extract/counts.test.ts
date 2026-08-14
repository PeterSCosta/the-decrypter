import { describe, expect, it } from "vitest";
import {
  charPerLine,
  countChar,
  countSeries,
  countWords,
  countsToLetters,
  itemsPerParagraph,
  splitParagraphs,
  wordsPerLine,
  wordsPerParagraph,
} from "./counts";

/**
 * Âncora do acervo: GIA-2026 04 "O poder das palavras" — os 8 parágrafos do
 * enunciado contam 22 5 14 3 5 4 15 18 → VENCEDOR.
 * (acervo/gia-2026/gia-04-o-poder-das-palavras/texto/{enunciado,resolucao}.md)
 */
const GIA04 = `Vieram as chuvas, os tropeços, o medo, as noites longas, mas juntos seguimos, lado a lado, sem hesitar, para vencermos com honra.

Escolhemos lutar sempre, mesmo cansados.

Nada impediu nossos passos firmes em frente. Lutando com fé, força, garra, coragem, união.

Caímos, levantamos, reerguemos.

Erros nos moldaram a crescer.

De cada queda, aprendizado.

Avançamos quando todos recuaram, buscamos mais, mesmo na incerteza, confiando no impossível, adiante pela vitória.

Resistimos a tudo que tentava nos parar, e fizemos disso nossa motivação maior. E essa é a Arromba!`;

describe("contagem como chave (A5)", () => {
  it("GIA-04: os 8 parágrafos contam 22 5 14 3 5 4 15 18 → vencedor", () => {
    expect(splitParagraphs(GIA04)).toHaveLength(8);
    const counts = wordsPerParagraph(GIA04);
    expect(counts).toEqual([22, 5, 14, 3, 5, 4, 15, 18]);
    expect(countsToLetters(counts)).toBe("vencedor");
  });

  it("pontuação solta não vira palavra", () => {
    expect(countWords("sol, mar — e paz!")).toBe(4);
    expect(countWords("   ")).toBe(0);
  });

  it("A1Z26 recusa a série quando algo cai fora de 1..26", () => {
    expect(countsToLetters([1, 27])).toBeNull();
    expect(countsToLetters([0, 5])).toBeNull();
    expect(countsToLetters([])).toBeNull();
  });

  it("linhas e parágrafos são séries diferentes", () => {
    const t = "um dois tres\nquatro\n\ncinco seis";
    expect(wordsPerLine(t)).toEqual([3, 1, 2]);
    expect(wordsPerParagraph(t)).toEqual([4, 2]);
  });

  it("itens por bloco separa lista de prosa", () => {
    expect(itemsPerParagraph("azul, verde, rosa\n\npreto; branco")).toEqual([3, 2]);
  });

  it("ocorrências de um caractere ignoram caixa e acento", () => {
    const t = "Ana e Ávila\nsol";
    expect(charPerLine(t, "a")).toEqual([4, 0]);
    expect(countChar(t, "A")).toBe(4);
    expect(charPerLine(t, "ab")).toEqual([]);
  });

  describe("séries oferecidas", () => {
    it("sem linha em branco, some a série de parágrafos", () => {
      const ids = countSeries("sol e mar\nazul do ceu\npaz").map((s) => s.id);
      expect(ids).toContain("words-line");
      expect(ids).not.toContain("words-paragraph");
    });

    it("com parágrafos, a série de GIA-04 vem inteira", () => {
      const s = countSeries(GIA04).find((x) => x.id === "words-paragraph");
      expect(s?.counts).toEqual([22, 5, 14, 3, 5, 4, 15, 18]);
    });

    it("o caractere do 2º campo entra como série própria", () => {
      const s = countSeries("Ana e Ada\nsol e mar", "a").find((x) => x.id === "char-line");
      expect(s?.counts).toEqual([4, 1]);
    });
  });
});
