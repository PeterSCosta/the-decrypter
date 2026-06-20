import { describe, expect, it } from "vitest";
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
  parseH3,
  parseUTM,
} from "./formats";

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
