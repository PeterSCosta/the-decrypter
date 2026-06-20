import { describe, expect, it } from "vitest";
import type { DecodeContext, Decoder } from "../types";
import { decoders as acrostic } from "./acrostic";
import { decoders as ascii85 } from "./ascii85";
import { decoders as baseConverter } from "./base-converter";
import { decoders as base58 } from "./base58";
import { decoders as beaufort } from "./beaufort";
import { decoders as gronsfeld } from "./gronsfeld";
import { decoders as hashId } from "./hash-id";
import { decoders as periodic } from "./periodic-table";
import { decoders as roman } from "./roman";
import { decoders as t9 } from "./t9";
import { decoders as tapCode } from "./tap-code";
import { decoders as zeroWidth } from "./zero-width";

const ctx = (key = ""): DecodeContext => ({ key, streets: null, ceps: null });
const out = (d: Decoder, input: string, key = "") => d.decode(input, ctx(key)).map((c) => c.output);

describe("extra encodings", () => {
  it("Base58 (vetor padrão Bitcoin)", () => {
    expect(out(base58, "2cFupjhnEsSn59qHXstmK2ffpLv2")).toContain("simply a long string");
  });
  it("Ascii85", () => {
    expect(out(ascii85, "BOu!rD]j7BEbo7")).toContain("hello world");
  });
  it("T9 multitap", () => {
    expect(out(t9, "44 33 555 555 666")).toContain("hello");
  });
  it("tap code", () => {
    expect(out(tapCode, ".. ...")).toContain("H");
  });
  it("zero-width esconde texto", () => {
    const bits = "0100100001101001"; // "Hi"
    const zw = [...bits].map((b) => String.fromCodePoint(b === "0" ? 0x200b : 0x200c)).join("");
    expect(out(zeroWidth, `texto${zw}`)).toContain("Hi");
  });
});

describe("tabelas / utilitários", () => {
  it("romanos nos dois sentidos", () => {
    expect(out(roman, "MCMXCIV")[0]).toContain("1994");
    expect(out(roman, "42")[0]).toContain("XLII");
  });
  it("tabela periódica", () => {
    expect(out(periodic, "8 79 47")).toContain("O Au Ag");
    expect(out(periodic, "Au Ag")).toContain("79 47");
  });
  it("conversor de base", () => {
    expect(out(baseConverter, "255")[0]).toContain("FF");
  });
  it("identificador de hash", () => {
    expect(out(hashId, "d41d8cd98f00b204e9800998ecf8427e")[0]).toContain("MD5");
  });
  it("acróstico", () => {
    expect(out(acrostic, "Verde Imenso Vento Azul")).toContain("VIVA");
  });
});

describe("cifras com chave", () => {
  it("Beaufort (recíproca)", () => {
    expect(out(beaufort, "DANZQ", "KEY")).toContain("HELLO");
  });
  it("Gronsfeld (chave numérica)", () => {
    expect(out(gronsfeld, "KFPMT", "31415")).toContain("HELLO");
  });
});
