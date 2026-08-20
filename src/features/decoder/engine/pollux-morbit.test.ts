import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeMorseX, encodeMorseX } from "./morse-x";
import { POLLUX_PADRAO, cifrarPollux, resolverMorbit, resolverPollux } from "./pollux-morbit";
import { coverage, setWordSet } from "./score";

const fold = (w: string) => w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

let nota: (t: string) => number;

beforeAll(() => {
  const set = new Set(readFileSync("public/data/words-pt.txt", "utf8").split("\n").map(fold));
  setWordSet({ has: (w: string) => set.has(w) } as never);
  nota = (t: string) => {
    const c = coverage(t);
    return c.analisado > 0 ? c.covered / c.analisado : 0;
  };
});

const CLAROS = [
  "A PONTE DE FERRO",
  "A PONTE DE FERRO SOBRE O RIO ITAJAI",
  "ENCONTRE A CHAVE ESCONDIDA NA PRACA CENTRAL DE BLUMENAU",
];

describe("o dialeto de Morse com separador x", () => {
  it("ida e volta", () => {
    for (const t of CLAROS) expect(decodeMorseX(encodeMorseX(t))).toBe(t);
  });

  it("recusa o que não é Morse válido", () => {
    // Três separadores seguidos não existem.
    expect(decodeMorseX("...xxx---")).toBeNull();
    // Código mais longo que qualquer um da tabela.
    expect(decodeMorseX("........")).toBeNull();
    expect(decodeMorseX("abc")).toBeNull();
  });
});

describe("o solver de Pollux", () => {
  it("acha o claro e o põe no topo", () => {
    for (const claro of CLAROS) {
      const cif = cifrarPollux(encodeMorseX(claro), POLLUX_PADRAO);
      const r = resolverPollux(cif, 400_000, nota);
      expect(r.res[0]?.texto, claro).toBe(claro);
    }
  });

  /**
   * O TETO É CONTADO, NUNCA CRONOMETRADO. Um teto por relógio faria a mesma
   * entrada dar respostas diferentes em duas teclas seguidas, sem nada na tela
   * explicando por quê.
   */
  it("o trabalho nunca passa do teto, e o estouro é dito", () => {
    const cif = cifrarPollux(encodeMorseX(CLAROS[2]), POLLUX_PADRAO);
    for (const teto of [1_000, 50_000, 400_000]) {
      const r = resolverPollux(cif, teto, nota);
      expect(r.trabalho, `teto ${teto}`).toBeLessThanOrEqual(teto + 1);
      if (r.trabalho > teto) expect(r.estourou).toBe(true);
    }
  });

  it("é determinístico", () => {
    const cif = cifrarPollux(encodeMorseX(CLAROS[0]), POLLUX_PADRAO);
    expect(resolverPollux(cif, 400_000, nota).res).toEqual(resolverPollux(cif, 400_000, nota).res);
  });

  /** Lixo numérico morre cedo: é o que mantém o custo do leque no lugar. */
  it("entrada que não é cifra custa quase nada", () => {
    for (const lixo of ["89010000", "890066508900005089007970", "1".repeat(90)]) {
      expect(resolverPollux(lixo, 400_000, nota).trabalho, lixo).toBeLessThan(5_000);
    }
  });
});

describe("o solver de Morbit", () => {
  const cifrarMorbit = (claro: string) => {
    const mx = encodeMorseX(claro);
    const s = mx.length % 2 ? `${mx}x` : mx;
    const pares = ["..", ".-", ".x", "-.", "--", "-x", "x.", "x-", "xx"];
    const out: string[] = [];
    for (let i = 0; i < s.length; i += 2) out.push(String(pares.indexOf(s.slice(i, i + 2)) + 1));
    return out.join("");
  };

  it("acha o claro nas cifras longas o bastante", () => {
    for (const claro of CLAROS.slice(1)) {
      const r = resolverMorbit(cifrarMorbit(claro), 400_000, nota);
      expect(r.res[0]?.texto, claro).toBe(claro);
    }
  });

  /**
   * A CRENÇA FALSA QUE MORRE AQUI. Três documentos deste repositório afirmam
   * que o Morbit tem comprimento PAR. A paridade é do MORSE, não da cifra: o
   * último dígito completa o par com um separador. Um portão de paridade
   * calaria em metade dos Morbit de verdade — e calar não deixa rastro.
   */
  it("o comprimento da cifra NÃO é necessariamente par", () => {
    const comprimentos = CLAROS.map((c) => cifrarMorbit(c).length);
    expect(comprimentos.some((n) => n % 2 === 1)).toBe(true);
  });

  it("o trabalho nunca passa do teto", () => {
    const cif = cifrarMorbit(CLAROS[2]);
    for (const teto of [1_000, 400_000]) {
      expect(resolverMorbit(cif, teto, nota).trabalho).toBeLessThanOrEqual(teto + 1);
    }
  });
});
