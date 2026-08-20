import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { type ArticulacaoData, PARECE_FOLHA, buscarFolha } from "./articulacao";
import { decodeCartaIbge } from "./carta-ibge";

const DADOS: ArticulacaoData = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/data/articulacao-blumenau.json"), "utf8"),
);

describe("articulação municipal de Blumenau", () => {
  it("tem as duas escalas, com as contagens publicadas", () => {
    expect(DADOS.escalas["5000"]).toHaveLength(93);
    expect(DADOS.escalas["1000"]).toHaveLength(938);
  });

  it("resolve uma folha de 1:5.000", () => {
    const h = buscarFolha(DADOS, "SG-22-Z-B-IV-4-SE-D-IV");
    expect(h?.escala).toBe(5000);
    expect(h?.lat).toBeCloseTo(-26.948, 2);
    expect(h?.lng).toBeCloseTo(-49.016, 2);
  });

  it("resolve uma folha de 1:1.000", () => {
    expect(buscarFolha(DADOS, "SG-22-Z-B-IV-4-NE-F-I-2-D")?.escala).toBe(1000);
  });

  it("caixa e espaço não importam — a prova escreve como quiser", () => {
    expect(buscarFolha(DADOS, "sg-22-z-b-iv-4-se-d-iv")?.folha).toBe("SG-22-Z-B-IV-4-SE-D-IV");
    expect(buscarFolha(DADOS, "  SG-22-Z-B-IV-4-SE-D-IV  ")).toBeTruthy();
  });

  /**
   * O SILÊNCIO É O PONTO. O desdobramento municipal foi ESCOLHIDO pela
   * prefeitura, não deduzido — uma folha que não está na articulação publicada
   * não existe, e inventar um nome plausível seria o pior resultado possível.
   */
  it("folha fora da articulação não é deduzida — a bancada cala", () => {
    expect(buscarFolha(DADOS, "SG-22-Z-B-IV-4-SE-D-XX")).toBeNull();
    expect(buscarFolha(DADOS, "SG-22-Z-B-IV-4-SE-Z-I")).toBeNull();
  });

  it("sem a base carregada, devolve null em vez de erro", () => {
    expect(buscarFolha(null, "SG-22-Z-B-IV-4-SE-D-IV")).toBeNull();
  });

  it("a data de geração viaja com o resultado — a articulação envelhece em silêncio", () => {
    expect(buscarFolha(DADOS, "SG-22-Z-B-IV-4-SE-D-IV")?.geradoEm).toBe(DADOS.generatedAt);
  });

  it("o tamanho da folha desce com a escala", () => {
    const g = buscarFolha(DADOS, "SG-22-Z-B-IV-4-SE-D-IV");
    const p = buscarFolha(DADOS, "SG-22-Z-B-IV-4-NE-F-I-2-D");
    expect(g && p && g.size[0] > p.size[0]).toBe(true);
  });
});

describe("o portão de forma", () => {
  it("aceita a nomenclatura estendida", () => {
    expect(PARECE_FOLHA.test("SG-22-Z-B-IV-4-SE-D-IV")).toBe(true);
    expect(PARECE_FOLHA.test("SG-22-Z-B-IV-4-NE-F-I-2-D")).toBe(true);
  });

  it("recusa o que já é da carta NACIONAL — aquilo o `carta-ibge` calcula", () => {
    expect(PARECE_FOLHA.test("SG-22")).toBe(false);
    expect(PARECE_FOLHA.test("SG-22-Z-B")).toBe(false);
  });

  it("recusa o que não é folha nenhuma", () => {
    for (const s of ["89010000", "A resposta esta na praca", "-26.9194, -49.0661"]) {
      expect(PARECE_FOLHA.test(s), s).toBe(false);
    }
  });
});

describe("os dois níveis convivem", () => {
  /**
   * O nacional continua sendo CALCULADO e não passa pela articulação. Se este
   * teste quebrar, alguém fez o municipal engolir o nacional.
   */
  it("a carta nacional segue resolvendo sem consultar dado nenhum", () => {
    for (const [folha, escala] of [
      ["SG-22", 1_000_000],
      ["SG-22-Z-B", 250_000],
      ["SG-22-Z-B-VI-1-NE", 25_000],
    ] as const) {
      expect(decodeCartaIbge(folha)?.scale, folha).toBe(escala);
    }
  });
});
