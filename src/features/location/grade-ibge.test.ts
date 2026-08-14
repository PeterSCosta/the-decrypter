import { describe, expect, it } from "vitest";
import { BLUMENAU, ITAJAI, inBBox } from "./anchors";
import { detectLocation } from "./formats";
import {
  albersToLatLng,
  decodeGradeIbge,
  gradeCellLabel,
  latLngToAlbers,
  parseGradeIbge,
} from "./grade-ibge";

/**
 * Âncoras conferidas com pyproj usando os parâmetros oficiais do IBGE
 * (`+proj=aea +lat_0=-12 +lon_0=-54 +lat_1=-2 +lat_2=-22 +x_0=5000000
 * +y_0=10000000 +ellps=GRS80`): Blumenau projeta em E=5.499.937,6 /
 * N=8.337.528,3 e Itajaí em E=5.540.923,4 / N=8.338.035,9.
 */
describe("Albers equivalente do IBGE (SIRGAS 2000)", () => {
  it("projeta Blumenau e Itajaí nos valores conferidos com o pyproj", () => {
    const blu = latLngToAlbers(BLUMENAU.lat, BLUMENAU.lng);
    expect(blu.x).toBeCloseTo(5_499_937.6, 1);
    expect(blu.y).toBeCloseTo(8_337_528.3, 1);
    const ita = latLngToAlbers(ITAJAI.lat, ITAJAI.lng);
    expect(ita.x).toBeCloseTo(5_540_923.4, 1);
    expect(ita.y).toBeCloseTo(8_338_035.9, 1);
  });

  it("a volta é exata (ida-e-volta no milímetro de grau)", () => {
    for (const p of [BLUMENAU, ITAJAI, { lat: -12, lng: -54 }, { lat: -2, lng: -70 }]) {
      const { x, y } = latLngToAlbers(p.lat, p.lng);
      const back = albersToLatLng(x, y);
      expect(back?.lat, `${p.lat}`).toBeCloseTo(p.lat, 9);
      expect(back?.lng, `${p.lng}`).toBeCloseTo(p.lng, 9);
    }
  });
});

describe("grade estatística do IBGE", () => {
  it("1KME5499000N8337000 é a célula de 1 km que contém Blumenau", () => {
    const hit = decodeGradeIbge("1KME5499000N8337000");
    expect(hit).not.toBeNull();
    expect(hit?.cell).toBe(1000);
    expect(hit && inBBox(hit, BLUMENAU.bbox)).toBe(true);
    // o centro devolvido fica a menos de meia diagonal da célula do ponto real
    const { x, y } = latLngToAlbers(BLUMENAU.lat, BLUMENAU.lng);
    expect(Math.abs(x - (hit as { x: number }).x)).toBeLessThan(1000);
    expect(Math.abs(y - (hit as { y: number }).y)).toBeLessThan(1000);
  });

  it("aceita a forma curta em quilômetros (wiki do OSM) e a longa em metros", () => {
    expect(parseGradeIbge("1KME5499N8337")).toEqual(parseGradeIbge("1KME5499000N8337000"));
    expect(parseGradeIbge("1KM_E5499000N8337000")).toEqual(parseGradeIbge("1KME5499000N8337000"));
  });

  it("Itajaí: 1KME5540N8338", () => {
    const hit = decodeGradeIbge("1KME5540N8338");
    expect(hit && inBBox(hit, ITAJAI.bbox)).toBe(true);
  });

  it("o identificador é o canto SUDOESTE: truncar a coordenada reproduz o código", () => {
    // é a convenção assumida, e o que os números conferidos mostram —
    // E=5.499.937,6 truncado a 1 km dá 5.499.000, não 5.500.000.
    const { x, y } = latLngToAlbers(BLUMENAU.lat, BLUMENAU.lng);
    expect(Math.floor(x / 1000)).toBe(5499);
    expect(Math.floor(y / 1000)).toBe(8337);
    const hit = decodeGradeIbge("1KME5499000N8337000");
    expect(hit?.x).toBe(5_499_000);
    expect(hit?.y).toBe(8_337_000);
  });

  it("célula maior contém a menor", () => {
    const km1 = decodeGradeIbge("1KME5499N8337") as { lat: number; lng: number };
    const km10 = decodeGradeIbge("10KME5490N8330") as { lat: number; lng: number };
    expect(km10).not.toBeNull();
    expect(Math.abs(km10.lat - km1.lat)).toBeLessThan(0.1);
    expect(decodeGradeIbge("200ME5499800N8337400")?.cell).toBe(200);
  });

  describe("gate anti-ruído", () => {
    it("o prefixo de tamanho é obrigatório e fechado", () => {
      expect(parseGradeIbge("E5499000N8337000")).toBeNull();
      expect(parseGradeIbge("2KME5499000N8337000")).toBeNull();
      expect(parseGradeIbge("1KM5499000N8337000")).toBeNull();
    });

    it("recusa o que cai fora da área de abrangência declarada pelo IBGE", () => {
      expect(parseGradeIbge("1KME0100N8337")).toBeNull(); // E abaixo de 2.800.000
      expect(parseGradeIbge("1KME5499N1000")).toBeNull(); // N abaixo de 7.350.000
      expect(parseGradeIbge("1KME9999N8337")).toBeNull(); // E acima de 8.210.000
    });

    it("não dispara em CEP, CPF, telefone, coordenada, data, Base64 nem prosa", () => {
      for (const s of [
        "89010000",
        "111.444.777-35",
        "4732313000",
        "-26.9194, -49.0661",
        "2026-08-14",
        "SGVsbG8gbXVuZG8=",
        "GRADE ESTATISTICA",
        "1KM",
      ]) {
        expect(parseGradeIbge(s), s).toBeNull();
      }
    });
  });

  it("detectLocation nomeia o formato com o tamanho da célula", () => {
    expect(detectLocation("1KME5499000N8337000")?.format).toBe(
      "Grade estatística IBGE · célula de 1 km",
    );
    expect(detectLocation("200ME5499800N8337400")?.format).toBe(
      "Grade estatística IBGE · célula de 200 m",
    );
  });

  it("gradeCellLabel", () => {
    expect(gradeCellLabel(200)).toBe("200 m");
    expect(gradeCellLabel(1000)).toBe("1 km");
    expect(gradeCellLabel(100_000)).toBe("100 km");
  });
});
