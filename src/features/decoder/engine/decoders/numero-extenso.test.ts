import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as extenso } from "./numero-extenso";

const ctx = (only?: string): DecodeContext => ({ key: "", only, streets: null, ceps: null });
const run = (input: string, only?: string) => extenso.decode(input, ctx(only));
const out = (input: string, only?: string) => run(input, only).map((c) => c.output);
const solo = (input: string) => run(input, "numero-extenso");
const byLabel = (input: string, needle: string) =>
  solo(input).find((c) => c.label?.includes(needle))?.output;

describe("número por extenso — extenso → dígitos", () => {
  // Âncora do item: é o valor que segue para o A1Z26 e para o letter-index.
  it("quatrocentos e vinte e três = 423", () => {
    expect(out("quatrocentos e vinte e três")).toEqual(["423"]);
  });

  it("o dígito sai limpo em chainValue, pronto para o A1Z26", () => {
    const c = run("quatrocentos e vinte e três")[0];
    expect(c?.chainValue).toBe("423");
    expect(c?.notes).toBe("3 dígitos");
  });

  it("acento, vírgula e caixa não atrapalham a leitura", () => {
    expect(out("Oitenta e nove milhões, trinta e cinco mil e trinta e dois")).toEqual(["89035032"]);
  });

  it("89035032 lido como CEP é a Rua Itália (Vila Nova, Blumenau) — a prova Bandeiras", () => {
    // A conferência do endereço mora no cep-exact; aqui o que importa é que os
    // 8 dígitos saem inteiros para encadear até lá.
    expect(out("oitenta e nove milhões, trinta e cinco mil e trinta e dois")).toEqual(["89035032"]);
  });

  it("cem e cento não se confundem", () => {
    expect(out("cem")).toEqual([]); // ambígua sozinha, fora do modo solo
    expect(out("cento e um")).toEqual(["101"]);
    expect(out("cem mil e um")).toEqual(["100001"]);
  });

  it("mil dispensa o 'um' na frente, e 'hum mil' de cheque também vale", () => {
    expect(out("mil e quinhentos")).toEqual(["1500"]);
    expect(out("hum mil e quinhentos")).toEqual(["1500"]);
  });

  it("o feminino das centenas lê o mesmo número", () => {
    expect(out("trezentas e vinte e duas")).toEqual(["322"]);
    expect(out("trezentos e vinte e dois")).toEqual(["322"]);
  });

  it("variantes lusitanas e a grafia antiga entram", () => {
    expect(out("dezasseis")).toEqual(["16"]);
    expect(out("quatorze")).toEqual(["14"]);
    expect(out("cincoenta e três")).toEqual(["53"]);
  });

  it("números grandes usam BigInt, sem perder dígito", () => {
    expect(out("novecentos e noventa e nove quatrilhões")).toEqual(["999000000000000000"]);
  });

  it("ordinais somam, do maior para o menor", () => {
    expect(out("vigésimo terceiro")).toEqual(["23"]);
    expect(out("décima primeira")).toEqual(["11"]);
    expect(out("milésimo nongentésimo nonagésimo sétimo")).toEqual(["1997"]);
    expect(run("vigésimo terceiro")[0]?.label).toBe("ordinal → número");
  });
});

