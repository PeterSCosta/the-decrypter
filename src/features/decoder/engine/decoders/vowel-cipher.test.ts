import { describe, expect, it } from "vitest";
import { cipherDecoders } from "../ciphers";
import type { DecodeContext } from "../types";
import { decoders as vowelCipher } from "./vowel-cipher";

const ctx = (key = ""): DecodeContext => ({ key, streets: null, ceps: null });
const run = (input: string, key = "") => vowelCipher.decode(input, ctx(key));
const out = (input: string, key = "") => run(input, key).map((c) => c.output);

describe("cifra vocálica — GIA-22 (I lingii di i)", () => {
  // Âncora do acervo: gia-2026/gia-22-lingii-di-i/texto/enunciado.md.
  // A chave vem impressa como linha isolada e a resposta da prova é a
  // concatenação das imagens das vogais — LAPIS —, não o texto decifrado.
  it("+11 -4 +7 -6 -2 → LAPIS, direto da entrada", () => {
    expect(out("+11 -4 +7 -6 -2")).toEqual(["LAPIS"]);
  });

  it("mostra a derivação vogal a vogal nas notas", () => {
    expect(run("+11 -4 +7 -6 -2")[0].notes).toBe("A+11=L · E-4=A · I+7=P · O-6=I · U-2=S");
  });

  it("aceita o menos tipográfico, como RESOLUCOES.md escreve (E−4=A)", () => {
    expect(out("+11 −4 +7 −6 −2")).toEqual(["LAPIS"]);
  });

  it("com texto na entrada e a lista na chave, LAPIS vem primeiro", () => {
    const cands = run("vogais", "+11 -4 +7 -6 -2");
    expect(cands[0].output).toBe("LAPIS");
    expect(cands.map((c) => c.output)).toContain("viglps"); // vogais → v i g l p s
  });
});

describe("cifra vocálica — deslocamento posição a posição (GIA-26)", () => {
  // Caso CANÔNICO, não do acervo: a resolução de gia-26-legado-mundial descreve
  // a mecânica ("número de participações … César normal (+) ou invertida (−)"),
  // mas os pares letra/deslocamento saem dos escudos, que são imagem.
  it("a n-ésima letra anda o n-ésimo valor", () => {
    expect(out("ABCD", "+2 +13 +13 -3")).toContain("COPA");
  });

  it("preserva pontuação e caixa", () => {
    expect(out("Ab, cd", "+1 -1")).toContain("Ba, dc");
  });
});

describe("cifra vocálica — portão", () => {
  it("exige sinal explícito, para não brigar com o a1z26", () => {
    expect(out("11 4 7 6 2")).toEqual([]);
    // e o a1z26 de fato não enxerga a lista assinada — o espaço está livre
    const a1z26 = cipherDecoders.find((d) => d.id === "a1z26");
    expect(a1z26?.decode("+11 -4 +7 -6 -2", ctx())).toEqual([]);
  });

  it("cala em texto comum sem chave", () => {
    expect(out("as vogais desempenham papel fundamental")).toEqual([]);
    expect(out("+11")).toEqual([]);
  });

  it("sem cinco deslocamentos não inventa imagens de vogais", () => {
    expect(out("+2 +13 +13 -3")).toEqual([]);
  });
});
