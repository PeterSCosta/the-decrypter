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
