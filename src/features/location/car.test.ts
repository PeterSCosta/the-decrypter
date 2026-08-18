import { describe, expect, it } from "vitest";
import { decodeCar, dvIbge, geocodigoIbgeValido } from "./car";

describe("dígito verificador do IBGE", () => {
  it("fecha nos municípios conhecidos", () => {
    for (const c of ["4202404", "4208203", "4208302", "3550308", "4205407"])
      expect(geocodigoIbgeValido(c), c).toBe(true);
  });
  it("recusa dígito trocado", () => {
    expect(geocodigoIbgeValido("4202405")).toBe(false);
  });
  it("mas NÃO pega município trocado — e é por isso que existe a tabela", () => {
    // Itajaí e Itapema são os dois DV-válidos. Um levantamento já confundiu os
    // dois, e o DV não acusou.
    expect(geocodigoIbgeValido("4208203")).toBe(true);
    expect(geocodigoIbgeValido("4208302")).toBe(true);
  });
  it("o cálculo soma os ALGARISMOS do produto, não o produto", () => {
    expect(dvIbge("420240")).toBe(4);
  });
});

describe("CAR", () => {
  const bom = "SC-4202404-D9ADE9A8B4C24E5FA0F3B1C2D3E4F5A6";
  it("aceita o formato inteiro", () => {
    const r = decodeCar(bom);
    expect(r).toEqual({ uf: "SC", ibge: "4202404", imovel: "D9ADE9A8B4C24E5FA0F3B1C2D3E4F5A6" });
  });
  it("a UF escrita tem de bater com a que o geocódigo declara", () => {
    // 42 é SC; dizer PR aqui é número montado.
    expect(decodeCar("PR-4202404-D9ADE9A8B4C24E5FA0F3B1C2D3E4F5A6")).toBeNull();
  });
  it("DV errado não passa", () => {
    expect(decodeCar("SC-4202405-D9ADE9A8B4C24E5FA0F3B1C2D3E4F5A6")).toBeNull();
  });
  it("32 hex exatos", () => {
    expect(decodeCar("SC-4202404-D9ADE9A8B4C24E5FA0F3B1C2D3E4F5")).toBeNull();
    expect(decodeCar("SC-4202404-D9ADE9A8B4C24E5FA0F3B1C2D3E4F5A6B7")).toBeNull();
  });
});
