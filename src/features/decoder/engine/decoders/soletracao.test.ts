import { describe, expect, it } from "vitest";
import { setWordSet } from "../score";
import type { DecodeCandidate, DecodeContext } from "../types";
import { decoders } from "./soletracao";

const ctx = { key: "", streets: null, ceps: null } as DecodeContext;
const dec = Array.isArray(decoders) ? decoders[0] : decoders;
const saidas = (t: string) => dec.decode(t, ctx).map((c: DecodeCandidate) => String(c.output));

const PT = new Set(["ponte", "casa", "rede", "luar", "meta", "ouro"]);
const comVocabulario = () => setWordSet({ has: (w: string) => PT.has(w) });

describe("soletração acrofônica", () => {
  it("lê a cadeia e devolve as iniciais", () => {
    comVocabulario();
    expect(saidas("P de Pipa, O de Ouro, N de Navio, T de Tatu, E de Estrela")).toContain("PONTE");
  });

  it("aceita os separadores que uma prova escreve", () => {
    comVocabulario();
    for (const sep of [", ", " - ", " · ", "; ", " e "]) {
      const t = ["R de Rato", "E de Elmo", "D de Dedo", "E de Eva"].join(sep);
      expect(saidas(t), sep).toContain("REDE");
    }
  });

  it("aceita `do` e `da` além de `de`", () => {
    comVocabulario();
    expect(saidas("C do Cavalo, A da Asa, S de Sapo, A de Anel")).toContain("CASA");
  });

  it("acento na letra ou na palavra não atrapalha", () => {
    comVocabulario();
    expect(saidas("L de Lâmpada, U de Última, A de Ácido, R de Régua")).toContain("LUAR");
  });

  /**
   * A ARMADILHA MEDIDA NO CORPUS.
   *
   * Em 262.364 tokens de prosa portuguesa, as 10 ocorrências acrofônicas são
   * TODAS armadilha do idioma: "é de expectativa", "e de espaços", "s de
   * silêncio" — porque `a`, `e` e `o` são palavras. A primeira versão tentava
   * recusar pela LETRA e matava "O de Ouro" junto; o que separa de verdade é a
   * ADJACÊNCIA, e o corpus tem **0 cadeias de 2 pares seguidos**.
   */
  it("as armadilhas do português não disparam", () => {
    comVocabulario();
    expect(saidas("é de expectativa, e de espaços, s de silêncio")).toHaveLength(0);
  });

  it("prosa corrida não dispara", () => {
    comVocabulario();
    expect(
      saidas("a resposta esta na praca da prefeitura de blumenau em santa catarina"),
    ).toHaveLength(0);
  });

  it("pares espalhados pelo texto não são cadeia", () => {
    comVocabulario();
    expect(
      saidas("P de Pipa. Muito texto no meio aqui. O de Ouro. Mais texto. N de Navio."),
    ).toHaveLength(0);
  });

  it("palavra que não começa pela letra quebra a cadeia — é o que se autoverifica", () => {
    comVocabulario();
    expect(saidas("P de Pipa, O de Zebra, N de Navio, T de Tatu")).toHaveLength(0);
  });

  it("menos de três pares não é cadeia", () => {
    comVocabulario();
    expect(saidas("C de Casa, A de Asa")).toHaveLength(0);
  });

  it("a saída tem de formar palavra real quando o vocabulário já carregou", () => {
    comVocabulario();
    // X-Y-Z-W não é palavra de nada.
    expect(saidas("X de Xadrez, Y de Yolanda, Z de Zebra, W de Wilson")).toHaveLength(0);
  });

  it("sem vocabulário emite com nota menor — calar seria pior que arriscar", () => {
    setWordSet(null);
    const r = dec.decode("P de Pipa, O de Ouro, N de Navio, T de Tatu, E de Estrela", ctx);
    expect(r).toHaveLength(1);
    expect(r[0].forcedScore).toBeLessThan(0.88);
  });

  it("colhe a MAIOR corrida, não a primeira", () => {
    comVocabulario();
    // Duas cadeias no mesmo texto: a de 4 pares ganha da de 3.
    expect(
      saidas("M de Mar, E de Eco, L de Lua. Fim. R de Rato, E de Elmo, D de Dedo, E de Eva"),
    ).toContain("REDE");
  });
});