describe("número por extenso — dígitos → extenso (só no modo solo)", () => {
  it("a direção dígitos→extenso NÃO participa do fan-out", () => {
    expect(out("423")).toEqual([]);
    expect(out("89035032")).toEqual([]);
  });

  it("89035032 volta com vírgula entre as classes e 'e' antes da última", () => {
    expect(byLabel("89035032", "por extenso")).toBe(
      "oitenta e nove milhões, trinta e cinco mil e trinta e dois",
    );
  });

  // As quatro leituras abaixo são atestadas em fontes independentes; elas
  // fixam a regra de ligação, que é onde as gramáticas divergem.
  it("25.045.915 — classe pequena no meio leva vírgula, não 'e'", () => {
    expect(byLabel("25045915", "por extenso")).toBe(
      "vinte e cinco milhões, quarenta e cinco mil, novecentos e quinze",
    );
  });

  it("2.135.030 — última classe menor que 100 leva 'e'", () => {
    expect(byLabel("2135030", "por extenso")).toBe(
      "dois milhões, cento e trinta e cinco mil e trinta",
    );
  });

  it("1.250.042", () => {
    expect(byLabel("1250042", "por extenso")).toBe(
      "um milhão, duzentos e cinquenta mil e quarenta e dois",
    );
  });

  it("centena exata na última classe também leva 'e'", () => {
    expect(byLabel("2400", "por extenso")).toBe("dois mil e quatrocentos");
    expect(byLabel("516100", "por extenso")).toBe("quinhentos e dezesseis mil e cem");
  });

  it("a escola sem vírgula sai como cartão próprio", () => {
    expect(byLabel("1997", "sem vírgula")).toBe("mil novecentos e noventa e sete");
    expect(byLabel("5800906012", "sem vírgula")).toBe(
      "cinco bilhões oitocentos milhões novecentos e seis mil e doze",
    );
  });

  it("quando as duas escolas coincidem, não há cartão duplicado", () => {
    expect(byLabel("2400", "sem vírgula")).toBeUndefined();
  });

  it("o feminino vem como cartão à parte — 'trezentas' precisa bater no diff", () => {
    expect(byLabel("322", "feminino")).toBe("trezentas e vinte e duas");
    // milhão é substantivo masculino: o feminino pára na classe do mil.
    expect(byLabel("200200", "feminino")).toBe("duzentas mil e duzentas");
    expect(byLabel("200000000", "feminino")).toBeUndefined();
  });

  it("ordinal só até 999, que é onde a norma é pacífica", () => {
    expect(byLabel("423", "ordinal")).toBe("quadringentésimo vigésimo terceiro");
    expect(byLabel("1997", "ordinal")).toBeUndefined();
  });

  it("mil é 'mil', nunca 'um mil'", () => {
    expect(byLabel("1000", "por extenso")).toBe("mil");
    expect(byLabel("1000000", "por extenso")).toBe("um milhão");
  });

  it("encode devolve a forma com vírgula", () => {
    expect(extenso.encode?.("89035032", ctx())).toBe(
      "oitenta e nove milhões, trinta e cinco mil e trinta e dois",
    );
    expect(extenso.encode?.("quatrocentos", ctx())).toBeNull();
  });
});

describe("número por extenso — o portão", () => {
  it("uma palavra fora do léxico derruba a entrada inteira", () => {
    expect(out("mil e uma noites")).toEqual([]);
    expect(out("cinco meses depois")).toEqual([]);
    expect(out("cem por cento")).toEqual([]);
    expect(out("o assassino esteve na cena do crime antes de todos")).toEqual([]);
  });

  it("a gramática do numeral derruba a sequência solta de algarismos falados", () => {
    expect(out("um dois três")).toEqual([]);
    expect(out("vinte trinta")).toEqual([]);
    expect(out("cem cento")).toEqual([]);
    expect(out("mil mil")).toEqual([]);
    expect(out("dez vinte")).toEqual([]);
  });

  it("palavra ambígua sozinha não abre cartão, palavra inequívoca abre", () => {
    for (const w of ["um", "uma", "dois", "duas", "mil", "cem", "zero"]) {
      expect(out(w)).toEqual([]);
    }
    expect(out("quatrocentos")).toEqual(["400"]);
    expect(out("dezessete")).toEqual(["17"]);
  });

  it("a sonda de ruído: nada com dígito dispara fora do modo solo", () => {
    const sonda = [
      "89035-032", // CEP
      "111.444.777-35", // CPF
      "(47) 99999-8888", // telefone
      "-26.909692, -49.084088", // coordenada
      "14/08/2026", // data
      "1997", // ano
    ];
    for (const s of sonda) expect(out(s)).toEqual([]);
  });

  it("Base64 e prosa não são léxico numérico", () => {
    expect(out("cXVhdHJvY2VudG9z")).toEqual([]);
    expect(out("SGVsbG8gV29ybGQ=")).toEqual([]);
    expect(out("a bancada de cifras")).toEqual([]);
  });

  it("'bilião' de pt-PT fica de fora: 10⁹ ou 10¹² é escolha nossa demais", () => {
    expect(out("dois biliões")).toEqual([]);
  });

  it("entrada gigante não vira trabalho", () => {
    expect(out("um ".repeat(200))).toEqual([]);
  });
});
