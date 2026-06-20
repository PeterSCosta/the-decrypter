import type { CepsData } from "@/features/cep/types";
import type { StreetRow, StreetsData } from "@/features/street-guide/types";
import { describe, expect, it } from "vitest";
import { runDecoders } from "./run";
import type { DecodeContext } from "./types";

const streets: StreetsData = {
  source: "test",
  generatedAt: "2026-01-01",
  count: 1,
  rows: [
    {
      codigo: 3722,
      tipo: "R",
      nome: "ABACATE",
      bairroNum: 16,
      bairro: "Do Salto",
      numLei: 6416,
      dataLei: "09/02/2004",
      localizacao: "R. DAS TORRES, 45",
      ext: 135,
      larg: 8.4,
      atas: "",
    },
  ],
};

const ceps: CepsData = {
  source: "test",
  generatedAt: "2026-01-01",
  count: 1,
  municipios: ["Florianópolis"],
  rows: [["88010500", "Rua Teste", "Centro", 0, -27.5, -48.5]],
};

const ctx: DecodeContext = { key: "", streets, ceps };
const noData: DecodeContext = { key: "", streets: null, ceps: null };

describe("runDecoders", () => {
  it("ranks readable Base64 output at the top", () => {
    const { results } = runDecoders("SGVsbG8gbXVuZG8=", noData);
    expect(results[0].decoderId).toBe("base64");
    expect(results[0].output).toBe("Hello mundo");
  });

  it("resolves a Blumenau street código as a high-confidence lookup", () => {
    const { results } = runDecoders("3722", ctx);
    const hit = results.find((r) => r.decoderId === "street-code");
    expect(hit).toBeDefined();
    expect((hit?.data as StreetRow[])[0].nome).toBe("ABACATE");
    expect(hit?.score ?? 0).toBeGreaterThan(0.9);
  });

  it("resolves a Nº da Lei", () => {
    const { results } = runDecoders("6416", ctx);
    expect(results.some((r) => r.decoderId === "street-law")).toBe(true);
  });

  it("resolves a Data da Lei (date query)", () => {
    const hit = runDecoders("09/02/2004", ctx).results.find((r) => r.decoderId === "street-date");
    expect(hit).toBeDefined();
    expect((hit?.data as StreetRow[])[0].nome).toBe("ABACATE");
  });

  it("resolves an exact CEP (with dash)", () => {
    const { results } = runDecoders("88010-500", ctx);
    expect(results.some((r) => r.decoderId === "cep-exact")).toBe(true);
  });

  it("produces nothing for empty data lookups when datasets are absent", () => {
    const { results } = runDecoders("3722", noData);
    // Lookups que dependem de dataset (ruas/CEP/IBGE) ficam silenciosos sem dados.
    // `digit-count` é um lookup de tabela estática (não precisa de dataset) e pode aparecer.
    expect(results.some((r) => r.category === "lookup" && r.decoderId !== "digit-count")).toBe(
      false,
    );
  });
});
