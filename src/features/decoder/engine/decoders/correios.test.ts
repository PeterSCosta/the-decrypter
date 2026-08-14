import type { S10Hit } from "@/features/reference/correios";
import { describe, expect, it } from "vitest";
import { partition, runDecoders } from "../run";
import type { DecodeContext } from "../types";
import { decoders as correios } from "./correios";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => correios.decode(input, ctx);
const items = (input: string) => decode(input)[0].data as S10Hit[];

describe("Rastreio postal (Correios / UPU S10)", () => {
  it("PB123456785BR: DV 5 confere, postado no Brasil", () => {
    // 1..8 × pesos 8 6 4 2 3 5 9 7 = 204 · 204 mod 11 = 6 · 11 − 6 = 5.
    const c = decode("PB123456785BR")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("code-list");
    expect(c.forcedScore).toBe(0.9);
    expect(c.chainValue).toBe("12345678");
    expect(c.output).toContain("DV confere");
    expect(c.notes).toContain("soma 204");
    expect(c.notes).toContain("postado no Brasil");

    const [svc, serial, dv, country] = items("PB123456785BR");
    expect(svc.code).toBe("PB");
    expect(svc.detail).toContain("PA–PZ");
    expect(serial.code).toBe("12345678");
    expect(dv.name).toBe("dígito verificador confere");
    expect(country.code).toBe("BR");
    expect(country.name).toBe("Brasil");
  });

  it("a faixa doméstica não chuta SEDEX nem PAC", () => {
    // A norma S10 classifica por tipo de produto; o serviço comercial é do
    // operador local. Chutar aqui seria inventar tabela.
    const c = decode("PB123456785BR")[0];
    expect(c.notes).toContain("não consta da norma");
    expect(c.output).not.toMatch(/SEDEX|PAC/i);
  });

  // Os cinco exemplos publicados na própria norma S10-12 (tabela 5.6).
  it.each([
    ["EE123456785KR", "EMS — expressa internacional", "Coreia do Sul"],
    ["RR876543216ER", "carta registrada", "Eritreia"],
    ["VA456789015KG", "carta com valor declarado", "Quirguistão"],
    ["CP654321092GM", "encomenda (parcel post)", "Gâmbia"],
    ["CV010000155UA", "encomenda (parcel post)", "Ucrânia"],
  ])("exemplo canônico da UPU: %s", (code, service, country) => {
    const c = decode(code)[0];
    expect(c.forcedScore).toBe(0.9);
    expect(c.output).toContain("DV confere");
    expect(c.output).toContain(service);
    expect(c.output).toContain(country);
  });

  it("os dois desvios do módulo 11 da norma", () => {
    // resto 0 → 11 − 0 = 11, que a norma manda virar 5 (VA456789015KG).
    expect(decode("VA456789015KG")[0].notes).toContain("11 vira 5");
    // resto 1 → 11 − 1 = 10, que a norma manda virar 0. Série 00000008:
    // só o último dígito pesa, 8 × 7 = 56 · 56 mod 11 = 1.
    const c = decode("RA000000080BR")[0];
    expect(c.output).toContain("DV confere");
    expect(c.notes).toContain("10 vira 0");
  });

  it("país de postagem estrangeiro é o pulo internacional", () => {
    const c = decode("RA123456785GB")[0];
    expect(c.notes).toContain("postado fora do Brasil (Reino Unido)");
  });

  it("aceita minúsculas, espaços e hífens da etiqueta", () => {
    expect(decode("pb 1234-5678-5 br")[0].output).toContain("DV confere");
  });

  it("DV furado vira diagnóstico, abaixo do corte de 0.35", () => {
    const c = decode("PB123456787BR")[0];
    expect(c.forcedScore).toBe(0.2);
    expect(c.forcedScore).toBeLessThan(0.35);
    expect(c.output).toContain("esperado 5, veio 7");
  });

  it("sem o DV, calcula o dígito que falta", () => {
    const c = decode("PB12345678BR")[0];
    expect(c.output).toBe("PB123456785BR");
    expect(c.chainValue).toBe("PB123456785BR");
    expect(c.notes).toContain("calculado: 5");
  });

  it("sem DV e com prefixo de faixa reservada/não atribuída, cala", () => {
    expect(decode("JJ12345678BR")).toEqual([]); // JA–JZ é reservada
    expect(decode("AA12345678BR")).toEqual([]); // AA–AU não é atribuída
  });

  it("sufixo que não é país ISO 3166-1 não é código S10", () => {
    expect(decode("PB123456785XX")).toEqual([]);
    expect(decode("PB123456785QQ")).toEqual([]);
  });

  it("DV furado com prefixo implausível também cala", () => {
    expect(decode("JJ123456787BR")).toEqual([]);
    expect(decode("AA123456787BR")).toEqual([]);
  });
});

describe("Rastreio postal — portão anti-ruído", () => {
  const NOISE = [
    "89010-000", // CEP
    "89010000",
    "111.444.777-35", // CPF
    "11144477735",
    "(47) 99123-4567", // telefone
    "5547991234567",
    "-26.9194, -48.6717", // coordenada
    "26°55'09\"S 48°40'18\"W",
    "14/08/2026", // data
    "2026-08-14",
    "U29jb3JybyBubyBwaWVy", // Base64
    "O pacote chegou ao centro de distribuição de Itajaí", // prosa
    "PB123456785", // sem país
    "123456785BR", // sem serviço
    "PB1234567895BR", // um dígito a mais
    "P1234567859BR", // uma letra a menos
  ];

  it.each(NOISE)("não dispara em %s", (input) => {
    expect(decode(input)).toEqual([]);
  });

  it("na bancada inteira, o ruído não produz um card de rastreio", () => {
    for (const input of NOISE) {
      const ids = runDecoders(input, ctx).results.map((r) => r.decoderId);
      expect(ids).not.toContain("correios");
    }
  });

  it("na bancada inteira, o código válido cai no balde dos prováveis", () => {
    // Não se afirma a liderança: o `location` também casa 13 caracteres do
    // alfabeto do Geohash e devolve uma coordenada polar degenerada com o mesmo
    // 0.9 — falso positivo dele, anterior a este decoder (ver relatório).
    const { likely } = partition(runDecoders("PB123456785BR", ctx).results);
    expect(likely.map((r) => r.decoderId)).toContain("correios");
    expect(likely.find((r) => r.decoderId === "correios")?.score).toBe(0.9);
  });
});
