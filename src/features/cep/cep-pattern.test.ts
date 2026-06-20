import { describe, expect, it } from "vitest";
import { cepMatches, parseCepPattern } from "./cep-pattern";

describe("CEP wildcard pattern", () => {
  it("treats an 8-char pattern as an anchored positional mask", () => {
    expect(cepMatches("88010500", "88xxx500")).toBe(true);
    expect(cepMatches("88999500", "88xxx500")).toBe(true);
    expect(cepMatches("89010500", "88xxx500")).toBe(false); // wrong prefix
    expect(cepMatches("88010501", "88xxx500")).toBe(false); // wrong suffix
  });

  it("allows a wildcard in any position", () => {
    expect(cepMatches("88300000", "x8300000")).toBe(true);
    expect(cepMatches("18300000", "x8300000")).toBe(true);
    expect(cepMatches("88300001", "x8300000")).toBe(false);
  });

  it("accepts * and ? as wildcards too", () => {
    expect(cepMatches("88010500", "88*** 500".replace(" ", ""))).toBe(true);
    expect(cepMatches("88010500", "880?0500")).toBe(true);
  });

  it("ignores dashes, dots and spaces", () => {
    expect(cepMatches("88010500", "88xxx-500")).toBe(true);
    expect(cepMatches("88010500", "88010-500")).toBe(true);
  });

  it("matches a short pattern anywhere in the CEP", () => {
    expect(cepMatches("88010500", "500")).toBe(true);
    expect(cepMatches("88010500", "8801")).toBe(true);
    expect(cepMatches("88010500", "999")).toBe(false);
  });

  it("rejects invalid or over-length patterns", () => {
    expect(parseCepPattern("")).toBeNull();
    expect(parseCepPattern("123456789")).toBeNull(); // > 8 digits
    expect(parseCepPattern("88ab")).toBeNull();
  });
});
