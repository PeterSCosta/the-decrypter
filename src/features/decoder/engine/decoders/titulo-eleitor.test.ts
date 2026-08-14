import type { CodeHit } from "@/features/reference/phone-codes";
import { parseTituloEleitor } from "@/features/reference/titulo-eleitor";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as titulo } from "./titulo-eleitor";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => titulo.decode(input, ctx);

/**
 * Todas as âncoras foram calculadas à mão (módulo 11, pesos 2..9 e 7/8/9) e
 * cruzadas com os títulos do dado aberto do TSE — não copiadas de gerador.
 */
describe("título de eleitor (UF)", () => {
  it("1234 5678 09 90 → Santa Catarina, com os dois DVs fechando", () => {
    // 1·2+2·3+3·4+4·5+5·6+6·7+7·8+8·9 = 240; 240 mod 11 = 9 → DV1 = 9.
    // 0·7 + 9·8 + 9·9 = 153; 153 mod 11 = 10 → DV2 = 0.
    const c = decode("123456780990")[0];
    expect(c).toBeDefined();
    expect(c.output).toBe("Santa Catarina (SC)");
    expect(c.render).toBe("code-list");
    expect(c.chainValue).toBe("SC");
    expect(c.notes).toContain("Inscrição 12345678");
    expect((c.data as CodeHit[])[0]).toMatchObject({ code: "09", name: "Santa Catarina" });
  });

  it("aceita o número agrupado como o TSE imprime", () => {
    expect(decode("1234 5678 0990")[0]?.output).toBe("Santa Catarina (SC)");
    expect(decode("  123456780990  ")[0]?.output).toBe("Santa Catarina (SC)");
  });

  it("resto 10 vira dígito 0 (armadilha (a))", () => {
    // 0·2+0·3+4·4+3·5+5·6+6·7+8·8+7·9 = 230; 230 mod 11 = 10 → DV1 = 0.
    // 0·7 + 9·8 + 0·9 = 72; 72 mod 11 = 6 → DV2 = 6.
    expect(decode("004356870906")[0]?.output).toBe("Santa Catarina (SC)");
  });

  it("resto 0 vira dígito 1 em SP e MG, e 0 no resto do país (armadilha (b))", () => {
    // Inscrição 10000001: 1·2 + 1·9 = 11; 11 mod 11 = 0.
    // SP (01): DV1 = 1. Depois 0·7 + 1·8 + 1·9 = 17; 17 mod 11 = 6 → DV2 = 6.
    expect(decode("100000010116")[0]?.output).toBe("São Paulo (SP)");
    // MG (02): DV1 = 1. Depois 0·7 + 2·8 + 1·9 = 25; 25 mod 11 = 3 → DV2 = 3.
    expect(decode("100000010213")[0]?.output).toBe("Minas Gerais (MG)");
    // RJ (03), mesma inscrição: DV1 = 0. Depois 0·7 + 3·8 + 0·9 = 24 → DV2 = 2.
    expect(decode("100000010302")[0]?.output).toBe("Rio de Janeiro (RJ)");

    // O erro que a armadilha causa: aplicar a regra geral em SP recusaria o
    // título paulista de verdade e aceitaria este, que não existe.
    expect(decode("100000010108")).toEqual([]);
  });

  it("a exceção de SP/MG vale também para o SEGUNDO verificador", () => {
    // Inscrição 10000013 → soma 37; 37 mod 11 = 4 → DV1 = 4.
    // 0·7 + 1·8 + 4·9 = 44; 44 mod 11 = 0 → SP: DV2 = 1 (não 0).
    expect(decode("100000130141")[0]?.output).toBe("São Paulo (SP)");
    expect(decode("100000130140")).toEqual([]);
  });

  it("código 28 é título emitido no exterior", () => {
    // 2·2+8·3+3·4+7·5+4·6+6·7+5·8+1·9 = 190; 190 mod 11 = 3 → DV1 = 3.
    // 2·7 + 8·8 + 3·9 = 105; 105 mod 11 = 6 → DV2 = 6.
    const c = decode("283746512836")[0];
    expect(c?.output).toBe("Exterior (ZZ)");
    expect(c?.chainValue).toBe("ZZ");
  });

  it("recusa DV errado e código de UF fora da faixa 01–28", () => {
    expect(decode("123456780991")).toEqual([]); // DV2 errado
    expect(decode("123456780890")).toEqual([]); // UF trocada, DVs não acompanham
    expect(decode("123456782990")).toEqual([]); // UF 29 não existe
    expect(decode("123456780090")).toEqual([]); // UF 00 não existe
  });

  it("gate anti-ruído: não dispara em nada que a bancada recebe todo dia", () => {
    for (const noise of [
      "89010000", // CEP
      "11144477735", // CPF
      "47999887766", // telefone com DDD
      "5547999887766", // telefone com DDI
      "-26.9081, -48.6612", // coordenada
      "26.9081 48.6612", // coordenada sem sinal: 12 dígitos, mas tem ponto
      "26/09/1990", // data
      "7891234567895", // EAN-13
      "SGVsbG8gbXVuZG8=", // Base64
      "o rato roeu a roupa do rei de roma", // prosa
      "1234 5678 0990 1234", // longo demais
      "12345678099", // curto demais
      "", // vazio
    ]) {
      expect(decode(noise), noise).toEqual([]);
    }
  });

  it("números aleatórios de 12 dígitos passam em menos de 1%", () => {
    // O gate é UF válida (28/100) × dois módulos 11 — ~1 em 360 na teoria.
    let seed = 20260814;
    let hits = 0;
    const total = 20000;
    for (let i = 0; i < total; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const n = String(seed % 1000000).padStart(6, "0");
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const digits = n + String(seed % 1000000).padStart(6, "0");
      if (decode(digits).length > 0) hits++;
    }
    expect(hits / total).toBeLessThan(0.01);
  });

  it("o formato de 13 dígitos é recusado, não chutado", () => {
    expect(parseTituloEleitor("1234567890990")).toBeNull();
    expect(decode("1234567890990")).toEqual([]);
  });
});
