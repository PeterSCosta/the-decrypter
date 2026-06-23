import { describe, expect, it } from "vitest";
import { codecDecoders } from "./codecs";
import type { DecodeContext } from "./types";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const find = (id: string) => codecDecoders.find((d) => d.id === id)!;
const outputs = (id: string, input: string) =>
  find(id)
    .decode(input, ctx)
    .map((c) => c.output);
const encode = (id: string, input: string) => find(id).encode?.(input, ctx);

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

describe("codec encoders (round-trip)", () => {
  // encode(text) deve produzir algo que decode() volta a ler como o texto.
  const roundTrip = ["base64", "base32", "hex", "binary", "decimal", "octal", "url", "html"];
  for (const id of roundTrip) {
    it(`${id}: encode → decode = original`, () => {
      const text = "Olá <b> & 42!"; // inclui caracteres escapáveis p/ HTML/URL
      const enc = encode(id, text);
      expect(enc, `${id} encode produziu null`).toBeTruthy();
      expect(outputs(id, enc!)).toContain(text);
    });
  }

  it("morse: codifica e decodifica (maiúsculas)", () => {
    expect(encode("morse", "HI MUNDO")).toBe(".... .. / -- ..- -. -.. ---");
    expect(outputs("morse", encode("morse", "SOS")!)).toContain("SOS");
  });

  it("braille: codifica e decodifica (minúsculas)", () => {
    const enc = encode("braille", "abc")!;
    expect(enc).toBe("⠁⠃⠉");
    expect(outputs("braille", enc)).toContain("abc");
  });

  it("rot47 e reverse são involuções", () => {
    expect(encode("rot47", encode("rot47", "Teste 123")!)).toBe("Teste 123");
    expect(encode("reverse", "abc")).toBe("cba");
  });

  it("todo codec expõe o inverso encode", () => {
    expect(codecDecoders.every((d) => typeof d.encode === "function")).toBe(true);
  });
});
