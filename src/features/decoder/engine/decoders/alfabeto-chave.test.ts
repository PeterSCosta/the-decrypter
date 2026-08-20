import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { setWordSet } from "../score";
import type { DecodeContext } from "../types";
import { alfabetoChaveado, decoders, variantesDe } from "./alfabeto-chave";

const d = Array.isArray(decoders) ? decoders[0] : decoders;
const ctx = (key: string) => ({ key, streets: null, ceps: null }) as unknown as DecodeContext;

const fold = (w: string) => w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

beforeAll(() => {
  const set = new Set(readFileSync("public/data/words-pt.txt", "utf8").split("\n").map(fold));
  setWordSet({ has: (w: string) => set.has(w) } as never);
});

const CLARO = "a chave desta prova esta escondida na ponte de ferro sobre o rio";

describe("o alfabeto construído a partir da palavra", () => {
  it("a palavra vem primeiro, sem repetir letra, e o resto em ordem", () => {
    expect(alfabetoChaveado("limoeiro")).toBe("limoerabcdfghjknpqstuvwxyz");
    expect(alfabetoChaveado("zebra")).toBe("zebracdfghijklmnopqstuvwxy");
  });

  it("sempre 26 letras, sem repetição", () => {
    for (const k of ["a", "limoeiro", "xyz", "abcdefghijklmnopqrstuvwxyz"]) {
      const a = alfabetoChaveado(k);
      expect(a, k).toHaveLength(26);
      expect(new Set(a).size, k).toBe(26);
    }
  });
});

describe("quantas leituras a chave admite", () => {
  /** 26 letras distintas: a chave já É a tabela, não há o que construir. */
  it("alfabeto inteiro dá uma leitura só", () => {
    expect(variantesDe("qwertyuiopasdfghjklzxcvbnm")).toHaveLength(1);
  });

  it("palavra-chave dá as três da literatura clássica", () => {
    const v = variantesDe("limoeiro");
    expect(v.map((x) => x.rotulo)).toEqual([
      "K1 (chave no claro)",
      "K2 (chave no cifrado)",
      "K3 (chave nos dois)",
    ]);
  });

  it("sem chave, nenhuma", () => {
    expect(variantesDe("")).toHaveLength(0);
    expect(variantesDe("   ")).toHaveLength(0);
    expect(variantesDe("123")).toHaveLength(0);
  });
});

describe("o decoder", () => {
  const cifrar = (texto: string, chave: string) => d.encode?.(texto, ctx(chave)) ?? "";

  it("ida e volta com a chave certa", () => {
    const cifrado = cifrar(CLARO, "limoeiro");
    expect(cifrado).not.toBe(CLARO);
    const r = d.decode(cifrado, ctx("limoeiro"));
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].output).toBe(CLARO);
  });

  /**
   * O CONTRATO: sem chave não há o que aplicar. É o mesmo do `vigenere`, do
   * `beaufort` e do `bifid`, e é o que impede este arquivo de virar mais um
   * gerador de variantes no leque de quem não pediu nada.
   */
  it("sem chave, cala", () => {
    expect(d.decode(cifrar(CLARO, "limoeiro"), ctx(""))).toEqual([]);
  });

  /**
   * O PISO. Abaixo de 22 letras o vocabulário não separa acerto de
   * coincidência — mesma razão do piso do solver, com número menor porque aqui
   * a chave já veio pronta.
   */
  it("texto curto demais não passa", () => {
    expect(d.decode(cifrar("a chave", "limoeiro"), ctx("limoeiro"))).toEqual([]);
  });

  /**
   * O PORTÃO DE SAÍDA É O ITEM INTEIRO. Aplicar uma chave nunca falha — sai
   * texto dos dois lados, certo ou errado. Com a chave ERRADA, o que sai é
   * lixo, e lixo não pode virar card: seriam três leituras de aparência
   * técnica, todas erradas, empurrando as hipóteses de verdade para baixo.
   */
  it.each(["chaveerrada", "abacaxi", "montanha", "vermelho", "tijolo", "guitarra", "pantanal"])(
    "com a chave errada (%s), cala",
    (errada) => {
      expect(d.decode(cifrar(CLARO, "limoeiro"), ctx(errada))).toEqual([]);
    },
  );

  it("sem vocabulário conferido, cala — não há como saber qual das três é", () => {
    const cifrado = cifrar(CLARO, "limoeiro");
    setWordSet(null);
    expect(d.decode(cifrado, ctx("limoeiro"))).toEqual([]);
    const set = new Set(readFileSync("public/data/words-pt.txt", "utf8").split("\n").map(fold));
    setWordSet({ has: (w: string) => set.has(w) } as never);
  });

  it("é determinístico", () => {
    const c = cifrar(CLARO, "limoeiro");
    expect(d.decode(c, ctx("limoeiro"))).toEqual(d.decode(c, ctx("limoeiro")));
  });

  /**
   * Das três variantes, no máximo duas chegam à tela — e na prática só a certa
   * passa o corte. O decoder mata as outras em vez de despejá-las.
   */
  it("não despeja as três leituras", () => {
    expect(d.decode(cifrar(CLARO, "limoeiro"), ctx("limoeiro")).length).toBeLessThanOrEqual(2);
  });
});
