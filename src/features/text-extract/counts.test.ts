import { describe, expect, it } from "vitest";
import {
  charPerLine,
  countChar,
  countSeries,
  countWords,
  countsToLetters,
  itemsPerParagraph,
  lettersPerLine,
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

/**
 * LETRAS POR LINHA — a série que faltava, e a prova que a pediu.
 *
 * p04/2024 esconde a resposta na contagem de LETRAS de cada linha: 20-5-14-5-20
 * lido em A1Z26 dá TENET. A bancada tinha quatro séries de contagem e nenhuma
 * contava letras, então essa prova era invisível para ela.
 */
describe("letras por linha", () => {
  it("conta letra, e não o que `RE_WORD` chama de palavra", () => {
    // `RE_WORD` casa dígito também; para a leitura A1Z26 isso é ruído.
    expect(lettersPerLine("abc 123\nde")).toEqual([3, 2]);
  });

  it("acento conta como letra", () => {
    expect(lettersPerLine("ação\ncoração")).toEqual([4, 7]);
  });

  it("pontuação e espaço não contam", () => {
    expect(lettersPerLine("a, b. c!\nd - e")).toEqual([3, 2]);
  });

  it("entra em `countSeries` com o id próprio", () => {
    const s = countSeries("abcde fg\nhi\njklmnop qrs");
    expect(s.map((x) => x.id)).toContain("letters-line");
    expect(s.find((x) => x.id === "letters-line")?.counts).toEqual([7, 2, 10]);
  });

  /**
   * Numa lista de uma palavra por linha, "palavras por linha" e "letras por
   * linha" podem coincidir — e duas séries iguais viram dois cards idênticos no
   * `count-key`.
   */
  it("não se repete quando é a mesma série de outra", () => {
    const s = countSeries("a\nb\nc");
    const iguais = s.filter((x) => x.counts.join() === "1,1,1");
    expect(iguais.length).toBeLessThanOrEqual(1);
  });

  it("a âncora: 20-5-14-5-20 chega ao `count-key` como TENET", () => {
    const alvo = [
      "a".repeat(20),
      "b".repeat(5),
      "c".repeat(14),
      "d".repeat(5),
      "e".repeat(20),
    ].join("\n");
    expect(countSeries(alvo).find((x) => x.id === "letters-line")?.counts).toEqual([
      20, 5, 14, 5, 20,
    ]);
  });
});
