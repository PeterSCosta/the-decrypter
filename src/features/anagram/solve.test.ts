import { describe, expect, it } from "vitest";
import { anagramKey, buildIndex, solveAnagram } from "./solve";

describe("anagram solver", () => {
  it("normaliza a chave (acentos e caixa)", () => {
    expect(anagramKey("Roma")).toBe(anagramKey("amor"));
    expect(anagramKey("ação")).toBe(anagramKey("acao"));
  });

  it("acha todas as palavras com as mesmas letras", () => {
    const idx = buildIndex(["amor", "Roma", "ramo", "casa", "saca"]);
    expect(solveAnagram(idx, "mora").sort()).toEqual(["Roma", "amor", "ramo"]);
    expect(solveAnagram(idx, "xyz")).toEqual([]); // sem match
  });

  it("encontra anagrama com acento via letras sem acento", () => {
    const idx = buildIndex(["ação"]);
    expect(solveAnagram(idx, "acao")).toContain("ação");
  });

  it("retorna vazio quando não há letras", () => {
    expect(solveAnagram(buildIndex(["abc"]), "123")).toEqual([]);
  });
});
