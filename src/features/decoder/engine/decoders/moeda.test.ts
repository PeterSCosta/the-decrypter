import { CURRENCIES } from "@/features/reference/currency";
import type { CodeHit } from "@/features/reference/phone-codes";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as moeda } from "./moeda";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => moeda.decode(input, ctx);
const hits = (input: string) => (decode(input)[0]?.data ?? []) as CodeHit[];

describe("Moeda (ISO 4217)", () => {
  it("USD → dólar americano, $, 840, Estados Unidos e os dolarizados", () => {
    const c = decode("USD")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("code-list");
    const [h] = c.data as CodeHit[];
    expect(h.code).toBe("USD");
    expect(h.name).toBe("dólar americano · $");
    expect(h.detail).toContain("nº 840");
    expect(h.detail).toContain("Estados Unidos");
    expect(h.detail).toContain("Equador");
    expect(h.detail).toContain("El Salvador");
    expect(h.detail).toContain("Panamá");
    // Entrou pela letra, sai pelo número — a cadeia continua.
    expect(c.chainValue).toBe("840");
  });

  it("BRL → real, R$, 986, Brasil", () => {
    const [h] = hits("BRL");
    expect(h.name).toBe("real · R$");
    expect(h.detail).toContain("nº 986");
    expect(h.detail).toContain("Brasil");
  });

  it("986 → real (código numérico), e encadeia o alfabético", () => {
    const c = decode("986")[0];
    expect((c.data as CodeHit[])[0].code).toBe("BRL");
    expect(c.chainValue).toBe("BRL");
  });

  it("JPY tem 0 casas decimais — quem assume 2 erra", () => {
    const [h] = hits("JPY");
    expect(h.name).toBe("iene japonês · ¥");
    expect(h.detail).toContain("0 casas decimais");
    expect(hits("BHD")[0].detail).toContain("3 casas decimais");
    expect(hits("XAU")[0].detail).toContain("não se aplica");
  });

  it("aceita minúscula e lista vários códigos de uma vez", () => {
    expect(hits("usd")[0].code).toBe("USD");
    const c = decode("BRL, USD, EUR")[0];
    expect((c.data as CodeHit[]).map((h) => h.code)).toEqual(["BRL", "USD", "EUR"]);
    expect(c.chainValue).toBe("986 840 978");
  });

  it("símbolo inequívoco resolve; o ambíguo responde mais baixo; '$' não entra", () => {
    expect(hits("R$")[0].code).toBe("BRL");
    expect(hits("€")[0].code).toBe("EUR");
    expect(decode("R$")[0].forcedScore).toBe(0.55);

    const iene = decode("¥")[0];
    expect((iene.data as CodeHit[]).map((h) => h.code).sort()).toEqual(["CNY", "JPY"]);
    expect(iene.forcedScore).toBeLessThan(0.55);

    // 29 moedas usam "$": listar todas seria ruído, não resposta.
    expect(decode("$")).toEqual([]);
  });

  it("código retirado explica a substituição em vez de calar", () => {
    const c = decode("BGN")[0];
    expect(c.output).toContain("lev búlgaro");
    expect(c.output).toContain("EUR");
    expect(c.chainValue).toBe("EUR");
    expect(decode("HRK")[0].output).toContain("kuna croata");
    expect(decode("ZWL")[0].output).toContain("ZWG");
  });

  it("acompanha a norma de 2026: BGN saiu, ZWG/XCG/SLE estão dentro", () => {
    const codes = new Set(CURRENCIES.map((c) => c.code));
    expect(codes.has("BGN")).toBe(false);
    expect(codes.has("HRK")).toBe(false);
    expect(codes.has("ANG")).toBe(false);
    for (const novo of ["ZWG", "XCG", "SLE", "VED", "XAD"]) expect(codes.has(novo)).toBe(true);
    // Bulgária entrou no euro em 1º/1/2026 — a lista de países do euro sabe disso.
    expect(hits("EUR")[0].detail).toContain("Bulgária");
  });

  it("a tabela está íntegra: 178 ativos, código e número únicos", () => {
    expect(CURRENCIES).toHaveLength(178);
    expect(new Set(CURRENCIES.map((c) => c.code)).size).toBe(178);
    expect(new Set(CURRENCIES.map((c) => c.num)).size).toBe(178);
    for (const c of CURRENCIES) {
      expect(c.code).toMatch(/^[A-Z]{3}$/);
      expect(c.num).toMatch(/^\d{3}$/);
      expect(c.name).not.toBe("");
      expect(c.places).not.toBe("");
    }
  });

  it("gate: não dispara em documento, telefone, prosa nem trio de letras qualquer", () => {
    for (const ruido of [
      "89066730", // CEP
      "111.444.777-35", // CPF
      "47 3221 5144", // telefone
      "-26.9194, -49.0661", // coordenada
      "12/05/2024", // data
      "SGVsbG8gbXVuZG8=", // Base64
      "84 79 80 79", // A1Z26
      "a chave está embaixo do tapete", // prosa
      "XPTO", // 4 letras
      "QQQ", // trio sem moeda
      "12", // número curto
      "840840", // número comprido
      "USD BRL EUR JPY CHF CAD GBP", // tokens demais
      "USD e BRL", // tem palavra no meio
    ]) {
      expect(decode(ruido), ruido).toEqual([]);
    }
  });
});
