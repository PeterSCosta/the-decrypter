import type { CodeHit } from "@/features/reference/phone-codes";
import {
  MERCOSUL_LETTERS,
  PLATE_RANGES,
  lookupPlateRange,
  toMercosul,
  toOldPlate,
} from "@/features/reference/placa-veiculo";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as placa } from "./placa-veiculo";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string, c: DecodeContext = ctx) => placa.decode(input, c);
const card = (input: string, c: DecodeContext = ctx) => decode(input, c)[0];
const items = (input: string, c: DecodeContext = ctx) => (card(input, c)?.data ?? []) as CodeHit[];

describe("Placa de veículo: conversão antiga ↔ Mercosul", () => {
  it("âncora: ABC-1234 é placa antiga do Paraná e vira ABC1C34", () => {
    const c = card("ABC-1234");
    // O 5º caractere é o 2º dígito (2) virado letra pela tabela 0=A … 9=J.
    expect(c.chainValue).toBe("ABC1C34");
    expect(c.output).toBe("ABC1C34 · Paraná (PR)");
    expect(items("ABC-1234").map((i) => [i.code, i.name])).toEqual([
      ["ABC-1234", "Placa antiga (padrão 1990)"],
      ["ABC1C34", "Equivalente Mercosul"],
      ["AAA–BEZ", "Paraná (PR)"],
    ]);
  });

  it("a faixa nunca é afirmada como fato — sai rotulada para conferência", () => {
    expect(items("ABC-1234")[2].detail).toMatch(/confira/);
  });

  it("aceita a placa sem separador e com ponto, espaço ou bolinha", () => {
    for (const t of ["ABC1234", "ABC 1234", "ABC.1234", "ABC•1234", "abc-1234"]) {
      expect(card(t)?.chainValue).toBe("ABC1C34");
    }
  });

  it("a volta lê a Mercosul e devolve a antiga, avisando que a UF não vem dela", () => {
    const c = card("ABC1C34");
    expect(c.chainValue).toBe("ABC-1234");
    expect(items("ABC1C34").map((i) => [i.code, i.name])).toEqual([
      ["ABC1C34", "Placa Mercosul (padrão 2018)"],
      ["ABC-1234", "Equivalente antiga"],
      ["AAA–BEZ", "Paraná (PR)"],
    ]);
    expect(items("ABC1C34")[2].detail).toMatch(/a Mercosul nativa não codifica estado/);
    expect(c.notes).toMatch(/sequência nacional/);
  });

  it("Mercosul nativa (5ª letra fora de A–J) não tem equivalente antiga", () => {
    const rows = items("ABC1K34");
    expect(rows[1]).toEqual({
      code: "—",
      name: "Sem equivalente antiga",
      detail: expect.stringContaining("a 5ª posição é K"),
    });
    // Sem contraparte, o encadeamento devolve a própria placa.
    expect(card("ABC1K34")?.chainValue).toBe("ABC1K34");
  });

  it("a conversão fecha nos dois sentidos para os 10 dígitos", () => {
    for (let d = 0; d <= 9; d++) {
      const antiga = `XYZ-5${d}78`;
      const merc = toMercosul("XYZ", `5${d}78`);
      expect(merc).toBe(`XYZ5${MERCOSUL_LETTERS[d]}78`);
      expect(toOldPlate("XYZ", "5", MERCOSUL_LETTERS[d], "78")).toBe(antiga);
    }
    expect(toOldPlate("XYZ", "5", "K", "78")).toBeNull();
  });
});

