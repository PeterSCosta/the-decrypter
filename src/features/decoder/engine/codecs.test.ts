import { describe, expect, it } from "vitest";
import { codecDecoders } from "./codecs";
import type { DecodeContext } from "./types";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const outputs = (id: string, input: string) =>
  codecDecoders
    .find((d) => d.id === id)!
    .decode(input, ctx)
    .map((c) => c.output);

describe("codec decoders", () => {
  it("decodes Base64", () => {
    expect(outputs("base64", "SGVsbG8=")).toContain("Hello");
    expect(outputs("base64", "Qm9tIGRpYQ==")).toContain("Bom dia");
  });

  it("decodes hexadecimal", () => {
    expect(outputs("hex", "48 65 6c 6c 6f")).toContain("Hello");
  });

  it("decodes 8-bit binary", () => {
    expect(outputs("binary", "01001000 01101001")).toContain("Hi");
  });

  it("decodes decimal ASCII codes", () => {
    expect(outputs("decimal", "72 73")).toContain("HI");
  });

  it("decodes Morse", () => {
    expect(outputs("morse", ".... .. / -- ..- -. -.. ---")).toContain("HI MUNDO");
  });

  it("decodes URL percent-encoding", () => {
    expect(outputs("url", "ol%C3%A1%20mundo")).toContain("olá mundo");
  });

  it("reverses text", () => {
    expect(outputs("reverse", "abc")).toContain("cba");
  });

  it("rejects invalid input (no candidate)", () => {
    expect(outputs("base64", "!!!not base64!!!")).toHaveLength(0);
    expect(outputs("binary", "0102")).toHaveLength(0);
  });
});
