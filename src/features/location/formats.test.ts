import { beforeAll, describe, expect, it } from "vitest";
import {
  decodeGeohash,
  decodeMaidenhead,
  decodePlusCode,
  decodeQuadkey,
  detectLocation,
  detectWhat3Words,
  parseDD,
  parseDDM,
  parseDMS,
  parseGeoHex,
  parseGeoHexBlumenau,
  parseH3,
  parseUTM,
  prepararDeteccao,
} from "./formats";

// O `h3-js` (87 KB gzip, um quarto do chunk de entrada) passou a entrar sob
// demanda: `parseH3` devolve `null` até a lib chegar e dispara a carga. Em
// produção quem observa `aoCarregarH3` refaz a rodada; aqui basta esperar.
beforeAll(() => prepararDeteccao("89a835d5acbffff"));

// Todos os vetores abaixo representam o MESMO ponto (screenshot do conversor):
const LAT = -26.9906;
const LNG = -48.6356;
const near = (got: { lat: number; lng: number } | null, tol = 0.02) => {
  expect(got).not.toBeNull();
  expect(Math.abs((got as { lat: number }).lat - LAT)).toBeLessThan(tol);
  expect(Math.abs((got as { lng: number }).lng - LNG)).toBeLessThan(tol);
};

describe("parsers de coordenadas (mesmo ponto)", () => {
  it("DD", () => near(parseDD("-26.9906, -48.6356"), 0.0001));
  it("DMS", () => near(parseDMS(`26°59'26.2"S 48°38'08.2"W`), 0.001));
  it("DDM", () => near(parseDDM("26°59.436'S 48°38.136'W"), 0.001));
  it("Geohash", () => near(decodeGeohash("6gjqmq88k7k"), 0.001));
  it("Plus Code", () => near(decodePlusCode("585H2957+QQ6"), 0.005));
  it("UTM", () => near(parseUTM("22J 734643E 7012408N"), 0.01));
  it("Maidenhead", () => near(decodeMaidenhead("GG53qa32"), 0.02));
  it("Quadkey", () => near(decodeQuadkey("210311232332101222"), 0.01));
  it("H3", () => near(parseH3("89a835d5acbffff"), 0.02));
});

describe("GeoHex", () => {
  it("código completo decodifica perto de Blumenau", () => {
    const pt = parseGeoHex("Nb11458750330");
    expect(pt).not.toBeNull();
    expect((pt as { lat: number }).lat).toBeCloseTo(-26.9226, 2);
    expect((pt as { lng: number }).lng).toBeCloseTo(-49.1162, 2);
  });

  it("número puro vira código 'Nb…' quando cai em Blumenau", () => {
    const pt = parseGeoHexBlumenau("11458750330");
    expect(pt).not.toBeNull();
    expect((pt as { lat: number }).lat).toBeCloseTo(-26.9226, 2);
  });

  it("rejeita código inválido e cauda fora de Blumenau", () => {
    expect(parseGeoHex("Nb99999999999")).toBeNull(); // não casa o ida-e-volta
    expect(parseGeoHexBlumenau("88010500")).toBeNull(); // 'Nb88010500' cai na Bahia
    expect(parseGeoHex("hello")).toBeNull();
  });

  it("detectLocation identifica o formato GeoHex", () => {
    expect(detectLocation("Nb11458750330")?.format).toBe("GeoHex");
    expect(detectLocation("11458750330")?.format).toBe("GeoHex (Blumenau)");
  });
});

describe("detectLocation", () => {
  it("identifica o formato correto", () => {
    expect(detectLocation("-26.9906, -48.6356")?.format).toBe("Graus decimais (DD)");
    expect(detectLocation("585H2957+QQ6")?.format).toBe("Plus Code");
    expect(detectLocation("6gjqmq88k7k")?.format).toBe("Geohash");
    expect(detectLocation("210311232332101222")?.format).toBe("Quadkey");
    expect(detectLocation("89a835d5acbffff")?.format).toBe("H3");
  });
  it("não confunde texto comum, CEP nem ISBN", () => {
    expect(detectLocation("hello world")).toBeNull();
    expect(detectLocation("88010000")).toBeNull(); // CEP, não coordenada
    expect(detectLocation("9788575225639")).toBeNull(); // ISBN (sem "+" não é Plus Code)
  });
});

describe("detectWhat3Words", () => {
  it("reconhece 3 palavras (com ou sem ///)", () => {
    expect(detectWhat3Words("filled.count.soap")).toBe("filled.count.soap");
    expect(detectWhat3Words("///filled.count.soap")).toBe("filled.count.soap");
  });
  it("ignora o que não é endereço de 3 palavras", () => {
    expect(detectWhat3Words("filled.count")).toBeNull();
    expect(detectWhat3Words("-26.99, -48.63")).toBeNull();
  });
});