describe("Placa de veículo: faixa de letras por UF", () => {
  // Âncoras conferidas contra duas compilações independentes.
  it.each([
    ["ABC-1234", "Paraná (PR)"],
    ["BEZ-9999", "Paraná (PR)"],
    ["BFA-0001", "São Paulo (SP)"],
    ["GKI-9999", "São Paulo (SP)"],
    ["IAQ-0001", "Rio Grande do Sul (RS)"],
    ["JDO-9999", "Rio Grande do Sul (RS)"],
    ["KMF-0001", "Rio de Janeiro (RJ)"],
    ["LVE-9999", "Rio de Janeiro (RJ)"],
    ["LWR-0001", "Santa Catarina (SC)"],
    ["MMM-0001", "Santa Catarina (SC)"],
  ])("%s cai em %s", (plate, state) => {
    expect(items(plate)[2].name).toBe(state);
  });

  it("as reaberturas por esgotamento vêm numeradas", () => {
    expect(lookupPlateRange("NFC")).toMatchObject({ uf: "GO", seq: 2 });
    expect(items("NFC-0001")[2].name).toBe("Goiás (GO) · 2ª faixa");
  });

  it("acima de OIQ a bancada admite que não sabe, em vez de chutar", () => {
    expect(lookupPlateRange("ZZZ")).toBeNull();
    const row = items("ZZZ-1234")[2];
    expect(row.name).toBe("Faixa não consolidada");
    // Sem UF o cartão perde altura, mas continua convertendo.
    expect(card("ZZZ-1234")?.output).toBe("ZZZ1C34");
    expect(card("ZZZ-1234")?.forcedScore).toBeLessThan(0.8);
  });

  it("a tabela é ordenada e sem sobreposição, e AAA–NFB é contínua", () => {
    let prev = "";
    for (const r of PLATE_RANGES) {
      expect(r.from <= r.to).toBe(true);
      expect(r.from > prev).toBe(true);
      prev = r.to;
    }
    // O trecho corroborado por três fontes não pode ter buraco: cada faixa
    // começa no sucessor do fim da anterior.
    const primary = PLATE_RANGES.filter((r) => r.to <= "NFB");
    expect(primary).toHaveLength(27);
    for (let i = 1; i < primary.length; i++) {
      expect(primary[i].from).toBe(successor(primary[i - 1].to));
    }
    expect(primary[0].from).toBe("AAA");
    expect(primary[primary.length - 1].to).toBe("NFB");
  });
});

describe("Placa de veículo: lista e cor", () => {
  it("uma lista de placas converte todas de uma vez", () => {
    const c = card("ABC-1234, MMM-0001, KMF1D56");
    // KMF1D56 volta pela tabela: D é o índice 3, então a antiga é KMF-1356.
    expect(c.chainValue?.split("\n")).toEqual(["ABC1C34", "MMM0A01", "KMF-1356"]);
    expect(c.notes).toMatch(/3 placas convertidas · 3 com faixa/);
  });

  it("a cor no 2º campo classifica a categoria", () => {
    const rows = items("ABC-1234", { ...ctx, aux: "Vermelha" });
    expect(rows).toHaveLength(4);
    expect(rows[3]).toMatchObject({ code: "vermelho", name: "Comercial (aluguel)" });
    expect(items("ABC-1234", { ...ctx, aux: "dourada" })[3].name).toBe("Diplomática / consular");
    expect(items("ABC-1234", { ...ctx, aux: "cinza" })[3].name).toBe("Colecionador");
  });

  it("um 2º campo que não é cor (chave de outra cifra) não inventa linha", () => {
    expect(items("ABC-1234", { ...ctx, aux: "LIMA" })).toHaveLength(3);
  });
});

describe("Placa de veículo: portão anti-ruído", () => {
  it.each([
    ["89010-000", "CEP"],
    ["89010000", "CEP sem hífen"],
    ["111.444.777-35", "CPF"],
    ["47 3221-5144", "telefone"],
    ["-26.9194, -49.0661", "coordenada"],
    ["14/03/2026", "data"],
    ["SGVsbG8gbXVuZG8=", "Base64"],
    ["GH94RC", "Maidenhead de 6 caracteres"],
    ["Nb114", "âncora GeoHex do Vale"],
    ["o rato roeu a roupa do rei de roma", "prosa"],
    ["rato, roeu, roupa", "prosa com vírgulas"],
    ["ABCD-1234", "4 letras"],
    ["AB-1234", "2 letras"],
    ["ABC-12345", "5 dígitos"],
    ["ABC1C345", "8 caracteres"],
    ["ABC-1234 e mais texto", "placa dentro de uma frase"],
  ])("não dispara em %s (%s)", (input) => {
    expect(decode(input)).toEqual([]);
  });
});

/** Próxima combinação de 3 letras ("BEZ" → "BFA"), para o teste de contiguidade. */
function successor(code: string): string {
  const n = code.split("").reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 65), 0) + 1;
  return [n / 676, (n / 26) % 26, n % 26]
    .map((v) => String.fromCharCode(65 + (Math.floor(v) % 26)))
    .join("");
}
