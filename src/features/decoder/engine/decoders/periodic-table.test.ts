import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as periodic } from "./periodic-table";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => periodic.decode(input, ctx);
const outputs = (input: string) => decode(input).map((c) => c.output);

describe("tabela periódica", () => {
  it("número atômico → símbolo + nome", () => {
    expect(outputs("1")).toContain("H");
    expect(decode("1").some((c) => c.notes?.includes("Hidrogênio"))).toBe(true);
    expect(outputs("1 2 3")).toContain("H He Li");
    // notas trazem nome + peso atômico
    expect(decode("1 2 3").some((c) => c.notes?.includes("Hidrogênio (peso 1.008)"))).toBe(true);
  });

  it("símbolos → números atômicos (mantém comportamento antigo)", () => {
    expect(outputs("8 79 47")).toContain("O Au Ag");
    expect(outputs("Au Ag")).toContain("79 47");
  });

  it("símbolos → card de elementos com info", () => {
    const c = decode("H O Cu").find((x) => x.render === "elements");
    expect(c).toBeDefined();
    const els = c?.data as { z: number; sym: string; name: string; weight: number }[];
    expect(els.map((e) => e.sym)).toEqual(["H", "O", "Cu"]);
    expect(els.find((e) => e.sym === "Cu")).toMatchObject({ z: 29, name: "Cobre" });
  });

  it("peso atômico → elemento", () => {
    expect(outputs("12.011").join(" ")).toContain("Carbono");
    expect(outputs("196.97").join(" ")).toContain("Ouro");
    expect(outputs("16").join(" ")).toContain("Oxigênio"); // peso ~16 (além do nº 16 = Enxofre)
  });
});

describe("fórmula molecular → subscritos", () => {
  // Âncora do acervo: GIA-19 "Químico maluco". H3PO4 H2O HNO3 → 3·1·4 | 2·1 |
  // 1·1·3 → 31421113, telefone da loja Crachás Aracaju (DDD 79 no enunciado).
  it("GIA-19: as três fórmulas dão o telefone", () => {
    expect(outputs("H3PO4 H2O HNO3")).toContain("31421113");
    const c = decode("H3PO4 H2O HNO3").find((x) => x.output === "31421113");
    expect(c?.label).toBe("fórmula molecular");
    expect(c?.notes).toBe("H3PO4 → 3·1·4 | H2O → 2·1 | HNO3 → 1·1·3");
    // O card lista cada elemento uma vez, na ordem de aparição.
    expect((c?.data as { sym: string }[]).map((e) => e.sym)).toEqual(["H", "P", "O", "N"]);
    expect(c?.chainValue).toBe("31421113"); // vira entrada do próximo passo
  });

  it("GIA-19 pelos nomes, que é o que o enunciado dá", () => {
    const input = "ácido fosfórico, monóxido de dihidrogênio, ácido nítrico";
    expect(outputs(input)).toContain("31421113");
    const c = decode(input).find((x) => x.output === "31421113");
    expect(c?.label).toBe("nomes → fórmula molecular");
    expect(c?.notes).toContain("água = H2O → 2·1");
    // sem acento, sem hífen e com "e" no lugar da vírgula
    expect(outputs("acido fosforico, monoxido de di-hidrogenio e acido nitrico")).toContain(
      "31421113",
    );
  });

  it("a caixa é o significado: CO ≠ Co", () => {
    // CO2 = carbono + oxigênio(2); Co2 = cobalto(2), um elemento só → não dispara.
    expect(outputs("CO2")).toContain("12");
    expect(decode("CO2").some((c) => c.notes?.includes("Cobalto"))).toBe(false);
    expect(outputs("Co2")).not.toContain("2");
  });

  it("não dispara sem subscrito nem em texto qualquer", () => {
    // "H O Cu" só daria 1s e duplicaria o modo dos símbolos.
    expect(outputs("H O Cu")).not.toContain("111");
    expect(outputs("BINGO")).toEqual([]);
    expect(outputs("Hoje2")).toEqual([]);
    expect(outputs("H2")).toEqual([]); // um elemento só
    expect(outputs("água")).toEqual([]); // nome único é palavra comum demais
  });

  it("nome único só no modo uma cifra só", () => {
    const only: DecodeContext = { key: "", only: "periodic-table", streets: null, ceps: null };
    expect(periodic.decode("água", only).map((c) => c.output)).toContain("21");
    expect(periodic.decode("sal de cozinha", only).map((c) => c.output)).toContain("11");
  });

  it("subscrito de dois dígitos entra inteiro", () => {
    // Caso canônico (não do acervo): glicose C6H12O6.
    expect(outputs("C6H12O6")).toContain("6126");
    expect(outputs("glicose, água")).toContain("612621");
  });
});
