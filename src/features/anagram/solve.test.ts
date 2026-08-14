import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { StreetsData } from "@/features/street-guide/types";
import { beforeAll, describe, expect, it } from "vitest";
import { type AnagramIndex, anagramKey, buildIndex, solve, solveAll, solveAnagram } from "./solve";
import { streetVocabulary } from "./sources";

const dataFile = (name: string) => resolve(__dirname, "../../../public/data", name);
const pairs = (hits: { words: string[]; leftover: string }[]) =>
  hits.filter((h) => h.words.length === 2).map((h) => h.words);

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

describe("duas palavras", () => {
  const idx = buildIndex(["um", "mapa", "puma", "ama", "mau", "pa"]);

  it("não sai sem o portão aberto", () => {
    expect(solve(idx, "ummapa")).toEqual([]);
  });

  it("divide a entrada em duas palavras do dicionário", () => {
    expect(pairs(solve(idx, "ummapa", { twoWords: true }))).toContainEqual(["um", "mapa"]);
  });

  it("lista o par uma vez só, com a palavra curta na frente", () => {
    const found = pairs(solve(idx, "ummapa", { twoWords: true }));
    expect(found.filter((p) => p.join(" ") === "um mapa")).toHaveLength(1);
    expect(found.some((p) => p.join(" ") === "mapa um")).toBe(false);
  });

  it("recusa o par de dois monossílabos (ruído puro)", () => {
    const dupla = buildIndex(["um", "pa"]);
    expect(solve(dupla, "umpa", { twoWords: true })).toEqual([]);
  });
});

describe("sobra de letras", () => {
  const idx = buildIndex(["mapa", "um", "amor", "roma"]);

  it("diz QUAL letra sobrou, não só que sobrou", () => {
    const hits = solve(idx, "mapaz", { maxLeftover: 1 });
    expect(hits).toContainEqual({ words: ["mapa"], leftover: "z" });
  });

  it("acumula até duas letras e devolve as duas", () => {
    const hits = solve(idx, "mapazk", { maxLeftover: 2 });
    expect(hits).toContainEqual({ words: ["mapa"], leftover: "kz" });
  });

  it("respeita o teto: 3 letras sobrando não é resposta", () => {
    expect(solve(idx, "mapazkw", { maxLeftover: 2 })).toEqual([]);
  });

  it("ordena o exato antes do que tem sobra", () => {
    const hits = solve(idx, "romaz", { maxLeftover: 2, twoWords: true });
    expect(hits[0].leftover.length).toBeLessThanOrEqual(hits[hits.length - 1].leftover.length);
  });

  it("combina sobra com duas palavras", () => {
    const hits = solve(idx, "ummapaz", { maxLeftover: 1, twoWords: true });
    expect(hits).toContainEqual({ words: ["um", "mapa"], leftover: "z" });
  });
});

describe("ruas e bairros de Blumenau", () => {
  it("indexa bairro, nome inteiro e cada termo do nome", () => {
    const data = {
      source: "t",
      generatedAt: "t",
      count: 1,
      rows: [
        {
          codigo: 1,
          tipo: "R",
          nome: "SETE DE SETEMBRO",
          bairroNum: 1,
          bairro: "Itoupava Seca",
          numLei: null,
          dataLei: null,
          localizacao: "",
          ext: null,
          larg: null,
          atas: "",
        },
      ],
    } satisfies StreetsData;
    const vocab = streetVocabulary(data);
    expect(vocab).toContain("Itoupava Seca");
    expect(vocab).toContain("SETE DE SETEMBRO");
    expect(vocab).toContain("SETEMBRO");
    expect(vocab).not.toContain("DE"); // conectivo de 2 letras não vira verbete
  });

  it("guarda uma grafia só quando o rol repete o nome em caixas diferentes", () => {
    const vocab = streetVocabulary({
      source: "t",
      generatedAt: "t",
      count: 0,
      rows: [
        { codigo: 1, tipo: "R", nome: "GARCIA", bairro: "Garcia" },
        { codigo: 2, tipo: "R", nome: "GARCIA", bairro: "Garcia" },
      ].map((r) => ({
        ...r,
        bairroNum: null,
        numLei: null,
        dataLei: null,
        localizacao: "",
        ext: null,
        larg: null,
        atas: "",
      })),
    });
    expect(vocab).toEqual(["Garcia"]);
  });

  it("resolve um bairro embaralhado com o vocabulário local", () => {
    const streets = JSON.parse(readFileSync(dataFile("streets.json"), "utf8")) as StreetsData;
    const idx = buildIndex(streetVocabulary(streets));
    // "Garcia" é bairro de Blumenau e não está na wordlist genérica.
    expect(solveAnagram(idx, "acrgai")).toEqual(["Garcia"]);
  });
});

