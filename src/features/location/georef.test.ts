import { describe, expect, it } from "vitest";
import { BLUMENAU, ITAJAI, inBBox } from "./anchors";
import { detectLocation } from "./formats";
import { decodeGeoref, decodeGeorefLocal, parseGeoref } from "./georef";

/**
 * Âncoras conferidas com a pygeodesy (`wgrs.Georef`): Georef(-26.9194,-49.0661)
 * = 'JELD5604' e Georef('JELD5604').latlon = (-26.925, -49.058333) — o centro da
 * célula de 1 minuto. A conta manual pela especificação bateu dígito a dígito
 * antes de rodar a lib.
 */
describe("GEOREF", () => {
  it("Blumenau: JELD5604 → centro da célula de 1' (-26.925, -49.058333)", () => {
    const pt = parseGeoref("JELD5604");
    expect(pt?.lat).toBeCloseTo(-26.925, 6);
    expect(pt?.lng).toBeCloseTo(-49.058333, 6);
    expect(pt && inBBox(pt, BLUMENAU.bbox)).toBe(true);
  });

  it("Itajaí: JEMD2005 cai dentro da cidade", () => {
    const pt = parseGeoref("JEMD2005");
    expect(pt && inBBox(pt, ITAJAI.bbox)).toBe(true);
  });

  it("a ordem é longitude ANTES de latitude — trocar joga o ponto longe", () => {
    // 'JELD' invertido em 'LDJE' sairia de Santa Catarina; é a pegadinha do
    // formato, e o teste existe para travar a convenção.
    const certo = parseGeoref("JELD5604");
    const trocado = parseGeoref("LDJE0456");
    expect(certo).not.toEqual(trocado);
    expect(Math.abs((trocado as { lng: number }).lng - -49.06)).toBeGreaterThan(10);
  });

  it("mais dígitos = célula menor, sempre contendo o ponto", () => {
    const alvo = { lat: -26.9194, lng: -49.0661 };
    for (const [code, minutos] of [
      ["JELD5604", 1],
      ["JELD560048", 0.1],
    ] as [string, number][]) {
      const pt = parseGeoref(code);
      expect(pt, code).not.toBeNull();
      const grau = minutos / 60;
      expect(Math.abs((pt as { lat: number }).lat - alvo.lat), code).toBeLessThan(grau);
      expect(Math.abs((pt as { lng: number }).lng - alvo.lng), code).toBeLessThan(grau);
    }
  });

  it("expõe a precisão em dígitos por eixo", () => {
    expect(decodeGeoref("JELD5604")?.perAxis).toBe(2);
    expect(decodeGeoref("JELD560048")?.perAxis).toBe(3);
  });

  describe("gate anti-ruído", () => {
    it("exige dígitos: 4 letras sozinhas seriam palavra ('REDE' é GEOREF válido)", () => {
      expect(parseGeoref("REDE")).toBeNull();
      expect(parseGeoref("JELD")).toBeNull();
    });

    it("recusa letra fora do alfabeto de 24 e célula fora de faixa", () => {
      expect(parseGeoref("JOLD5604")).toBeNull(); // O não existe
      expect(parseGeoref("JILD5604")).toBeNull(); // I não existe
      expect(parseGeoref("JZLD5604")).toBeNull(); // 2ª letra > 12ª célula de 15°
      expect(parseGeoref("JELZ5604")).toBeNull(); // 4ª letra > 15° dentro da célula
      expect(parseGeoref("JESD5604")).toBeNull(); // 3ª letra idem
    });

    it("recusa minutos ≥ 60 e contagem ímpar de dígitos", () => {
      expect(parseGeoref("JELD6004")).toBeNull();
      expect(parseGeoref("JELD5660")).toBeNull();
      expect(parseGeoref("JELD560")).toBeNull();
      expect(parseGeoref("JELD56")).toBeNull(); // 1 dígito por eixo não é minuto
    });

    it("não dispara em CEP, CPF, telefone, coordenada, data, Base64 nem prosa", () => {
      for (const s of [
        "89010000",
        "111.444.777-35",
        "4732313000",
        "-26.9194, -49.0661",
        "2026-08-14",
        "SGVsbG8gbXVuZG8=",
        "ENGENHEIRO FORAGIDO",
        "GG53qa32",
      ]) {
        expect(parseGeoref(s), s).toBeNull();
      }
    });

    it("minúscula não é GEOREF (protege o Geohash)", () => {
      expect(parseGeoref("jeld5604")).toBeNull();
    });
  });

  describe("atalho de cauda (sem a célula de 15° 'JE')", () => {
    it("LD5604 volta para Blumenau; MD2005 para Itajaí", () => {
      expect(decodeGeorefLocal("LD5604") && true).toBe(true);
      const blu = decodeGeorefLocal("LD5604");
      expect(blu && inBBox(blu, BLUMENAU.bbox)).toBe(true);
      const ita = decodeGeorefLocal("MD2005");
      expect(ita && inBBox(ita, ITAJAI.bbox)).toBe(true);
    });

    it("cauda que não cai no Vale é recusada", () => {
      expect(decodeGeorefLocal("AA0000")).toBeNull();
      expect(decodeGeorefLocal("LD0000")).toBeNull();
    });
  });

  it("detectLocation nomeia o formato", () => {
    expect(detectLocation("JELD5604")?.format).toBe("GEOREF");
    expect(detectLocation("LD5604")?.format).toBe("GEOREF · assumindo Blumenau");
  });
});
