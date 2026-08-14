import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as letterIndex } from "./letter-index";

const ctx = (key: string): DecodeContext => ({ key, streets: null, ceps: null });
const decode = (input: string, key: string) => letterIndex.decode(input, ctx(key));
const first = (input: string, key: string) => decode(input, key)[0];

describe("letra por posição (letter-index)", () => {
  it("GIA-29 Romanos: 6 imperadores + I V II IV IV III → LOUROS", () => {
    const bustos = [
      "Lucius Verus",
      "Commodus",
      "Augustus",
      "Hadrian",
      "Antoninus Pius",
      "Vespasian",
    ].join("\n");
    const c = first(bustos, "I V II IV IV III");
    expect(c.output.toUpperCase()).toBe("LOUROS");
    expect(c.label).toBe("zip: 6 fontes × 6 índices");
    expect(c.forcedScore).toBe(0.6);
  });

  it("GIA-34 CRJA: 13 candidatos × 13 índices → TITULOELEITOR", () => {
    // RESOLUCOES.md:993 — fecha só ignorando espaços e sem tirar o acento.
    const candidatos = [
      "Stênio",
      "Ismael",
      "ivan naatz",
      "ana paula",
      "wilson",
      "valmor",
      "rosane",
      "dalirio",
      "decio",
      "osni",
      "odair t",
      "vilson",
      "dari",
    ].join("\n");
    const c = first(candidatos, "2 1 8 6 3 5 6 3 2 4 6 5 3");
    expect(c.output.toUpperCase()).toBe("TITULOELEITOR");
  });

  it("GIA-05 E Agora: 'Capitão Caverna' com a chave 10 → V", () => {
    const c = first("Capitão Caverna", "10");
    expect(c.output).toBe("v");
    expect(c.notes).toContain("[10]=v");
  });

  it("GIA-30 Sinfonia: 6 músicas + chave 5 oferecem a leitura do fim (TEATRO)", () => {
    const musicas = [
      "Questão de Tempo",
      "Agora Eu Sei",
      "Siga o Som",
      "O Chamado da Montanha",
      "A Espada e o Dragão",
      "Plantar, Colher",
    ].join("\n");
    const saidas = decode(musicas, "5").map((c) => c.output.toUpperCase());
    expect(saidas).toContain("TEATRO"); // "5ª letra de trás para frente"
    // Chave "-5" pede a direção explicitamente: aí só sai a leitura do fim.
    const explicita = decode(musicas, "-5");
    expect(explicita).toHaveLength(1);
    expect(explicita[0].output.toUpperCase()).toBe("TEATRO");
  });

  it("aceita o par artigo→letra (GIA-35, mecânica canônica)", () => {
    const artigos = ["Do nome e da sede", "Dos associados", "Da diretoria"].join("\n");
    const c = first(artigos, "A2L3 A1L1");
    expect(c.output).toBe("sD");
    expect(c.label).toBe("pares fonte → letra");
  });

  it("índice que não acha letra derruba o cartão inteiro", () => {
    // 3ª fonte tem 2 letras: leitura errada, não resposta parcial.
    expect(decode("alfa\nbeta\noi", "4 4 4")).toEqual([]);
  });
});

describe("porta de entrada (ruído zero no fan-out)", () => {
  it("sem chave, ou com chave de texto, o decoder não existe", () => {
    const texto = "Lucius Verus\nCommodus";
    expect(decode(texto, "")).toEqual([]);
    expect(decode(texto, "LIMA")).toEqual([]);
    expect(decode(texto, "chave secreta")).toEqual([]);
    expect(decode(texto, "3 abc")).toEqual([]); // tudo-ou-nada: um lixo reprova a chave
  });

  it("chave romana válida mas grande demais não vira cartão", () => {
    expect(decode("Commodus\nAugustus", "MIX")).toEqual([]); // 1009
  });

  it("entrada vazia não produz nada", () => {
    expect(decode("   \n  ", "1 2")).toEqual([]);
  });
});
