import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as base36 } from "./base36";
import { decoders as base91 } from "./base91";

const ctx = { key: "", streets: null } as DecodeContext;
// `mapDecoder` devolve UM decoder, não uma lista.
const d36 = (s: string) => base36.decode(s, ctx);
const d91 = (s: string) => base91.decode(s, ctx);

describe("Base36 (número)", () => {
  it("decodifica com o mesmo resultado do toString(36) do JS", () => {
    // Verdade de referência: (2**31 - 1).toString(36) === "zik0zj"
    expect(d36("zik0zj")[0].output).toBe("2147483647");
    // `hello` saiu do teste porque saiu do portão: sem dígito, não dispara mais
    // (ver o bloco do portão em `base36.ts`). A verdade de referência continua
    // sendo o `parseInt(_, 36)`, agora num token que a bancada de fato aceita.
    expect(d36("h3llo")[0].output).toBe(String(Number.parseInt("h3llo", 36)));
  });

  it("caixa não importa", () => {
    expect(d36("ZIK0ZJ")[0].output).toBe(d36("zik0zj")[0].output);
  });

  it("passa de MAX_SAFE_INTEGER sem arredondar", () => {
    // 13 caracteres, com dígito para passar no portão novo. O que este teste
    // prende é o `BigInt`: com `Number` o resultado sairia arredondado — errado
    // sem avisar, que é o pior tipo de resposta nesta bancada.
    const s = "1zzzzzzzzzzzz";
    let exato = 0n;
    for (const c of s) exato = exato * 36n + BigInt(Number.parseInt(c, 36));
    expect(d36(s)[0].output).toBe(exato.toString());
    expect(Number(d36(s)[0].output)).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
  });

  /**
   * O portão apertou na Onda 0: a rejeição medida era 1,8% contra o piso de
   * admissão de 79,8% da casa, porque TODA palavra portuguesa é um Base36
   * válido. Exigir letra E dígito leva a rejeição a 77,7% na mesma amostra, e o
   * que sai são exatamente as palavras.
   */
  it("palavra portuguesa pura não dispara mais", () => {
    for (const p of ["resposta", "monumento", "prefeitura", "blumenau", "hello"]) {
      expect(d36(p), p).toEqual([]);
    }
  });

  it("acima de 13 caracteres não é identificador, é texto", () => {
    expect(d36("a1b2c3d4e5f6g7")).toEqual([]);
  });

  it("só dígitos não dispara — é decimal, e o conversor de base já cobre", () => {
    expect(d36("12345")).toEqual([]);
  });

  it("caractere fora do alfabeto não dispara", () => {
    expect(d36("ab-cd")).toEqual([]);
    expect(d36("olá")).toEqual([]);
  });
});

describe("Base91 (basE91)", () => {
  it("decodifica os vetores da implementação de referência", () => {
    // Gerados com o codificador de base91.sourceforge.net — não chutados.
    expect(d91("fPNKd")[0].output).toBe("test");
    expect(d91(">OwJh>A")[0].output).toBe("Hello");
  });

  it("texto longo fecha a densidade variável de 13/14 bits", () => {
    // Onde 13 e 14 bits se alternam — é o que quebra implementação ingênua.
    expect(d91("si;ge,EI6U")[0].output).toBe("Blumenau");
    expect(d91('("a];mfP=Cc,qi/R|+[E')[0].output).toBe("A Ponte de Ferro");
  });

  it("caractere fora dos 91 não dispara", () => {
    // Hífen, barra invertida e aspas simples ficam de fora do alfabeto.
    expect(d91("abc-def")).toEqual([]);
    expect(d91("abc'def")).toEqual([]);
  });

  it("curto demais não vira card", () => {
    expect(d91("ab")).toEqual([]);
  });
});
