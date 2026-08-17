import { describe, expect, it } from "vitest";
import {
  MAX_INSTANTES,
  comoTempo,
  instantesDaTira,
  listaDeInstantes,
  paraSegundos,
} from "./quadros";

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

describe("lista de instantes", () => {
  it("aceita a lista que se digita de verdade", () => {
    expect(listaDeInstantes("14, 60, 72, 90")).toEqual([14, 60, 72, 90]);
    expect(listaDeInstantes("14 60 72 90")).toEqual([14, 60, 72, 90]);
    expect(listaDeInstantes("14;60;72")).toEqual([14, 60, 72]);
    expect(listaDeInstantes("1:23, 2:00")).toEqual([83, 120]);
  });

  it("um instante só continua sendo um instante", () => {
    expect(listaDeInstantes("37")).toEqual([37]);
    expect(listaDeInstantes("1:23,4")).toEqual([83.4]);
  });

  it("a vírgula colada: decimal com dois pedaços, separador com três", () => {
    // Esta é A ambiguidade do pt-BR nesta caixa, e a regra precisa ser estável:
    // ninguém escreve um decimal com três vírgulas.
    expect(listaDeInstantes("37,5")).toEqual([37.5]);
    expect(listaDeInstantes("14,60,72,90")).toEqual([14, 60, 72, 90]);
  });

  it("ordena e tira repetido — dois seeks ao mesmo lugar dão a mesma imagem", () => {
    expect(listaDeInstantes("90, 14, 90, 60")).toEqual([14, 60, 90]);
  });

  it("recusa em bloco o que não entende, em vez de extrair pela metade", () => {
    expect(listaDeInstantes("14, abacaxi, 60")).toBeNull();
    expect(listaDeInstantes("")).toBeNull();
    expect(listaDeInstantes("   ")).toBeNull();
  });

  it("tem teto: cada quadro é um seek", () => {
    const muitos = Array.from({ length: 40 }, (_, i) => i + 1).join(", ");
    expect(listaDeInstantes(muitos)).toHaveLength(MAX_INSTANTES);
  });
});
