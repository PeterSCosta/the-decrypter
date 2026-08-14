import { describe, expect, it } from "vitest";
import type { DecodeCandidate } from "./engine/types";
import { MAX_TRAIL, chainValueOf, popStep, pushStep, truncateTo } from "./trail";

const cand = (over: Partial<DecodeCandidate>): DecodeCandidate => ({
  decoderId: "x",
  decoderName: "X",
  category: "transform",
  output: "saida",
  ...over,
});

describe("chainValueOf", () => {
  it("encadeia saída textual", () => {
    expect(chainValueOf(cand({ output: "TOPO" }))).toBe("TOPO");
    expect(chainValueOf(cand({ output: "TOPO", render: "text" }))).toBe("TOPO");
  });

  it("NÃO encadeia lookup: o output é prosa, não valor", () => {
    // local-geocode emite "Rua X — -26.9, -49.0 (Blumenau)"; jogar isso na
    // entrada do próximo decoder é lixo.
    expect(chainValueOf(cand({ output: "Rua X — -26.9, -49.0", render: "map" }))).toBeNull();
    expect(
      chainValueOf(cand({ output: "tabela de 53 linhas", render: "caesar-table" })),
    ).toBeNull();
  });

  it("chainValue explícito manda, mesmo em render customizado", () => {
    expect(
      chainValueOf(cand({ output: "Rua X — …", render: "map", chainValue: "-26.9, -49.0" })),
    ).toBe("-26.9, -49.0");
  });

  it("chainValue vazio marca 'este não encadeia'", () => {
    expect(chainValueOf(cand({ output: "algo", chainValue: "" }))).toBeNull();
    expect(chainValueOf(cand({ output: "algo", chainValue: "   " }))).toBeNull();
  });

  it("saída em branco não encadeia", () => {
    expect(chainValueOf(cand({ output: "   " }))).toBeNull();
  });
});

describe("trilha", () => {
  it("empurra e desfaz, restaurando a entrada anterior", () => {
    let t = pushStep([], "MTIz", "Base64");
    t = pushStep(t, "123", "A1Z26");
    expect(t).toHaveLength(2);

    const undo = popStep(t);
    expect(undo.input).toBe("123");
    expect(undo.trail).toHaveLength(1);
  });

  it("ramifica: voltar ao passo 0 descarta o que veio depois", () => {
    let t = pushStep([], "primeiro", "A");
    t = pushStep(t, "segundo", "B");
    t = pushStep(t, "terceiro", "C");

    const { trail, input } = truncateTo(t, 0);
    expect(input).toBe("primeiro");
    expect(trail).toHaveLength(0);
  });

  it("desfazer numa trilha vazia é no-op", () => {
    expect(popStep([]).input).toBeNull();
    expect(truncateTo([], 3).input).toBeNull();
  });

  it("respeita o teto de passos", () => {
    let t: ReturnType<typeof pushStep> = [];
    for (let i = 0; i < MAX_TRAIL + 5; i++) t = pushStep(t, `e${i}`, `v${i}`);
    expect(t).toHaveLength(MAX_TRAIL);
  });
});
