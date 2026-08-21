import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LojasData } from "@/features/loja/types";
import { describe, expect, it } from "vitest";
import { runDecoders } from "../run";
import type { DecodeContext } from "../types";
import { decoders } from "./loja";

const d = Array.isArray(decoders) ? decoders[0] : decoders;

const lojas: LojasData = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/data/lojas-blumenau.json"), "utf8"),
);
const streets = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/data/streets.json"), "utf8"),
);

const ctx = (over: Partial<DecodeContext> = {}) =>
  ({ key: "", streets: null, ceps: null, lojas, ...over }) as unknown as DecodeContext;

const um = (s: string, c = ctx()) => d.decode(s, c)[0];

describe("o decoder de loja", () => {
  it("responde a unidade com prefixo, e diz onde ela fica", () => {
    const r = um("L2032");
    expect(r.output).toContain("60 Sabores");
    expect(r.output).toContain("Praça De Alimentação");
    expect(r.forcedScore).toBe(0.88);
    expect(r.render).toBe("loja");
  });

  it("aceita as grafias que o usuário digita", () => {
    for (const s of ["L2032", "l2032", " L2032 "]) expect(um(s).output).toContain("60 Sabores");
    expect(um("loja 15").output).toContain("Lavi Shoes");
    expect(um("Loja Serv. 03").output).toContain("Gut Waschen");
    expect(um("SPESS02").output).toContain("Agro Aves");
    expect(um("L2036/2037/2038").output).toContain("Donald");
  });

  /**
   * O NOME ENCADEIA, O IDENTIFICADOR NÃO. A prova real segue
   * `loja → CNPJ → razão social → letra`, e repetir a entrada é justamente o
   * defeito pelo qual o decoder de assento foi recusado.
   */
  it("encadeia o nome da loja, nunca o identificador", () => {
    const r = um("L2032");
    expect(r.chainValue).toBe("60 Sabores");
    expect(r.chainValue).not.toContain("L2032");
  });

  it("mostra todas as lojas que dividem a unidade", () => {
    const r = um("A13");
    expect(r.output).toContain("Americanas");
    expect(r.output).toContain("Pittol");
  });

  /**
   * O CASO QUE DECIDE O DESENHO. `2024` é o LUC da Mistura Brasileira **e** o
   * código da R Carl Kaun — e a leitura de rua está certa. O card de loja tem
   * de aparecer (acima de 0,35) e ficar ABAIXO dela (0,97).
   */
  it("número solto entra visível, e abaixo da resposta de rua", () => {
    const r = um("2024");
    expect(r.forcedScore).toBe(0.45);
    expect(r.forcedScore).toBeGreaterThan(0.35);
    expect(r.forcedScore).toBeLessThan(0.97);
    expect(r.output).toContain("Mistura Brasileira");
  });

  it("no fan-out real, a rua continua no topo e a loja aparece embaixo", () => {
    const cands = runDecoders("2024", ctx({ streets })).results as {
      decoderId: string;
      score: number;
    }[];
    const ordenado = [...cands].sort((a, b) => b.score - a.score);
    expect(ordenado[0].decoderId).toBe("street-code");
    const loja = cands.find((c) => c.decoderId === "loja-blumenau");
    expect(loja).toBeTruthy();
    expect(loja?.score).toBeLessThan(ordenado[0].score);
  });

  /** Pré-resolvido: sem acerto confirmado, cala. */
  it("forma parecida sem acerto não emite nada", () => {
    for (const s of ["L9999", "Loja 999", "A99", "999999"]) expect(d.decode(s, ctx())).toEqual([]);
  });

  it("sem a base carregada, cala", () => {
    expect(d.decode("L2032", ctx({ lojas: null }))).toEqual([]);
  });

  /**
   * NOME NÃO É PORTA. 41 dos 372 nomes do catálogo são palavra do dicionário —
   * `claro`, `vivo`, `farm`, `tomato` —, e uma porta por nome acenderia em prosa.
   */
  it("nome de loja não entra pelo decoder", () => {
    for (const s of ["Subway", "Natura", "claro", "vivo", "Mistura Brasileira", "a porta preta"]) {
      expect(d.decode(s, ctx()), s).toEqual([]);
    }
  });

  it("entrada vazia não emite", () => {
    for (const s of ["", "   "]) expect(d.decode(s, ctx())).toEqual([]);
  });

  /** A cobertura desigual viaja até o card — "não achei" ≠ "não existe". */
  it("o aviso de cobertura chega ao payload", () => {
    const hint = um("L2032").data as { aviso: string };
    expect(hint.aviso).toMatch(/não traz o número/i);
  });
});
