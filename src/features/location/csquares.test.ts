import { describe, expect, it } from "vitest";
import { decodeCSquares, encodeCSquares } from "./csquares";

describe("C-squares", () => {
  it("reproduz o exemplo canônico da spec", () => {
    // `1000:100:100` = a célula que começa na origem. É o único exemplo que
    // consegui confirmar em fonte publicada; os outros do levantamento não
    // foram verificados e por isso NÃO viram teste.
    const r = decodeCSquares("1000:100:100");
    expect(r!.lat).toBe(0);
    expect(r!.lng).toBe(0);
    expect(r!.resolucao).toBeCloseTo(0.1, 6);
  });

  it("o código sempre aponta para a célula que contém o ponto", () => {
    // Prova de consistência, que é o que dá para provar sem referência externa:
    // gerar e voltar tem de cair na MESMA célula — nunca na vizinha.
    const pontos: [number, number][] = [
      [-26.9194, -49.0661], // Blumenau
      [-26.9078, -48.6618], // Itajaí
      [0.05, 0.05],
      [-33.87, 151.21], // Sydney: sul e leste
      [51.51, -0.13], // Londres: norte e oeste
      [64.15, -21.94], // Reykjavík
    ];
    for (const [lat, lng] of pontos) {
      const cod = encodeCSquares(lat, lng, 2);
      const v = decodeCSquares(cod);
      expect(v, cod).not.toBeNull();
      const res = v!.resolucao;
      // O ponto tem de estar entre o canto da célula e o canto + lado.
      const dLat = Math.abs(lat) - Math.abs(v!.lat);
      const dLng = Math.abs(lng) - Math.abs(v!.lng);
      expect(dLat, `${cod} lat`).toBeGreaterThanOrEqual(-1e-9);
      expect(dLat, `${cod} lat`).toBeLessThan(res + 1e-9);
      expect(dLng, `${cod} lng`).toBeGreaterThanOrEqual(-1e-9);
      expect(dLng, `${cod} lng`).toBeLessThan(res + 1e-9);
      // E o sinal tem de bater.
      expect(Math.sign(v!.lat) || 1, `${cod} hemisfério`).toBe(Math.sign(lat) || 1);
      expect(Math.sign(v!.lng) || 1, `${cod} meridiano`).toBe(Math.sign(lng) || 1);
    }
    console.log(`\n  Blumenau → ${encodeCSquares(-26.9194, -49.0661, 2)}`);
    console.log(`  Itajaí   → ${encodeCSquares(-26.9078, -48.6618, 2)}`);
  });

  it("exige ciclo: 4 dígitos nus não são assinatura", () => {
    expect(decodeCSquares("5204")).toBeNull();
  });

  it("aceita o ciclo cortado de 1 dígito (célula de 5°)", () => {
    expect(decodeCSquares("7307:4")!.resolucao).toBe(5);
  });
});
