import { describe, expect, it } from "vitest";
import type { DecodeCandidate, DecodeContext } from "../types";
import { decoders } from "./numerais-antigos";

const ctx = { key: "", streets: null, ceps: null } as DecodeContext;
const dec = Array.isArray(decoders) ? decoders[0] : decoders;
const cards = (t: string) => dec.decode(t, ctx) as DecodeCandidate[];
const porRotulo = (t: string, r: string) =>
  cards(t).find((c) => c.label === r)?.output as string | undefined;

describe("isopsefia grega", () => {
  /**
   * O valor canônico: `Ιησους` soma 888, que é o número mais citado da
   * isopsefia. Se a tabela estiver errada em qualquer letra desta palavra, este
   * teste reprova — ela usa unidade, dezena e centena.
   */
  it("Ιησους soma 888", () => {
    expect(porRotulo("Ιησους", "isopsefia grega")).toContain("= 888");
  });

  it("as centenas não são a posição ordinal — é o defeito que este decoder conserta", () => {
    // ρ é a 17ª letra e vale 100; σ é a 18ª e vale 200.
    expect(porRotulo("ρσ", "isopsefia grega")).toBe("100 + 200 = 300");
  });

  it("unidades em ordem", () => {
    expect(porRotulo("αβγδε", "isopsefia grega")).toBe("1 + 2 + 3 + 4 + 5 = 15");
  });

  it("o sigma final vale o mesmo que o sigma normal", () => {
    expect(porRotulo("ος", "isopsefia grega")).toBe("70 + 200 = 270");
  });

  /**
   * As três arcaicas saíram do alfabeto corrente mas continuam no sistema
   * numérico — sem elas a conta pula de 5 para 7.
   */
  it("digama (6), koppa (90) e sampi (900) contam", () => {
    expect(porRotulo("ϛϟϡ", "isopsefia grega")).toBe("6 + 90 + 900 = 996");
  });

  it("maiúscula conta igual", () => {
    expect(porRotulo("ΑΒΓ", "isopsefia grega")).toBe("1 + 2 + 3 = 6");
  });
});

describe("gematria hebraica", () => {
  it("שלום soma 376", () => {
    expect(porRotulo("שלום", "gematria hebraica")).toContain("= 376");
  });

  it("as centenas vão de 100 a 400", () => {
    expect(porRotulo("קרשת", "gematria hebraica")).toBe("100 + 200 + 300 + 400 = 1000");
  });

  /**
   * Com final (sofit) há DUAS contas legítimas — o padrão trata a final como a
   * letra base, e o *mispar gadol* dá 500 a 900. Escolher uma seria decidir pela
   * prova, então o card mostra as duas.
   */
  it("com final, mostra as duas contas", () => {
    const r = porRotulo("שלום", "gematria hebraica");
    expect(r).toContain("376");
    expect(r).toContain("mispar gadol");
    expect(r).toContain("936");
  });

  it("sem final, mostra uma conta só", () => {
    const r = porRotulo("שלב", "gematria hebraica");
    expect(r).not.toContain("mispar gadol");
  });
});

describe("o portão", () => {
  it("não dispara em latim, dígito ou prosa", () => {
    for (const s of ["A resposta esta na praca", "89010000", "SGVsbG8=", "-26.9194"]) {
      expect(cards(s), s).toHaveLength(0);
    }
  });

  it("uma letra sozinha é a tabela, não uma leitura", () => {
    expect(cards("ρ")).toHaveLength(0);
    expect(cards("א")).toHaveLength(0);
  });

  it("encadeia o total, que é o que vira índice na camada seguinte", () => {
    expect(cards("ρσ")[0].chainValue).toBe("300");
  });
});
