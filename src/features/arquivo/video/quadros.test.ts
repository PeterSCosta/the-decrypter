import { describe, expect, it } from "vitest";
import { comoTempo, instantesDaTira, paraSegundos } from "./quadros";

describe("tempo", () => {
  it("formata como uma prova cita um instante", () => {
    expect(comoTempo(0)).toBe("00:00.0");
    expect(comoTempo(37.54)).toBe("00:37.5");
    expect(comoTempo(83.4)).toBe("01:23.4");
    expect(comoTempo(-5)).toBe("00:00.0");
  });

  it("aceita as formas que se digita aqui", () => {
    expect(paraSegundos("37")).toBe(37);
    // Vírgula, porque a interface é pt-BR e é o que se digita.
    expect(paraSegundos("37,5")).toBe(37.5);
    expect(paraSegundos("37.5")).toBe(37.5);
    expect(paraSegundos("1:23")).toBe(83);
    expect(paraSegundos("1:23,4")).toBeCloseTo(83.4, 5);
  });

  it("recusa o que não é instante", () => {
    expect(paraSegundos("")).toBeNull();
    expect(paraSegundos("abc")).toBeNull();
    expect(paraSegundos("-5")).toBeNull();
    expect(paraSegundos("1:2:3")).toBeNull();
  });
});

describe("tira de miniaturas", () => {
  it("evita o começo e o fim exatos", () => {
    // O primeiro quadro costuma ser preto (fade-in) e o último pode não
    // existir; uma tira que abre e fecha em preto não ajuda a achar nada.
    const t = instantesDaTira(100, 5);
    expect(t.length).toBe(5);
    expect(t[0]).toBeGreaterThan(0);
    expect(t[4]).toBeLessThan(100);
    // E cobre o vídeo de ponta a ponta.
    expect(t[4] - t[0]).toBeGreaterThan(90);
  });

  it("vídeo curtíssimo devolve o meio, não uma lista vazia", () => {
    expect(instantesDaTira(0.3, 8)).toEqual([0.15]);
  });

  it("duração inválida não inventa instante", () => {
    expect(instantesDaTira(0)).toEqual([]);
    expect(instantesDaTira(-1)).toEqual([]);
  });
});
