import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as a1z26Reverse } from "./a1z26-reverse";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const out = (input: string) => a1z26Reverse.decode(input, ctx).map((c) => c.output);

describe("A1Z26 invertido (1=Z)", () => {
  it("1 2 3 → zyx", () => {
    expect(out("1 2 3")).toContain("zyx");
  });
  it("26 25 24 → abc", () => {
    expect(out("26 25 24")).toContain("abc");
  });
  it("ignora entradas que não são números 1–26", () => {
    expect(out("27")).toEqual([]);
    expect(out("abc")).toEqual([]);
  });
});
