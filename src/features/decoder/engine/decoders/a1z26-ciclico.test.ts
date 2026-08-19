import { describe, expect, it } from "vitest";
import { runDecoders } from "../run";
import { scorePlaintext } from "../score";
import type { DecodeContext } from "../types";
import { decoders as ciclico } from "./a1z26-ciclico";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => ciclico.decode(input, ctx);
const saidas = (input: string) => decode(input).map((c) => c.output);
/** A leitura de uma base específica — a ORDEM dos cartões é por score, não por base. */
const porBase = (input: string, base: 0 | 1) =>
  decode(input).find((c) => c.label?.startsWith(`base ${base}`));

/** Os cartões da família A1Z26 que a bancada inteira devolve para uma entrada. */
const FAMILIA = new Set(["a1z26", "a1z26-reverse", "cipher-disk", "a1z26-ciclico"]);
const familia = (input: string) =>
  runDecoders(input, ctx).results.filter((r) => FAMILIA.has(r.decoderId));

describe("A1Z26 cíclico", () => {
  it("lê a contagem que passou de 26 — o caso que devolvia ZERO cartão", () => {
    // Medido antes deste arquivo: "27 5 12 1" dava 12 resultados e NENHUM da
    // família A1Z26 (o token de 2 dígitos e a faixa 1..26 comiam a entrada).
    expect(saidas("27 5 12 1")).toEqual(["aela", "bfmb"]);
    expect(familia("27 5 12 1").map((r) => r.decoderId)).toEqual([
      "a1z26-ciclico",
      "a1z26-ciclico",
    ]);
  });

  it("27→A, 28→B, 53→A: quem dá a volta é o alfabeto", () => {
    // 26 ainda é Z na base 1; o 53 já é a 3ª volta.
    expect(porBase("26 27 28 53", 1)?.output).toBe("zaba");
    expect(porBase("26 27 28 53", 0)?.output).toBe("abcb");
  });

  it("marca a base no rótulo e conta as voltas na nota", () => {
    expect(porBase("34 31 38 38 41", 1)?.label).toBe("base 1 (1=A, 27=A)");
    expect(porBase("34 31 38 38 41", 0)?.label).toBe("base 0 (0=A, 26=A)");
    expect(porBase("34 31 38 38 41", 1)?.notes).toBe(
      "5 de 5 valores passam de 26 — o maior (41) cai na 2ª volta. Com a 1ª casa valendo 1: letra = alfabeto[(v − 1) mod 26].",
    );
  });

  it("a leitura que forma palavra real ganha da que não forma", () => {
    const [primeiro, segundo] = decode("34 31 38 38 41");
    expect(primeiro.output).toBe("hello"); // base 1
    expect(segundo.output).toBe("ifmmp"); // base 0 — uma letra adiante, sempre
    // As duas grafias são a MESMA lista: o que separa é o texto que sai.
    expect(scorePlaintext("hello")).toBeGreaterThan(scorePlaintext("ifmmp"));
    expect(primeiro.forcedScore).toBe(scorePlaintext("hello"));
    expect(primeiro.forcedScore ?? 0).toBeGreaterThan(segundo.forcedScore ?? 0);
    // E sobe de verdade na bancada, acima do corte de 0.35 do `partition`.
    const top = familia("34 31 38 38 41")[0];
    expect(top?.output).toBe("hello");
    expect(top?.score).toBeGreaterThan(0.35);
  });

  it("sem palavra, a melhor leitura fica no piso 0.32 — visível, fora do topo", () => {
    const [primeiro, segundo] = decode("30 31 32 33 34");
    expect(new Set(saidas("30 31 32 33 34"))).toEqual(new Set(["defgh", "efghi"]));
    expect(primeiro.forcedScore).toBe(0.32); // abaixo do corte de 0.35
    // A irmã nunca empata com a vencedora: o desempate do motor é por
    // comprimento da saída, e as duas bases têm sempre o mesmo comprimento.
    expect(segundo.forcedScore ?? 0).toBeLessThan(primeiro.forcedScore ?? 0);
  });

  it("NÃO dispara com tudo ≤ 26 — ali quem manda é o a1z26 e a roda", () => {
    expect(decode("21 13 1 2 9 3")).toEqual([]);
    expect(decode("26 26 26 26")).toEqual([]);
    // E a família responde sem ele: o a1z26 lê "umabic" e a roda entra atrás.
    const outros = familia("21 13 1 2 9 3");
    expect(outros.some((r) => r.decoderId === "a1z26" && r.output === "umabic")).toBe(true);
    expect(outros.some((r) => r.decoderId === "a1z26-ciclico")).toBe(false);
  });

  it("teto de 3 voltas: 999999 não é contagem, é número", () => {
    // Sem teto isto lê "mela" — palavra real, por acaso, tirada de um lixo.
    // (É o que o mod 26 sem teto do `math-helper` faz: MELA, 0.562.)
    expect(decode("999999 5 12 1")).toEqual([]);
    expect(saidas("78 5 12 1")).toHaveLength(2); // 78 fecha a 3ª volta: entra
    expect(decode("79 5 12 1")).toEqual([]); // 79 já é ASCII ('O'), não casa
  });

  it("teto: lista de ASCII fica com o decoder `decimal`", () => {
    expect(decode("84 79 80 79")).toEqual([]); // "TOPO" em ASCII
    expect(decode("72 69 76 76 79")).toEqual([]); // "HELLO" em ASCII
    const ascii = runDecoders("84 79 80 79", ctx).results;
    expect(ascii.find((r) => r.decoderId === "decimal")?.output).toBe("TOPO");
  });

  it("coordenada em grau/min/seg não vira letra", () => {
    // Com piso 3 e sem a trava de sinal, "-26 54 32" acendia dois cartões
    // ("acg" 0.32 e "zbf") — e minuto/segundo passam de 26 em 33 dos 60 valores.
    expect(decode("-26 54 32")).toEqual([]); // tripla GMS: 3 valores
    expect(decode("26 54 32")).toEqual([]);
    expect(decode("-26 54 32 -49 4 12")).toEqual([]); // par GMS: o sinal barra
  });

  it("gate: poucos valores, texto e data não acendem", () => {
    expect(decode("27 5 12")).toEqual([]); // 3 valores é o piso da família, não o daqui
    expect(decode("27 5")).toEqual([]);
    expect(decode("roda 27 5 12 1")).toEqual([]);
    expect(decode("12 08 2026")).toEqual([]); // ano de 4 dígitos
    expect(decode("")).toEqual([]);
  });

  it("aceita os separadores da família — inclusive os que o math-helper recusa", () => {
    // "27,5,12,1" é UM token: não passa no portão do `math-helper` (que exige 2
    // tokens separados por espaço), então nem a leitura mod 26 dele existia.
    expect(saidas("27,5,12,1")[0]).toBe("aela");
    expect(saidas("27/5/12/1")[0]).toBe("aela");
    expect(saidas("27-5-12-1")[0]).toBe("aela"); // o "-" entre dígitos é separador
  });
});
