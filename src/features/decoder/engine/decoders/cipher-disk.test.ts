import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { type CipherDiskWheel, decoders as disk } from "./cipher-disk";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => disk.decode(input, ctx);
const outputs = (input: string) => decode(input).map((c) => c.output);

/**
 * Âncoras DERIVADAS (não são texto do acervo). A prova GIA-17 "Círculos" é
 * imagem — o acervo dá o disco (26 casas, linha vermelha no começo) e a resposta
 * UMA BICICLETA, não os números. A contagem "21 13 1 / 2 9 3 / 9 3 12 / 5 20 1"
 * é a leitura identidade dessa resposta, derivada aqui; a versão girada é a
 * mesma resposta num disco com F na linha vermelha.
 */
const IDENTIDADE = "21 13 1 / 2 9 3 / 9 3 12 / 5 20 1";
const ORIGEM_F = "16 8 22 / 23 4 24 / 4 24 7 / 26 15 22";
/** A mesma resposta num disco com U na linha vermelha e o alfabeto ao contrário. */
const ANTI_HORARIO = "1 9 21 / 20 13 19 / 13 19 10 / 17 2 21";

describe("roda alfabética (A1Z26 parametrizado)", () => {
  it("disco com F na linha vermelha devolve a resposta da GIA-17", () => {
    const c = decode(ORIGEM_F)[0];
    expect(c?.output).toBe("umabicicleta");
    expect(c?.label).toBe("origem F · horário · 1ª casa = 1");
    expect(c?.chainValue).toBe("umabicicleta");
    expect(c?.render).toBe("wheel");
  });

  it("pula a identidade e a espelhada — são o a1z26 e o a1z26-reverse", () => {
    const got = outputs(IDENTIDADE);
    expect(got.length).toBeGreaterThan(0);
    // 21→u, 13→m, 1→a … : a leitura direta é do `a1z26`.
    expect(got).not.toContain("umabicicleta");
    // 21→f, 13→n, 1→z … : a espelhada é do `a1z26-reverse`.
    expect(got).not.toContain("fnzyrxrxovgz");
  });

  it("entrega no máximo 3 rodas, na faixa da tabela do César", () => {
    const cands = decode(ORIGEM_F);
    expect(cands).toHaveLength(3);
    expect(cands.map((c) => c.forcedScore)).toEqual([0.38, 0.37, 0.36]);
    expect(new Set(cands.map((c) => c.output)).size).toBe(3);
  });

  it("o payload da roda descreve o disco inteiro", () => {
    const w = decode(ORIGEM_F)[0]?.data as CipherDiskWheel;
    expect(w.sectorCount).toBe(26);
    expect(w.origin).toBe("F");
    expect(w.originIndex).toBe(5);
    expect(w.direction).toBe("cw");
    expect(w.base).toBe(1);
    expect(w.sectors).toHaveLength(26);
    // A linha vermelha é a casa 1 e carrega a origem; daí o alfabeto anda.
    expect(w.sectors[0]).toEqual({ slot: 0, value: 1, letter: "F" });
    expect(w.sectors[1]).toEqual({ slot: 1, value: 2, letter: "G" });
    // Volta o disco: depois de Z vem A.
    expect(w.sectors[21]).toEqual({ slot: 21, value: 22, letter: "A" });
    expect(w.reading[0]).toEqual({ value: 16, slot: 15, letter: "U" });
    expect(w.reading.map((r) => r.letter).join("")).toBe("UMABICICLETA");
  });

  it("disco com o alfabeto anti-horário também é varrido", () => {
    const c = decode(ANTI_HORARIO)[0];
    expect(c?.output).toBe("umabicicleta");
    expect(c?.label).toBe("origem U · anti-horário · 1ª casa = 1");
    const w = c?.data as CipherDiskWheel;
    expect(w.direction).toBe("ccw");
    // Anti-horário: da casa 1 (U) a próxima anda para TRÁS no alfabeto.
    expect(w.sectors[0].letter).toBe("U");
    expect(w.sectors[1].letter).toBe("T");
  });

  it("uma lista com 0 e 26 não cabe num disco de 26 casas", () => {
    expect(decode("0 13 26")).toEqual([]);
  });

  it("com 0 na lista, a base é 0 (o a1z26 nem acende)", () => {
    const w = decode("0 4 20 25")[0]?.data as CipherDiskWheel;
    expect(w.base).toBe(0);
    expect(w.sectors[0].value).toBe(0);
  });

  it("gate: texto, poucos números e valores fora da faixa não acendem a roda", () => {
    expect(decode("uma bicicleta")).toEqual([]);
    expect(decode("roda 12 8 3")).toEqual([]);
    expect(decode("21 13")).toEqual([]);
    expect(decode("84 79 80 79")).toEqual([]); // ASCII, não casa de roda
    expect(decode("12 08 2026")).toEqual([]); // ano de 4 dígitos
    expect(decode("")).toEqual([]);
  });
});
