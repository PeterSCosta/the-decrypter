import { describe, expect, it } from "vitest";
import type { DecodeContext, Decoder } from "../types";
import { decoders as base32hex } from "./base32hex";
import { decoders as base45 } from "./base45";
import { decoders as rot518 } from "./rot5-18";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const out = (d: Decoder, input: string) => d.decode(input, ctx).map((c) => c.output);

describe("mais codificações (lote 2)", () => {
  it("ROT5 (dígitos)", () => {
    expect(out(rot518[0], "12345")).toContain("67890");
  });
  it("ROT18 (letras + dígitos)", () => {
    expect(out(rot518[1], "Hello123")).toContain("Uryyb678");
  });
  it("Base45 (RFC 9285)", () => {
    expect(out(base45, "BB8")).toContain("AB");
  });
  it("Base32hex (RFC 4648)", () => {
    expect(out(base32hex, "CPNMUOJ1E8")).toContain("foobar");
  });
});
