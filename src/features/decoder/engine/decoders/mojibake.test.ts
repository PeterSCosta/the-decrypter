import { describe, expect, it } from "vitest";
import { setWordSet } from "../score";
import type { DecodeCandidate, DecodeContext } from "../types";
import { decoders } from "./mojibake";

const ctx = { key: "", streets: null, ceps: null } as DecodeContext;
const dec = Array.isArray(decoders) ? decoders[0] : decoders;
const saida = (t: string) => dec.decode(t, ctx).map((c: DecodeCandidate) => c.output);
const nota = (t: string) => dec.decode(t, ctx)[0]?.forcedScore;

const PT = new Set(["informacao", "resposta", "praca", "esta", "monumento", "construcao", "nao"]);
const comVocabulario = () => setWordSet({ has: (w: string) => PT.has(w) });

describe("mojibake", () => {
  it("recupera os acentos do caso clássico", () => {
    comVocabulario();
    expect(saida("informaÃ§Ã£o")).toContain("informação");
  });

  it("recupera uma frase inteira de prova", () => {
    comVocabulario();
    expect(saida("A resposta estÃ¡ na praÃ§a")).toContain("A resposta está na praça");
  });

  /**
   * A razão de o decoder existir: sem ele o texto perde o selo de palavra real,
   * e o selo é o que separa resposta de acaso no ranking inteiro.
   */
  it("a volta tem de GANHAR palavra real — é a segunda porta", () => {
    comVocabulario();
    // "praÃ§a" não casa com nada; "praça" casa com `praca` depois do fold.
    expect(saida("a praÃ§a")).toHaveLength(1);
  });

  it("não emite quando a volta não ganha português", () => {
    comVocabulario();
    // Assinatura presente, mas o resultado não é palavra nenhuma da lista.
    expect(saida("xÃ§Ã£z")).toHaveLength(0);
  });

  it("texto português limpo não dispara", () => {
    comVocabulario();
    expect(saida("A resposta está na praça")).toHaveLength(0);
  });

  it("texto sem a assinatura não dispara, mesmo com acento", () => {
    comVocabulario();
    expect(saida("informação, construção, não")).toHaveLength(0);
  });

  it("sem vocabulário ainda funciona, com nota menor — e nunca cala em silêncio", () => {
    setWordSet(null);
    expect(saida("informaÃ§Ã£o")).toContain("informação");
    expect(nota("informaÃ§Ã£o")).toBeLessThan(0.9);
  });

  it("com vocabulário a nota é alta: assinatura literal + volta autoverificada", () => {
    comVocabulario();
    expect(nota("informaÃ§Ã£o")).toBe(0.9);
  });

  it("entrada curta demais não dispara", () => {
    comVocabulario();
    expect(saida("Ã§")).toHaveLength(0);
  });

  it("não devolve texto com caractere de substituição", () => {
    comVocabulario();
    for (const s of saida("informaÃ§Ã£o")) expect(s).not.toContain("�");
  });
});
