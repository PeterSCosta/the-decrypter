import { describe, expect, it } from "vitest";
import { BLUMENAU, inBBox } from "./anchors";
import { detectLocation } from "./formats";
import { decodeGeoTude } from "./geotude";

describe("GeoTude (GeoCoding ###)", () => {
  it("GIA-27: 68130.89.91.15.12 marca a recepção da FURB Campus 2", () => {
    // Âncora do acervo (RESOLUCOES.md:903 / GIA-2026.md:196): o código do
    // enunciado. A coordenada é a que a API do serviço devolve para ele.
    const pt = decodeGeoTude("68130.89.91.15.12");
    expect(pt).toEqual({ lat: -26.8911, lng: -49.0848 });
    expect(inBBox(pt as { lat: number; lng: number }, BLUMENAU.bbox)).toBe(true);
  });

  it("exemplo da home do serviço: 53281.86.69.03", () => {
    expect(decodeGeoTude("53281.86.69.03")).toEqual({ lat: 3.14, lng: 101.693 });
  });

  it("devolve o CANTO da célula, não o centro", () => {
    // Pares zerados não deslocam nada: o ponto é a borda noroeste da célula do
    // exemplo acima. Se somássemos meia célula, daria 3.995 / 101.005.
    expect(decodeGeoTude("53281.00.00")).toEqual({ lat: 4, lng: 101 });
  });

  it("índice sem grupo pontuado não é coordenada", () => {
    expect(decodeGeoTude("68130")).toBeNull();
  });

  it("recusa o que só se parece com um código", () => {
    expect(decodeGeoTude("15586.77")).toBeNull(); // preço: um par só não basta
    expect(decodeGeoTude("2026.08.14")).toBeNull(); // data: ano de 4 díg. ⇒ lat > 90
    expect(decodeGeoTude("681.30.89")).toBeNull(); // índice curto demais
    expect(decodeGeoTude("68130.891.15")).toBeNull(); // grupo de 3 dígitos
    expect(decodeGeoTude("68130.89.91.15.12 furb")).toBeNull();
  });

  it("detectLocation reconhece o formato", () => {
    const loc = detectLocation("68130.89.91.15.12");
    expect(loc?.format).toBe("GeoTude");
    expect(loc?.lat).toBe(-26.8911);
    expect(loc?.lng).toBe(-49.0848);
  });
});
