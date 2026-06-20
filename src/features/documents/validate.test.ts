import { describe, expect, it } from "vitest";
import {
  formatCnpj,
  formatCpf,
  isAlphanumericCnpj,
  isValidCnpj,
  isValidCpf,
  looksLikeCnpj,
} from "./validate";

describe("CPF", () => {
  it("validates a real CPF (with and without formatting)", () => {
    expect(isValidCpf("08738568993")).toBe(true);
    expect(isValidCpf("087.385.689-93")).toBe(true);
  });
  it("rejects bad check digits and repeated digits", () => {
    expect(isValidCpf("08738568990")).toBe(false);
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
  it("formats", () => {
    expect(formatCpf("08738568993")).toBe("087.385.689-93");
  });
});

describe("CNPJ numérico", () => {
  it("validates a real CNPJ", () => {
    expect(isValidCnpj("00000000000191")).toBe(true);
    expect(isValidCnpj("00.000.000/0001-91")).toBe(true);
  });
  it("rejects bad check digits and repeated chars", () => {
    expect(isValidCnpj("00000000000192")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
  });
  it("formats", () => {
    expect(formatCnpj("00000000000191")).toBe("00.000.000/0001-91");
  });
});

describe("CNPJ alfanumérico (novo formato)", () => {
  // Base alfanumérica + DV calculado pelo mesmo algoritmo (ASCII-48).
  // "12ABC34501DE" é a base; os 2 dígitos são os DVs corretos.
  it("validates an alphanumeric CNPJ and flags it as such", () => {
    const valid = "12ABC34501DE35";
    expect(isValidCnpj(valid)).toBe(true);
    expect(isAlphanumericCnpj(valid)).toBe(true);
  });
  it("a numeric CNPJ is not flagged alphanumeric", () => {
    expect(isAlphanumericCnpj("00000000000191")).toBe(false);
  });
  it("looksLikeCnpj accepts 14-position shapes only", () => {
    expect(looksLikeCnpj("12ABC34501DE35")).toBe(true);
    expect(looksLikeCnpj("123")).toBe(false);
  });
});
