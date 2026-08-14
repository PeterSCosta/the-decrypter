import { describe, expect, it } from "vitest";
import { BLUMENAU, ITAJAI, inBBox } from "./anchors";
import { detectLocation } from "./formats";
import { decodeMgrs, decodeMgrsLocal, parseMgrs } from "./mgrs";

/**
 * Âncoras conferidas em DUAS implementações independentes: o CGI GeoConvert do
 * GeographicLib e o pacote npm `mgrs` devolvem a mesma string para as duas
 * cidades, e `mgrs.toPoint()` volta em -49.06610 / -26.91940.
 */
const near = (got: { lat: number; lng: number } | null, lat: number, lng: number, tol = 0.001) => {
  expect(got).not.toBeNull();
  expect((got as { lat: number }).lat).toBeCloseTo(lat, 3);
  expect((got as { lng: number }).lng).toBeCloseTo(lng, 3);
  expect(Math.abs((got as { lat: number }).lat - lat)).toBeLessThan(tol);
};

describe("MGRS / USNG", () => {
  it("Blumenau: 22JFR9203021024 → -26.9194, -49.0661", () => {
    near(parseMgrs("22JFR9203021024"), -26.9194, -49.0661);
  });

  it("Itajaí: 22JGR3221221631 → -26.9078, -48.6618", () => {
    near(parseMgrs("22JGR3221221631"), -26.9078, -48.6618);
  });

  it("cada precisão contém o ponto de 1 m (célula encolhendo)", () => {
    const codes: [string, number][] = [
      ["22JFR92", 10_000],
      ["22JFR9221", 1_000],
      ["22JFR920210", 100],
      ["22JFR92032102", 10],
      ["22JFR9203021024", 1],
    ];
    for (const [code, meters] of codes) {
      const pt = parseMgrs(code);
      expect(pt, code).not.toBeNull();
      // o centro da célula não pode estar a mais de meia diagonal do ponto real
      const dLat = Math.abs((pt as { lat: number }).lat - -26.9194) * 111_320;
      const dLng = Math.abs((pt as { lng: number }).lng - -49.0661) * 99_200;
      expect(Math.max(dLat, dLng), code).toBeLessThanOrEqual(meters / 2 + 1);
    }
  });

  it("o deslocamento de +5 linhas do fuso PAR está aplicado", () => {
    const hit = decodeMgrs("22JFR9203021024");
    expect(hit?.parts).toEqual({ zone: 22, band: "J", square: "FR", digits: 5 });
    // O northing de Blumenau (7.021.024) cai na 11ª faixa de 100 km, que SEM o
    // deslocamento seria a letra "L". Como o fuso 22 é par, a letra correta é a
    // 11ª + 5 = "R" — e é a que as duas implementações de referência emitiram.
    // Logo "22JFL…" tem de cair ~500 km ao sul, não em Blumenau.
    const shifted = parseMgrs("22JFL9203021024");
    expect(shifted).not.toBeNull();
    expect((shifted as { lat: number }).lat).toBeLessThan(-31);
  });

  it("espaços entre os grupos são tolerados", () => {
    expect(parseMgrs("22J FR 92030 21024")).toEqual(parseMgrs("22JFR9203021024"));
  });

  describe("gate anti-ruído", () => {
    it("recusa coluna que não existe no fuso", () => {
      // fuso 6 usa o conjunto S–Z: "J" como coluna é impossível
      expect(parseMgrs("6GJQ88")).toBeNull();
      // fuso 22 usa A–H: "J" idem
      expect(parseMgrs("22JJR9203021024")).toBeNull();
    });

    it("recusa minúscula — é o que protege o Geohash", () => {
      expect(parseMgrs("22jfr9203021024")).toBeNull();
      expect(detectLocation("6gjqmq88k7k")?.format).toBe("Geohash");
      expect(detectLocation("6gjng7rpj")?.format).toBe("Geohash");
    });

    it("recusa número ímpar de dígitos, banda e fuso inválidos", () => {
      expect(parseMgrs("22JFR920302102")).toBeNull(); // 9 dígitos
      expect(parseMgrs("22IFR9203021024")).toBeNull(); // banda I não existe
      expect(parseMgrs("00JFR9203021024")).toBeNull(); // fuso 0
      expect(parseMgrs("61JFR9203021024")).toBeNull(); // fuso 61
      expect(parseMgrs("22JFRW9203021024")).toBeNull(); // W não é letra de linha
    });

    it("não dispara em CEP, CPF, telefone, coordenada, data, Base64 nem prosa", () => {
      for (const s of [
        "89010000",
        "111.444.777-35",
        "47 3231-3000",
        "-26.9194, -49.0661",
        "2026-08-14",
        "SGVsbG8gbXVuZG8=",
        "O ENGENHEIRO FORAGIDO",
        "88010-000",
        "ABC1D23",
      ]) {
        expect(parseMgrs(s), s).toBeNull();
      }
    });
  });

  describe("atalho de cauda (sem o fuso 22J)", () => {
    it("FR9203021024 volta para Blumenau e GR3221221631 para Itajaí", () => {
      const blu = decodeMgrsLocal("FR9203021024");
      expect(blu && inBBox(blu, BLUMENAU.bbox)).toBe(true);
      const ita = decodeMgrsLocal("GR3221221631");
      expect(ita && inBBox(ita, ITAJAI.bbox)).toBe(true);
      expect(detectLocation("FR9203021024")?.format).toBe("MGRS/USNG (Blumenau)");
    });

    it("cauda que não cai no Vale é recusada (a caixa é o gate)", () => {
      expect(decodeMgrsLocal("AA1111111111")).toBeNull();
      expect(decodeMgrsLocal("FR1111111111")).toBeNull();
    });
  });
});
