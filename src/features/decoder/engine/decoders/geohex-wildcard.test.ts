import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as gw } from "./geohex-wildcard";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (i: string) => gw.decode(i, ctx);
const mentionsRealCode = (out: ReturnType<typeof decode>) =>
  out.some((c) => JSON.stringify(c.data).includes("Nb11458750330"));

describe("GeoHex curinga", () => {
  it("acha o código real de Blumenau quando falta o último dígito", () => {
    const out = decode("Nb1145875033x");
    expect(out.length).toBeGreaterThan(0);
    expect(mentionsRealCode(out)).toBe(true);
  });

  it("cauda pura tenta o prefixo 'Nb' (Blumenau)", () => {
    const out = decode("1145875033x");
    expect(out.length).toBeGreaterThan(0);
    expect(mentionsRealCode(out)).toBe(true);
  });

  it("não dispara sem curinga ou com poucos dígitos fixos", () => {
    expect(decode("Nb11458750330")).toEqual([]); // sem curinga
    expect(decode("Box")).toEqual([]); // dígitos fixos < 3
  });

  it("bail quando há curingas demais (> cap)", () => {
    expect(decode("Nb11458xxxxx")).toEqual([]); // 5 curingas
  });
});
