import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EixosData } from "@/features/eixos/types";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders } from "./quadra-blumenau";

const dataFile = (name: string) => resolve(__dirname, "../../../../../public/data", name);
const eixos = JSON.parse(readFileSync(dataFile("eixos-blumenau.json"), "utf8")) as EixosData;

const ctx = (extra: Partial<DecodeContext> = {}): DecodeContext =>
  ({ key: "", streets: null, eixos, ...extra }) as DecodeContext;

describe("decoder quadra-blumenau", () => {
  it("responde a uma quadra que existe, com ponto no mapa", () => {
    const [card] = decoders.decode("3-4-10-3", ctx());
    expect(card).toBeDefined();
    expect(card.render).toBe("map");
    expect(card.output).toContain("Quadra 3-4-10-3");
    expect(card.chainValue).toMatch(/^-2[67]\.\d+, -49\.\d+$/);
  });

  it("aceita a grafia do carnê (pontos) e a de quem digita com espaço", () => {
    const a = decoders.decode("3.4.10.3", ctx())[0];
    const b = decoders.decode("3 4 10 3", ctx())[0];
    expect(a.output).toBe(b.output);
  });

  it("cala a boca quando a base não chegou", () => {
    expect(decoders.decode("3-4-10-3", ctx({ eixos: null }))).toEqual([]);
  });

  it("não rouba a inscrição de LOTE (cinco grupos) nem responde a texto", () => {
    expect(decoders.decode("4-1-24-20-2", ctx())).toEqual([]);
    expect(decoders.decode("Rua XV de Novembro", ctx())).toEqual([]);
    expect(decoders.decode("412400160028000", ctx())).toEqual([]);
  });

  it("não inventa quadra que não existe no cadastro", () => {
    expect(decoders.decode("9-9-99-99", ctx())).toEqual([]);
  });

  it("desconfia mais quando a quadra é cercada por muita rua", () => {
    const cards = eixos.quadras
      .map((q) => decoders.decode(q, ctx())[0])
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    const nRuas = (c: (typeof cards)[number]) =>
      Number(/· (\d+) rua/.exec(c.label ?? "")?.[1] ?? 0);
    const poucas = cards.filter((c) => nRuas(c) <= 4);
    const muitas = cards.filter((c) => nRuas(c) > 20);
    expect(poucas.length).toBeGreaterThan(0);
    expect(muitas.length).toBeGreaterThan(0);
    expect(Math.max(...muitas.map((c) => c.forcedScore ?? 0))).toBeLessThan(
      Math.min(...poucas.map((c) => c.forcedScore ?? 1)),
    );
  });

  /**
   * A quadra 3-4-10-3 tem 83 ruas em volta e 1.783 lotes dentro: chamar isso de
   * quarteirão mandaria a equipe procurar um quarteirão que não existe. O corte
   * fica em 8 ruas (p80 do cadastro) — a mediana, 4, segue sendo quarteirão.
   */
  it("não promete quarteirão quando a quadra é uma zona grande", () => {
    const grande = decoders.decode("3-4-10-3", ctx())[0];
    expect(grande.output).toContain("área do cadastro");
    expect(grande.output).not.toContain("quarteirão");
    expect(grande.forcedScore).toBe(0.5);

    // e o caso comum (a mediana do cadastro) continua sendo quarteirão
    const pequena = eixos.quadras
      .map((q) => decoders.decode(q, ctx())[0])
      .find((c) => c && Number(/· (\d+) rua/.exec(c.label ?? "")?.[1] ?? 0) <= 3);
    expect(pequena?.output).toContain("quarteirão cercado por");
  });
});
