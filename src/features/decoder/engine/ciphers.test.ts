import { describe, expect, it } from "vitest";
import { cipherDecoders, railFenceDecrypt } from "./ciphers";
import type { DecodeContext } from "./types";

const base: DecodeContext = { key: "", streets: null, ceps: null };
const outputs = (id: string, input: string, ctx: DecodeContext = base) =>
  cipherDecoders
    .find((d) => d.id === id)!
    .decode(input, ctx)
    .map((c) => c.output);

describe("classical ciphers", () => {
  it("ROT13 is its own inverse", () => {
    expect(outputs("rot13", "Uryyb")).toContain("Hello");
  });

  it("Caesar surfaces the correct shift", () => {
    // "Khoor" is "Hello" shifted +3; decoding must recover "Hello".
    expect(outputs("caesar", "Khoor")).toContain("Hello");
  });

  it("Atbash maps the alphabet to its mirror", () => {
    expect(outputs("atbash", "Svool")).toContain("Hello");
  });

  it("Vigenère decrypts with a key", () => {
    // Classic vector: ATTACKATDAWN / key LEMON → LXFOPVEFRNHR
    expect(outputs("vigenere", "LXFOPVEFRNHR", { ...base, key: "LEMON" })).toContain(
      "ATTACKATDAWN",
    );
  });

  it("Vigenère without a key yields nothing", () => {
    expect(outputs("vigenere", "LXFOPVEFRNHR")).toHaveLength(0);
  });

  it("A1Z26 maps numbers to letters", () => {
    expect(outputs("a1z26", "8 5 12 12 15")).toContain("hello");
  });

  it("A1Z26 also goes the other way (letters → numbers)", () => {
    expect(outputs("a1z26-encode", "abc")).toContain("1 2 3");
    expect(outputs("a1z26-encode", "hello")).toContain("8 5 12 12 15");
  });

  it("rail fence round-trips", () => {
    const plain = "WEAREDISCOVEREDFLEEATONCE";
    const cipher = "WECRLTEERDSOEEFEAOCAIVDEN"; // 3 rails
    expect(railFenceDecrypt(cipher, 3)).toBe(plain);
  });
});
