import { describe, expect, it } from "vitest";
import { decoders } from "./registry";
import type { DecodeContext } from "./types";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };

/** O município chega pré-resolvido da API, não de um dataset no navegador. */
const municipio = { codigoIbge: 4205407, nome: "Florianópolis", uf: "SC" };
const comMunicipio = (q: string) => ({ ...ctx, hits: { q, municipio } }) as typeof ctx;

describe("decoder registry", () => {
  it("has no duplicate ids", () => {
    const ids = decoders.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every decoder is well-formed", () => {
    for (const d of decoders) {
      expect(typeof d.id).toBe("string");
      expect(typeof d.name).toBe("string");
      expect(typeof d.decode).toBe("function");
      expect(Array.isArray(d.decode("teste 123", ctx))).toBe(true);
    }
  });

  it("auto-registers custom decoders from ./decoders", () => {
    expect(decoders.some((d) => d.id === "leetspeak")).toBe(true);
    expect(decoders.some((d) => d.id === "polybius")).toBe(true);
  });

  it("resolves an IBGE municipality code (7- and 6-digit)", () => {
    const ibge = decoders.find((d) => d.id === "ibge-municipio")!;
    expect(ibge.decode("4205407", comMunicipio("4205407")).map((c) => c.output)[0]).toContain(
      "Florianópolis — SC",
    );
    // 6-digit (sem dígito verificador)
    expect(ibge.decode("420540", comMunicipio("420540")).map((c) => c.output)[0]).toContain(
      "Florianópolis",
    );
    // Sem acerto do servidor não há o que formatar.
    expect(ibge.decode("9999999", ctx)).toHaveLength(0);
  });

  it("the example Polybius decoder works end-to-end", () => {
    const poly = decoders.find((d) => d.id === "polybius")!;
    expect(poly.decode("23 15 31 31 34", ctx).map((c) => c.output)).toContain("HELLO");
  });

  it("the example leetspeak decoder normalises digits in words", () => {
    const leet = decoders.find((d) => d.id === "leetspeak")!;
    expect(leet.decode("l33t", ctx).map((c) => c.output)).toContain("leet");
  });

  it("the Caesar brute-force lists every shift from -26 to +26", () => {
    const bf = decoders.find((d) => d.id === "caesar-bruteforce")!;
    const cands = bf.decode("Khoor", ctx);
    expect(cands).toHaveLength(1);
    const rows = cands[0].data as { shift: number; text: string }[];
    expect(rows).toHaveLength(53); // -26..+26 inclusive
    expect(rows[0].shift).toBe(-26);
    expect(rows[52].shift).toBe(26);
    expect(rows.some((r) => r.text === "Hello")).toBe(true);
  });
});
