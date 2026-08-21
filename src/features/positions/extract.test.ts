import { describe, expect, it } from "vitest";
import { avisoMultinivel, countUnits, extract, parsePositions, stepPositions } from "./extract";

describe("position extraction", () => {
  it("counts every Nth letter (step mode)", () => {
    // a b c d e f g h i j k l m n  →  7th = g, 14th = n
    const text = "abcdefghijklmn";
    const positions = stepPositions(7, countUnits(text, true).length);
    expect(positions).toEqual([7, 14]);
    expect(extract(text, positions, true).result).toBe("gn");
  });

  it("counts only letters, ignoring spaces and punctuation", () => {
    // letters: a(1) b(2) c(3) d(4) e(5) → position 3 = c
    expect(extract("a b, c! d e", [3], true).result).toBe("c");
  });

  it("counts all characters when onlyLetters is off", () => {
    // "a b" → index1 a, index2 space, index3 b → position 2 = " "
    expect(extract("a b", [2], false).result).toBe(" ");
  });

  it("extracts specific positions in the requested order", () => {
    expect(extract("PARALELO", [4, 1, 2], true).result).toBe("APA");
  });

  it("parses a position list from mixed separators", () => {
    expect(parsePositions("3, 7  12;1")).toEqual([3, 7, 12, 1]);
  });

  it("avisa quando a chave é de 2 ou 3 níveis e este modo a está achatando", () => {
    // O achatamento continua acontecendo — o que muda é que ele deixa de ser mudo.
    expect(parsePositions("8-4-3")).toEqual([8, 4, 3]);
    expect(avisoMultinivel("8-4-3")).toMatch(/achatamento/);
    expect(avisoMultinivel("7-3 14-5")).toMatch(/achatamento/);
    expect(avisoMultinivel("33.9")).toMatch(/achatamento/);
  });

  it("não avisa em lista de índices soltos, que é o uso normal do modo", () => {
    expect(avisoMultinivel("3, 7 12")).toBeUndefined();
    expect(avisoMultinivel("")).toBeUndefined();
    // "-5" é contagem do fim, não par: nada de aviso.
    expect(avisoMultinivel("-5")).toBeUndefined();
  });

  it("ignores out-of-range positions and records picked indices", () => {
    const r = extract("abc", [2, 99], true);
    expect(r.result).toBe("b");
    expect([...r.pickedIndices]).toEqual([1]);
  });

  it("a step < 1 yields no positions", () => {
    expect(stepPositions(0, 50)).toEqual([]);
  });
});
