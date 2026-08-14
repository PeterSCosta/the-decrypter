import { describe, expect, it } from "vitest";
import { BLUMENAU, ITAJAI } from "./anchors";
import { cartaScaleLabel, decodeCartaIbge, parseCartaIbge } from "./carta-ibge";
import { detectLocation } from "./formats";

/** O ponto está dentro da quadrícula cujo CENTRO foi devolvido? */
const contem = (code: string, alvo: { lat: number; lng: number }) => {
  const hit = decodeCartaIbge(code);
  expect(hit, code).not.toBeNull();
  const h = hit as NonNullable<typeof hit>;
  expect(Math.abs(h.lat - alvo.lat), `${code} lat`).toBeLessThanOrEqual(h.size[0] / 2);
  expect(Math.abs(h.lng - alvo.lng), `${code} lon`).toBeLessThanOrEqual(h.size[1] / 2);
  return h;
};

/**
 * Conferido ao contrário contra registro real do acervo IBGE: Mafra/SC sai
 * 'SG-22-Z-A-III-1', que é a nomenclatura publicada da folha "MAFRA
 * SG-22-Z-A-III-1 MI 2868-1"; e 'SG-22-Z-B' é a folha 1:250.000 Blumenau.
 */
const MAFRA = { lat: -26.1114, lng: -49.8054 };

describe("carta IBGE/DSG (articulação sistemática)", () => {
  it("SG-22-Z-B-IV-4-SE é a quadrícula de 7,5' que contém Blumenau", () => {
    const h = contem("SG-22-Z-B-IV-4-SE", BLUMENAU);
    expect(h.scale).toBe(25_000);
    // lat -27,000..-26,875 e lon -49,125..-49,000
    expect(h.lat).toBeCloseTo(-26.9375, 6);
    expect(h.lng).toBeCloseTo(-49.0625, 6);
    expect(h.size).toEqual([0.125, 0.125]);
  });

  it("SG-22-Z-B-V-4-SO é a de Itajaí", () => {
    const h = contem("SG-22-Z-B-V-4-SO", ITAJAI);
    expect(h.lat).toBeCloseTo(-26.9375, 6);
    expect(h.lng).toBeCloseTo(-48.6875, 6);
  });

  it("SG-22-Z-A-III-1 é a folha de Mafra (registro real do IBGE)", () => {
    const h = contem("SG-22-Z-A-III-1", MAFRA);
    expect(h.scale).toBe(50_000);
  });

  it("toda a cadeia de níveis contém o ponto (cada nível parte o anterior)", () => {
    const niveis: [string, number][] = [
      ["SG-22-Z", 500_000],
      ["SG-22-Z-B", 250_000],
      ["SG-22-Z-B-IV", 100_000],
      ["SG-22-Z-B-IV-4", 50_000],
      ["SG-22-Z-B-IV-4-SE", 25_000],
    ];
    let anterior = Number.POSITIVE_INFINITY;
    for (const [code, escala] of niveis) {
      const h = contem(code, BLUMENAU);
      expect(h.scale, code).toBe(escala);
      expect(h.size[0], code).toBeLessThan(anterior);
      anterior = h.size[0];
    }
  });

  it("o 1:100.000 é 3 colunas × 2 linhas (I..VI) — inverter erraria 30'", () => {
    // Blumenau é IV (linha de baixo, 1ª coluna) e Mafra é III (linha de cima,
    // 3ª coluna): as duas âncoras cobrem as duas linhas da numeração.
    const iv = decodeCartaIbge("SG-22-Z-B-IV") as { lat: number; lng: number };
    const i = decodeCartaIbge("SG-22-Z-B-I") as { lat: number; lng: number };
    const iii = decodeCartaIbge("SG-22-Z-B-III") as { lat: number; lng: number };
    expect(i.lat).toBeGreaterThan(iv.lat); // I acima de IV
    expect(i.lng).toBeCloseTo(iv.lng, 9); // mesma coluna
    expect(iii.lng).toBeGreaterThan(i.lng); // III mais a leste que I
    expect(iii.lat).toBeCloseTo(i.lat, 9); // mesma linha
  });

  it("o hemisfério pode ser omitido: dentro do Brasil assume-se Sul", () => {
    expect(parseCartaIbge("G-22-Z-B-IV-4-SE")).toEqual(parseCartaIbge("SG-22-Z-B-IV-4-SE"));
    expect(decodeCartaIbge("G-22-Z-B-IV-4-SE")?.sheet).toBe("SG-22-Z-B-IV-4-SE");
    // com N explícito, o mesmo código espelha para o hemisfério norte
    const norte = decodeCartaIbge("NG-22-Z-B-IV-4-SE");
    expect(norte?.lat).toBeGreaterThan(0);
  });

  describe("gate anti-ruído", () => {
    it("exige ao menos o nível 1:500.000 (V/X/Y/Z)", () => {
      expect(parseCartaIbge("SG-22")).toBeNull();
      expect(parseCartaIbge("B-12")).toBeNull();
      expect(parseCartaIbge("A-4")).toBeNull();
    });

    it("recusa vocabulário fora das listas fechadas e fuso inválido", () => {
      expect(parseCartaIbge("SG-22-W-B")).toBeNull(); // 1:500.000 só V/X/Y/Z
      expect(parseCartaIbge("SG-22-Z-E")).toBeNull(); // 1:250.000 só A–D
      expect(parseCartaIbge("SG-22-Z-B-VII")).toBeNull(); // 1:100.000 só I–VI
      expect(parseCartaIbge("SG-22-Z-B-IV-5")).toBeNull(); // 1:50.000 só 1–4
      expect(parseCartaIbge("SG-22-Z-B-IV-4-NW")).toBeNull(); // em pt-BR é NO
      expect(parseCartaIbge("SG-61-Z")).toBeNull(); // fuso 61 não existe
      expect(parseCartaIbge("SZ-22-Z")).toBeNull(); // faixa Z > V
    });

    it("não dispara em CEP, CPF, telefone, data, coordenada nem prosa", () => {
      for (const s of [
        "89010-000",
        "111.444.777-35",
        "47-3231-3000",
        "2026-08-14",
        "-26.9194, -49.0661",
        "SG-22-Z-B-IV-4-SE-XX",
        "ENGENHEIRO-FORAGIDO",
      ]) {
        expect(parseCartaIbge(s), s).toBeNull();
      }
    });
  });

  it("detectLocation nomeia o formato com a escala", () => {
    expect(detectLocation("SG-22-Z-B-IV-4-SE")?.format).toBe("Carta IBGE/DSG · 1:25.000");
    expect(detectLocation("SG-22-Z-B")?.format).toBe("Carta IBGE/DSG · 1:250.000");
  });

  it("cartaScaleLabel usa o ponto de milhar do pt-BR", () => {
    expect(cartaScaleLabel(25_000)).toBe("1:25.000");
    expect(cartaScaleLabel(1_000_000)).toBe("1:1.000.000");
  });
});
