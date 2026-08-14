import { faberLetters } from "@/features/reference/faber-castell";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as faber } from "./faber-castell";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const only: DecodeContext = { ...ctx, only: "faber-castell" };
const decode = (input: string, c: DecodeContext = ctx) => faber.decode(input, c);
const output = (input: string, c: DecodeContext = ctx) => decode(input, c)[0]?.output ?? "";

/** A prova conta a k-ésima letra do nome ignorando espaço; acento vale 1. */
const nth = (name: string, k: number) => (faberLetters(name)[k - 1] ?? "").toUpperCase();

describe("Faber-Castell: código → nome da cor", () => {
  it("âncora GIA-39: 015 é Laranja escuro, e a 11ª letra é U", () => {
    expect(output("015")).toBe("Laranja escuro");
    expect(nth(output("015"), 11)).toBe("U");
  });

  it("a lista inteira do enunciado resolve as 12 cores", () => {
    const c = decode("015, 076, 038, 091, 037, 005, 010, 071, 083, 082, 696, 081")[0];
    expect(c.output.split(" · ")).toEqual([
      "Laranja escuro",
      "Marrom",
      "Lilás",
      "Bordô",
      "Violeta",
      "Amarelo canário",
      "Areia",
      "Verde claro",
      "Marrom claro",
      "Ocre",
      "Prata",
      "Cinza quente",
    ]);
    // Encadeia como uma cor por linha — é o formato de "Letra por posição".
    expect(c.chainValue?.split("\n")).toHaveLength(12);
    expect(c.label).toBeUndefined();
  });

  it("11 das 12 células do gabarito fecham em UMA BICICLETA — a 038 é KNOWN-BAD", () => {
    // [código, índice pedido, letra do gabarito]. A célula 038 diz A, mas
    // "Lilás"[3] = L. O erro é do GABARITO, não do código: não caçar bug aqui.
    const gabarito: [code: string, k: number, letra: string][] = [
      ["015", 11, "U"],
      ["076", 6, "M"],
      ["038", 3, "A"], // known-bad
      ["091", 1, "B"],
      ["037", 2, "I"],
      ["005", 8, "C"],
      ["010", 4, "I"],
      ["071", 6, "C"],
      ["083", 8, "L"],
      ["082", 4, "E"],
      ["696", 4, "T"],
      ["081", 5, "A"],
    ];
    const lidas = gabarito.map(([code, k]) => nth(output(code), k));
    expect(lidas.join("")).toBe("UMLBICICLETA");
    // as outras 11 batem célula a célula
    const fecham = gabarito.filter(([code], i) => code !== "038" && lidas[i] === gabarito[i][2]);
    expect(fecham).toHaveLength(11);
    // e a divergência é exatamente a 038 (gabarito A, tabela L)
    expect(nth(output("038"), 3)).toBe("L");
  });
});

describe("Faber-Castell: portão e degradação", () => {
  it("degrada explicitamente: 3 dígitos fora da tabela viram 'não catalogado'", () => {
    const c = decode("015 999")[0];
    expect(c.output).toBe("Laranja escuro · não catalogado");
    expect(c.label).toBe("1 de 2 não catalogado(s)");
    expect(c.notes).toContain("999 → não catalogado");
    expect(c.notes).toContain("gabarito da GIA-39");
    expect(c.chainValue).toBe(""); // com furo no meio, indexar daria letra errada
    expect(c.forcedScore).toBe(0.3);
  });

  it("nenhum código conhecido: cala no fan-out, responde no modo uma cifra só", () => {
    expect(decode("999 998")).toEqual([]);
    expect(output("999 998", only)).toBe("não catalogado · não catalogado");
  });

  it("só dispara com tokens de exatamente 3 dígitos", () => {
    expect(decode("15")).toEqual([]); // 2 dígitos
    expect(decode("0155")).toEqual([]); // 4 dígitos
    expect(decode("015 76")).toEqual([]); // um token fora do formato derruba a lista
    expect(decode("015A")).toEqual([]);
    expect(decode("Laranja escuro")).toEqual([]);
    expect(decode("")).toEqual([]);
    // e o portão não afrouxa no modo uma cifra só
    expect(decode("15", only)).toEqual([]);
  });
});
