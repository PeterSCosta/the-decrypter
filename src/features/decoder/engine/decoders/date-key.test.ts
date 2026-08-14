import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as dateKey } from "./date-key";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => dateKey.decode(input, ctx);

describe("data como chave", () => {
  // Âncora do acervo: GIA-13 "O Código SONGI" (acervo/gia-2026/gia-13-o-codigo-songi
  // e RESOLUCOES.md:702) — o enunciado é exatamente esta cadeia de oito datas.
  it("resolve GIA-13: as oito datas viram CASCAVEL", () => {
    const c = decode("11/07-29/03-23/11-17/01-13/02-02/09-07/11-05/10")[0];
    expect(c).toBeDefined();
    expect(c.output).toBe("CASCAVEL");
    expect(c.notes).toContain("11/07 Câncer");
    expect(c.notes).toContain("05/10 Libra");
  });

  it("a lista não força score: quem julga as iniciais é o scorer", () => {
    const c = decode("11/07-29/03-23/11-17/01-13/02-02/09-07/11-05/10")[0];
    expect(c.forcedScore).toBeUndefined();
  });

  it("23/11 é Sagitário (a fronteira onde as tabelas de signo se contradizem)", () => {
    expect(decode("23/11")[0]?.output).toContain("Sagitário");
    expect(decode("22/11")[0]?.output).toContain("Sagitário");
    expect(decode("21/11")[0]?.output).toContain("Escorpião");
  });

  it("01/01/2000: serial de Excel 36526, sábado e Unix 946684800", () => {
    const c = decode("01/01/2000")[0];
    expect(c.output).toContain("Excel 36526");
    expect(c.output).toContain("sábado");
    expect(c.output).toContain("Unix 946684800");
    expect(c.output).toContain("Capricórnio");
    expect(c.forcedScore).toBe(0.5);
  });

  it("o painel encadeia o signo, não a prosa", () => {
    expect(decode("01/01/2000")[0]?.chainValue).toBe("Capricórnio");
  });

  it("conta o dia do ano com o 29/02 do ano bissexto", () => {
    expect(decode("01/03/2000")[0]?.output).toContain("dia 61 do ano");
    expect(decode("01/03/2001")[0]?.output).toContain("dia 60 do ano");
  });

  it("rotula a fase da lua como aproximada (21/01/2000 foi lua cheia)", () => {
    expect(decode("21/01/2000")[0]?.notes).toBe("Fase da lua (aproximada): Cheia");
  });

  it("lê ISO e mistura de larguras de dia/mês", () => {
    expect(decode("2000-01-01 2000-03-29 2000-11-23")[0]?.output).toBe("CAS");
    expect(decode("1/1/2000")[0]?.output).toContain("Capricórnio");
  });

  // Portão: é o que separa este decoder do #Kaprekar, cuja âncora são quatro anos soltos.
  it("ano solto não é data (âncora do Kaprekar fica intacta)", () => {
    expect(decode("2019 2010 1949 1905")).toEqual([]);
  });

  it("fração e placar não viram data", () => {
    expect(decode("3/4")).toEqual([]);
    expect(decode("2/1 3/0 1/1")).toEqual([]);
  });

  it("recusa data impossível e lista com token estranho", () => {
    expect(decode("29/02/2001")).toEqual([]);
    expect(decode("32/01/2000")).toEqual([]);
    expect(decode("12/2019")).toEqual([]);
    expect(decode("11/07-29/03-batata")).toEqual([]);
  });

  it("duas datas não geram cartão (duas letras seriam ruído)", () => {
    expect(decode("11/07-29/03")).toEqual([]);
  });

  it("sem ano, avisa o que ficou de fora", () => {
    const c = decode("23/11")[0];
    expect(c.notes).toContain("Sem o ano");
    expect(c.output).toContain("dia 327 do ano (ano comum)");
  });
});
