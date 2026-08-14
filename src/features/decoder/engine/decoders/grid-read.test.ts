import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as gridRead } from "./grid-read";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const run = (input: string) => gridRead.decode(input, ctx);
const outs = (input: string) => run(input).map((c) => c.output);

// Âncora do acervo: GIA-15 "Padrão" (gia-2026/gia-15-padrao/texto/enunciado.md).
// A grade vem colada como tabela markdown, exatamente assim.
const GIA15_MD = `| P | C | R | S | R | V | S | A |
|---|---|---|---|---|---|---|---|
| V | N | G | M | O | E | E | U |
| E | D | C | O | M | A | T | I |
| A | F | O | O | M | R | A | S |
| P | U | H | R | R | A | A | O |
| E | E | M | R | C | U | T | O |
| P | E | O | F | R | R | M | D |
| A | E | C | V | A | R | M | R |`;

const GIA15_CONTIGUO = [
  "PCRSRVSA",
  "VNGMOEEU",
  "EDCOMATI",
  "AFOOMRAS",
  "PUHRRAAO",
  "EEMRCUTO",
  "PEOFRRMD",
  "AECVARMR",
].join("\n");

const GIA15_ESPACADO = GIA15_CONTIGUO.split("\n")
  .map((l) => [...l].join(" "))
  .join("\n");

// O anel externo (28 = 4 braços × 7) é a mensagem; os anéis internos da grade
// original são enchimento e saem como ruído depois dela.
const ANEL_EXTERNO = "PARACUMPRIRESSAPROVAVOCESDEV";

describe("Leitura de grade — âncora GIA-15", () => {
  it("quatro braços dos cantos revelam o anel externo (tabela markdown)", () => {
    const melhor = run(GIA15_MD)[0];
    expect(melhor.output.startsWith(ANEL_EXTERNO)).toBe(true);
    expect(melhor.label).toContain("quatro braços");
  });

  it("mesma leitura na colagem contígua e na separada por espaço", () => {
    expect(run(GIA15_CONTIGUO)[0].output.startsWith(ANEL_EXTERNO)).toBe(true);
    expect(run(GIA15_ESPACADO)[0].output.startsWith(ANEL_EXTERNO)).toBe(true);
  });

  it("nenhum outro caminho encontra a mensagem (a espiral ingênua devolve lixo)", () => {
    const outros = run(GIA15_MD).filter((c) => c.label !== "quatro braços (dos cantos)");
    for (const c of outros) expect(c.output).not.toContain("PARACUMPRIR");
  });
});

describe("Leitura de grade — outros caminhos", () => {
  // Caso CANÔNICO (não é do acervo): grade montada à mão para a serpentina.
  it("serpentina por linhas lê o bustrofédon", () => {
    expect(outs("PARA\nNAUQ\nDOSE")).toContain("PARAQUANDOSE");
  });

  // Caso CANÔNICO (não é do acervo): coluna 0 desce, coluna 1 sobe, coluna 2 desce.
  it("serpentina por colunas lê coluna a coluna", () => {
    expect(outs("PUE\nAQD\nRAA")).toContain("PARAQUEDA");
  });
});

describe("Leitura de grade — porta de entrada", () => {
  it("exige pelo menos 3 linhas", () => {
    expect(outs("ABC\nDEF")).toEqual([]);
  });

  it("exige largura uniforme", () => {
    expect(outs("ABC\nDEFG\nHIJ")).toEqual([]);
  });

  it("exige um caractere por célula", () => {
    expect(outs("AB CD EF\nGH IJ KL\nMN OP QR")).toEqual([]);
    expect(outs("| AB | C | D |\n| E | F | G |\n| H | I | J |")).toEqual([]);
  });

  it("exige pelo menos 3 colunas e ignora prosa", () => {
    expect(outs("AB\nCD\nEF")).toEqual([]);
    expect(outs("procure o padrao\nnesta grade aqui\ne entregue tudo")).toEqual([]);
  });
});
