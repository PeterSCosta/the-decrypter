import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EstacoesData } from "@/features/estacao/types";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders } from "./estacao-ibge";

/**
 * O DECODER DAS DUAS PORTAS.
 *
 * O `types.test.ts` cobre a BUSCA; aqui o que se testa é o PORTÃO — quem chega
 * até a busca e quem é barrado antes. O portão já esteve errado duas vezes: uma
 * no comprimento (4 dígitos, metade da base inalcançável) e outra na forma (só
 * o código, e a chapa nunca chegava).
 */
const dados: EstacoesData = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/data/estacoes-ibge.json"), "utf8"),
);

const d = Array.isArray(decoders) ? decoders[0] : decoders;
const ctx = (estacoes: EstacoesData | null) =>
  ({ key: "", streets: null, ceps: null, estacoes }) as unknown as DecodeContext;

describe("portão da estação geodésica", () => {
  it("a porta do código responde", () => {
    const r = d.decode("8121288", ctx(dados));
    expect(r).toHaveLength(1);
    expect(r[0].output).toContain("Blumenau");
  });

  /**
   * A REGRESSÃO DO COMPRIMENTO: o portão aceitava 4 dígitos, e os 226 códigos
   * de 7 e os 19 de 5 não passavam. Metade da base, inalcançável.
   */
  it("códigos de 5 e 7 dígitos passam pelo portão", () => {
    for (const c of ["11053", "8121288"]) expect(d.decode(c, ctx(dados)).length, c).toBe(1);
  });

  /**
   * O HÍFEN É OPCIONAL, e isto é regressão: o portão exigia hífen, e as treze
   * inscrições tiradas da descrição em geral não têm (`RN2004H`, `SAT94026`).
   */
  it("chapa sem hífen também passa", () => {
    const r = d.decode("RN2004H", ctx(dados));
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].output).toContain("chapa RN2004H");
  });

  it("prosa com forma de chapa mas sem dígito não varre a base", () => {
    for (const s of ["casarao", "pontes", "abc-def"]) {
      expect(d.decode(s, ctx(dados)), s).toHaveLength(0);
    }
  });

  it("a porta da chapa responde, e DIZ que foi pela chapa", () => {
    const r = d.decode("MR-103", ctx(dados));
    expect(r).toHaveLength(1);
    // Sem isto, quem digitou `MR-103` recebe "99861 — Blumenau" e não tem como
    // saber por que aquilo apareceu.
    expect(r[0].label).toContain("MR-103");
    expect(r[0].output).toContain("chapa MR-103");
  });

  /**
   * As duas formas colidem com outras coisas DE PROPÓSITO — quem decide é a
   * base, não o portão. `SG-22` tem forma de chapa e é carta topográfica; ela
   * não está no índice de chapas, então aqui não sai nada.
   */
  it("forma de chapa que não é chapa não produz resposta", () => {
    expect(d.decode("SG-22", ctx(dados))).toHaveLength(0);
    expect(d.decode("ZZ-999", ctx(dados))).toHaveLength(0);
  });

  it("cala no que não é nem código nem chapa", () => {
    for (const s of ["A resposta esta na praca", "-26.9194, -49.0661", ""]) {
      expect(d.decode(s, ctx(dados)), s).toHaveLength(0);
    }
  });

  it("sem a base carregada, cala em vez de quebrar", () => {
    expect(d.decode("8121288", ctx(null))).toHaveLength(0);
    expect(d.decode("MR-103", ctx(null))).toHaveLength(0);
  });

  /**
   * O nome só entra quando DIZ alguma coisa: em boa parte da base o
   * `nomeEstacao` repete o código, e `8121288 (8121288)` é ruído com cara de
   * informação.
   */
  it("nome que repete o código não vira parêntese", () => {
    expect(d.decode("8121288", ctx(dados))[0].output).not.toContain("(8121288)");
    expect(d.decode("101", ctx(dados))[0].output).toContain("(NOVA PONTA AGUDA)");
  });

  /**
   * A base do BDG envelhece em silêncio — uma estação destruída segue aqui com
   * cara de dado corrente. A data da cópia viaja no card, não só no arquivo.
   */
  it("o card diz de quando é a cópia da base", () => {
    const d0 = d.decode("8121288", ctx(dados))[0] as { data?: { detail?: string } };
    expect(d0.data?.detail).toContain(`BDG/IBGE, cópia de ${dados.generatedAt}`);
  });

  it("encadeia como coordenada", () => {
    expect(d.decode("8121288", ctx(dados))[0].chainValue).toMatch(/^-?\d+\.\d+, -?\d+\.\d+$/);
  });
});