// Âncoras verídicas do acervo (GIA 2026, RESOLUCOES.md) contra o dicionário real.
describe("acervo · dicionário pt real", () => {
  let idx: AnagramIndex;
  let buildMs = 0;

  beforeAll(() => {
    const words = readFileSync(dataFile("words-pt.txt"), "utf8").split("\n").filter(Boolean);
    const t0 = performance.now();
    idx = buildIndex(words);
    buildMs = performance.now() - t0;
  });

  it("GIA-13 · O Código Songi: SONGI → signo", () => {
    expect(solveAnagram(idx, "SONGI")).toContain("signo");
  });

  it("GIA-35 · Fogo de Chão: os 5 apelidos viram os fundadores", () => {
    expect(solveAnagram(idx, "Gino")).toContain("ingo");
    expect(solveAnagram(idx, "Torvi")).toContain("vitor");
    expect(solveAnagram(idx, "Toti")).toContain("tito");
    expect(solveAnagram(idx, "Erni")).toContain("neri");
    expect(solveAnagram(idx, "Giores")).toContain("sérgio");
  });

  it("GIA-18 · Arte sem Nome: as contagens montam UM MAPA", () => {
    const hits = solve(idx, "ummapa", { twoWords: true });
    expect(pairs(hits)).toContainEqual(["um", "mapa"]);
    expect(hits.every((h) => h.leftover === "")).toBe(true);
  });

  // "Anagrama com letra sobrando" é variação prevista no DICIONARIO-CIFRAS (A6):
  // a letra que sobra é a resposta, então ela tem de vencer o par que usa tudo.
  it("a palavra inteira com uma letra sobrando vem antes do par que usa tudo", () => {
    const hits = solve(idx, "signoz", { maxLeftover: 2, twoWords: true });
    const iSigno = hits.findIndex((h) => h.words[0] === "signo" && h.leftover === "z");
    const iPar = hits.findIndex((h) => h.words.length === 2);
    expect(iSigno).toBeGreaterThanOrEqual(0);
    expect(iSigno).toBeLessThan(iPar);
  });

  it("avisa quando a lista sai incompleta (e não avisa quando está inteira)", () => {
    expect(solveAll(idx, "ummapa", { twoWords: true }).truncated).toBe(false);
    // 17 letras comuns têm dezenas de milhares de divisões: a busca desiste.
    expect(solveAll(idx, "aaeeiioosrtnmlcup", { twoWords: true, maxLeftover: 2 }).truncated).toBe(
      true,
    );
  });

  it("aguenta a digitação: o par sai em poucos milissegundos", () => {
    const casos = ["ummapa", "umbicicleta", "fogodechaoblumenau"];
    for (const caso of casos) {
      const t0 = performance.now();
      const hits = solve(idx, caso, { twoWords: true, maxLeftover: 2 });
      const ms = performance.now() - t0;
      console.log(
        `[bench] "${caso}" (${anagramKey(caso).length} letras): ${ms.toFixed(1)} ms, ${hits.length} hits`,
      );
      // Folga alta de propósito: o que se mede é "não trava a digitação".
      expect(ms).toBeLessThan(400);
    }
    console.log(`[bench] buildIndex(259220 palavras): ${buildMs.toFixed(0)} ms`);
  });
});
