import type { CepsData } from "@/features/cep/types";
import { describe, expect, it } from "vitest";
import { lookupDecoders } from "./lookups";
import type { DecodeContext } from "./types";

const ceps: CepsData = {
  source: "test",
  generatedAt: "test",
  count: 2,
  municipios: ["Blumenau"],
  rows: [
    ["88305500", "Rua A", "Centro", 0, null, null],
    ["89010000", "Rua XV de Novembro", "Centro", 0, null, null],
  ],
};
const ctx: DecodeContext = { key: "", streets: null, ceps };
const cepScPrefix = lookupDecoders.find((d) => d.id === "cep-sc-prefix");
if (!cepScPrefix) throw new Error("decoder cep-sc-prefix não registrado");
const decode = (input: string) => cepScPrefix.decode(input, ctx);

describe("CEP sem prefixo SC (88/89)", () => {
  it("6 dígitos resolvem prefixando 88", () => {
    const c = decode("305500")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("cep");
    expect(c.output).toContain("88305-500");
  });

  it("ignora separadores (305-500)", () => {
    expect(decode("305-500")[0]?.output).toContain("88305-500");
  });

  it("não dispara para 8 dígitos (é o cep-exact) nem sem match", () => {
    expect(decode("88305500")).toEqual([]); // 8 dígitos → outro decoder
    expect(decode("999999")).toEqual([]); // sufixo inexistente na base
  });
});
