import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as bin } from "./binary-number";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => bin.decode(input, ctx);

describe("Binário → número", () => {
  it("100101010 → dec 298", () => {
    const c = decode("100101010")[0];
    expect(c).toBeDefined();
    expect(c.output).toContain("dec 298");
    expect(c.output).toContain("hex 12A");
  });

  it("ignora espaços/pontos (1001 0101 0)", () => {
    expect(decode("1001 0101 0")[0]?.output).toContain("dec 298");
  });

  it("não dispara para não-binário nem para <3 bits", () => {
    expect(decode("12345")).toEqual([]); // contém 2-9
    expect(decode("10")).toEqual([]); // curto demais
  });
});
