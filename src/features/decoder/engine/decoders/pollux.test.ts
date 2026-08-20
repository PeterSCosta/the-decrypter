import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { setWordSet } from "../score";
import type { DecodeContext } from "../types";
import { decoders as morbitDec } from "./morbit";
import { decoders as polluxDec } from "./pollux";

const pollux = Array.isArray(polluxDec) ? polluxDec[0] : polluxDec;
const morbit = Array.isArray(morbitDec) ? morbitDec[0] : morbitDec;
const ctx = (only?: string) =>
  ({ key: "", streets: null, ceps: null, only }) as unknown as DecodeContext;

const fold = (w: string) => w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

beforeAll(() => {
  const set = new Set(readFileSync("public/data/words-pt.txt", "utf8").split("\n").map(fold));
  setWordSet({ has: (w: string) => set.has(w) } as never);
});

const LONGO = "ENCONTRE A CHAVE ESCONDIDA NA PRACA CENTRAL DE BLUMENAU";

describe("Pollux no leque", () => {
  it("uma cifra longa de verdade responde, e responde certo", () => {
    const cif = pollux.encode?.(LONGO) ?? "";
    expect(cif.length).toBeGreaterThanOrEqual(80);
    const r = pollux.decode(cif, ctx());
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].output).toBe(LONGO);
  });

  /**
   * O PISO É O ITEM INTEIRO. O espaço numérico desta bancada é povoado — CEP,
   * plaqueta, IBGE, telefone, CPF, timestamp, A1Z26 colado — e o problema não é
   * passarem no portão: é EMITIREM. Com piso de 8 dígitos, `88353537` (um CEP
   * de Blumenau) devolvia `CETETE` com cobertura 1,00.
   */
  it.each([
    "88353537",
    "88355648",
    "88511435",
    "2147483647",
    "89010000",
    "4202404",
    "890066508900005089007970",
    "1723680000",
    "12345678909",
    "47332211234",
  ])("cala em %s — número real da casa, não cifra", (numero) => {
    expect(pollux.decode(numero, ctx())).toEqual([]);
  });

  it("sequência sem variedade não passa, mesmo longa", () => {
    expect(pollux.decode("1".repeat(120), ctx())).toEqual([]);
    expect(pollux.decode("1212121212".repeat(12), ctx())).toEqual([]);
  });

  it("texto que não é só dígito nem chega ao solver", () => {
    for (const s of ["a porta preta", "88010-500", "tt0111161", ""])
      expect(pollux.decode(s, ctx()), s).toEqual([]);
  });

  /**
   * No modo "uma cifra só" o piso sai: a pessoa já escolheu, e ali a lista
   * ranqueada é a resposta, não um palpite disputando espaço no leque.
   */
  it("no modo uma-cifra-só, o piso de 80 sai do caminho", () => {
    const cif = pollux.encode?.("A PONTE DE FERRO") ?? "";
    expect(cif.length).toBeLessThan(80);
    expect(pollux.decode(cif, ctx())).toEqual([]);
    expect(pollux.decode(cif, ctx("pollux"))[0]?.output).toBe("A PONTE DE FERRO");
  });

  it("sem vocabulário, cala — não há como ordenar as leituras", () => {
    const cif = pollux.encode?.(LONGO) ?? "";
    setWordSet(null);
    expect(pollux.decode(cif, ctx())).toEqual([]);
    const set = new Set(readFileSync("public/data/words-pt.txt", "utf8").split("\n").map(fold));
    setWordSet({ has: (w: string) => set.has(w) } as never);
  });
});

/**
 * O MORBIT NÃO ENTRA NO LEQUE, e o portão é literalmente a primeira linha do
 * decoder. Duas razões medidas: custa 50× a 160× o piso do fan-out, e o portão
 * natural dele ("dígitos sem zero") deixa passar 554 de 600 listas de A1Z26
 * coladas — a cifra nº 1 do acervo.
 */
describe("Morbit só no modo uma-cifra-só", () => {
  it("fora do modo, cala em QUALQUER entrada — inclusive numa cifra legítima", () => {
    const cif = morbit.encode?.(LONGO) ?? "";
    expect(cif.length).toBeGreaterThan(0);
    expect(morbit.decode(cif, ctx())).toEqual([]);
    for (const s of ["123456789", "1".repeat(40), "47332211234"])
      expect(morbit.decode(s, ctx()), s).toEqual([]);
  });

  it("dentro do modo, resolve", () => {
    const cif = morbit.encode?.(LONGO) ?? "";
    const r = morbit.decode(cif, ctx("morbit"));
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].output).toBe(LONGO);
  });

  it("o zero não é dígito de Morbit", () => {
    expect(morbit.decode("1234567890123456", ctx("morbit"))).toEqual([]);
  });
});
