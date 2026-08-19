import { describe, expect, it } from "vitest";
import { BLUMENAU, ITAJAI, inBBox } from "./anchors";
import { detectLocation, detectLocations } from "./formats";
import { decodeGars, parseGars } from "./gars";

/**
 * Âncoras conferidas com a pygeodesy (`gars.Garef`) nas três precisões:
 * Blumenau '262FG' / '262FG4' / '262FG49', Itajaí '263FG' / '263FG45', e
 * Garef('262FG49').latlon = (-26.958333, -49.041667). A conta manual pela
 * especificação da NGA foi feita antes e bateu.
 */
describe("GARS", () => {
  it("Blumenau: 262FG49 → centro da célula de 5' (-26.958333, -49.041667)", () => {
    const pt = parseGars("262FG49");
    expect(pt?.lat).toBeCloseTo(-26.958333, 6);
    expect(pt?.lng).toBeCloseTo(-49.041667, 6);
  });

  it("cada nível contém o ponto de Blumenau, encolhendo a célula", () => {
    const alvo = { lat: -26.9194, lng: -49.0661 };
    for (const [code, lado] of [
      ["262FG", 0.5],
      ["262FG4", 0.25],
      ["262FG49", 1 / 12],
    ] as [string, number][]) {
      const hit = decodeGars(code);
      expect(hit, code).not.toBeNull();
      expect(hit?.cell, code).toBeCloseTo(lado, 6);
      // o alvo tem de estar dentro da célula cujo centro foi devolvido
      expect(Math.abs((hit as { lat: number }).lat - alvo.lat), code).toBeLessThanOrEqual(lado / 2);
      expect(Math.abs((hit as { lng: number }).lng - alvo.lng), code).toBeLessThanOrEqual(lado / 2);
    }
  });

  it("Itajaí: 263FG45 cai dentro da cidade e 262FG49 dentro de Blumenau", () => {
    const ita = parseGars("263FG45");
    expect(ita && inBBox(ita, ITAJAI.bbox)).toBe(true);
    const blu = parseGars("262FG49");
    expect(blu && inBBox(blu, BLUMENAU.bbox)).toBe(true);
  });

  it("quadrante 1=NO 2=NE 3=SO 4=SE, a partir do canto NOROESTE", () => {
    const q = ["262FG1", "262FG2", "262FG3", "262FG4"].map((c) => decodeGars(c));
    const [no, ne, so, se] = q as { lat: number; lng: number }[];
    expect(no.lat).toBeGreaterThan(so.lat);
    expect(ne.lat).toBeGreaterThan(se.lat);
    expect(ne.lng).toBeGreaterThan(no.lng);
    expect(se.lng).toBeGreaterThan(so.lng);
    // os quatro somados devolvem o centro da célula de 30'
    const centro = decodeGars("262FG") as { lat: number; lng: number };
    expect((no.lat + so.lat) / 2).toBeCloseTo(centro.lat, 9);
    expect((no.lng + ne.lng) / 2).toBeCloseTo(centro.lng, 9);
  });

  it("a tecla 1..9 começa no canto NOROESTE, como teclado invertido", () => {
    const k1 = decodeGars("262FG41") as { lat: number; lng: number };
    const k9 = decodeGars("262FG49") as { lat: number; lng: number };
    expect(k1.lat).toBeGreaterThan(k9.lat); // 1 ao norte, 9 ao sul
    expect(k1.lng).toBeLessThan(k9.lng); // 1 a oeste, 9 a leste
    const k3 = decodeGars("262FG43") as { lat: number };
    expect(k3.lat).toBeCloseTo(k1.lat, 9); // 1,2,3 na mesma linha
  });

  describe("gate anti-ruído", () => {
    it("recusa faixa de longitude fora de 001–720 e latitude acima de 360", () => {
      expect(parseGars("000FG49")).toBeNull();
      expect(parseGars("721FG49")).toBeNull();
      expect(parseGars("262ZZ49")).toBeNull(); // faixa de latitude > 359
    });

    it("recusa I/O, tecla 0 e tecla sem quadrante", () => {
      expect(parseGars("262IG49")).toBeNull();
      expect(parseGars("262FO49")).toBeNull();
      expect(parseGars("262FG40")).toBeNull();
      expect(parseGars("262FG9")).toBeNull(); // 9 não é quadrante
    });

    it("minúscula não é GARS (protege o Geohash)", () => {
      expect(parseGars("262fg49")).toBeNull();
      // Continua sendo Geohash — mas hoje a cascata devolve TODAS as leituras,
      // e a cauda local (assumindo Blumenau) vem antes da global, porque numa
      // gincana do Vale ela é mais provável. As duas são Geohash.
      expect(detectLocation("262fg49")?.format).toContain("Geohash");
      const todas = detectLocations("262fg49").map((d) => d.format);
      expect(
        todas.some((f) => f === "Geohash"),
        "a leitura global sumiu",
      ).toBe(true);
    });

    it("não dispara em CEP, CPF, telefone, NCM, data nem prosa", () => {
      for (const s of [
        "89010000",
        "111.444.777-35",
        "4732313000",
        "8471.30.19",
        "2026-08-14",
        "CASA VERDE",
        "-26.9194, -49.0661",
      ]) {
        expect(parseGars(s), s).toBeNull();
      }
    });
  });

  it("detectLocation nomeia o formato com o tamanho da célula", () => {
    expect(detectLocation("262FG49")?.format).toBe("GARS · célula de 5'");
    expect(detectLocation("262FG4")?.format).toBe("GARS · célula de 15'");
    expect(detectLocation("262FG")?.format).toBe("GARS · célula de 30'");
  });
});
