import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as digitCount } from "./digit-count";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => digitCount.decode(input, ctx);

describe("quantidade de dígitos", () => {
  it("11 dígitos sugere CPF e título de eleitor", () => {
    const c = decode("12345678901")[0];
    expect(c).toBeDefined();
    expect(c.label).toBe("11 dígitos");
    expect(c.notes).toContain("CPF");
    expect(c.notes).toContain("Título de eleitor");
  });

  it("8 dígitos sugere CEP / NCM / EAN-8", () => {
    const notes = decode("12345678")[0]?.notes ?? "";
    expect(notes).toContain("CEP");
    expect(notes).toContain("NCM");
    expect(notes).toContain("EAN-8");
  });

  it("14 dígitos sugere CNPJ", () => {
    expect(decode("12345678000199")[0]?.notes).toContain("CNPJ");
  });

  it("intervalo 1–4 cobre nº de rua", () => {
    expect(decode("88")[0]?.notes).toContain("Nº de rua");
  });

  it("ignora entrada com não-dígitos ou > 16", () => {
    expect(decode("12 34")).toEqual([]);
    expect(decode("abc")).toEqual([]);
    expect(decode("12345678901234567")).toEqual([]);
  });
});
