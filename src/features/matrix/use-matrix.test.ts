import { describe, expect, it } from "vitest";
import {
  desenharBloco,
  fatiarBlocos,
  lerBloco,
  parseCellBlocks,
  parseCellRef,
  parseFaixa,
} from "./use-matrix";

/** Monta o bitmap que a lista de células pintaria numa grade `linhas × colunas`. */
function pintar(linhas: number, colunas: number, refs: { r: number; c: number }[]): boolean[][] {
  const b = Array.from({ length: linhas }, () => new Array<boolean>(colunas).fill(false));
  for (const { r, c } of refs) if (b[r]?.[c] !== undefined) b[r][c] = true;
  return b;
}

function bloco(linhas: string[]): boolean[][] {
  return linhas.map((l) => [...l].map((ch) => ch === "X"));
}

describe("parseCellRef", () => {
  it("lê a grafia de planilha do acervo (A1, aa12)", () => {
    expect(parseCellRef("A1")).toEqual({ r: 0, c: 0 });
    expect(parseCellRef("C5")).toEqual({ r: 4, c: 2 });
    expect(parseCellRef("m15")).toEqual({ r: 14, c: 12 });
    expect(parseCellRef("AA2")).toEqual({ r: 1, c: 26 });
  });

  it("lê R3C2 e o par linha,coluna", () => {
    expect(parseCellRef("R3C2")).toEqual({ r: 2, c: 1 });
    expect(parseCellRef("3,2")).toEqual({ r: 2, c: 1 });
  });

  it("recusa o que não é referência", () => {
    expect(parseCellRef("")).toBeNull();
    expect(parseCellRef("A0")).toBeNull();
    expect(parseCellRef("xis")).toBeNull();
    expect(parseCellRef("12")).toBeNull();
  });
});

describe("parseCellBlocks", () => {
  it("lê a runa de ITC 2019 com barra e dimensiona a grade sozinho", () => {
    const r = parseCellBlocks("A1/B1/C1/A2/C2/A3/B3/C3/A4/C4/A5/B5/C5");
    expect(r.blocos).toHaveLength(1);
    expect(r.blocos[0]).toHaveLength(13);
    // Nenhuma referência passa de C nem de 5 — daí sai a grade 3×5 sem ninguém dizer.
    expect(r.linhas).toBe(5);
    expect(r.colunas).toBe(3);
    expect(r.invalidos).toEqual([]);
  });

  it("lê a Batalha Naval de 2022, separada por espaço", () => {
    const r = parseCellBlocks("D1 F1 A12 M15");
    expect(r.blocos[0]).toEqual([
      { r: 0, c: 3 },
      { r: 0, c: 5 },
      { r: 11, c: 0 },
      { r: 14, c: 12 },
    ]);
    expect(r.linhas).toBe(15);
    expect(r.colunas).toBe(13);
  });

  it("cada linha é um bloco — é o que faz as 8 runas saírem de uma tacada", () => {
    const r = parseCellBlocks("A1/B1\nA2/B2\n\nA3/B3");
    expect(r.blocos).toHaveLength(3);
    expect(r.linhas).toBe(3);
  });

  it("a vírgula separa células, mas `3,2` continua sendo linha,coluna", () => {
    expect(parseCellBlocks("A1,B1,C1").blocos[0]).toHaveLength(3);
    expect(parseCellBlocks("3,2").blocos[0]).toEqual([{ r: 2, c: 1 }]);
  });

  it("guarda o lixo em vez de engolir — em prova, isso é diagnóstico", () => {
    const r = parseCellBlocks("A1 xis B2");
    expect(r.blocos[0]).toHaveLength(2);
    expect(r.invalidos).toEqual(["xis"]);
  });
});

describe("parseFaixa", () => {
  it("aceita A1:C5 e A1 C5, em qualquer ordem dos cantos", () => {
    expect(parseFaixa("A1:C5")).toEqual({ r0: 0, c0: 0, rows: 5, cols: 3 });
    expect(parseFaixa("C5 A1")).toEqual({ r0: 0, c0: 0, rows: 5, cols: 3 });
  });

  it("recusa o que não é faixa", () => {
    expect(parseFaixa("A1")).toBeNull();
    expect(parseFaixa("A1:B2:C3")).toBeNull();
  });
});

describe("fatiarBlocos", () => {
  it("recorta blocos lado a lado pulando a folga", () => {
    // Dois blocos 1×2 com uma coluna de respiro: X X · X ·
    const bitmap = [[true, true, false, true, false]];
    const blocos = fatiarBlocos(bitmap, 1, 2, 1);
    expect(blocos).toHaveLength(2);
    expect(blocos[0]).toEqual([[true, true]]);
    expect(blocos[1]).toEqual([[true, false]]);
  });

  it("não devolve bloco pela metade", () => {
    expect(fatiarBlocos([[true, true, true]], 1, 2, 0)).toHaveLength(1);
    expect(fatiarBlocos([[true]], 3, 3, 0)).toHaveLength(0);
  });
});

describe("lerBloco — dígito 3×5", () => {
  it("a 1ª runa da Seq.1 de ITC 2019 desenha o 8", () => {
    const { blocos, linhas, colunas } = parseCellBlocks("A1/B1/C1/A2/C2/A3/B3/C3/A4/C4/A5/B5/C5");
    const bitmap = pintar(linhas, colunas, blocos[0]);
    expect(desenharBloco(bitmap)).toBe("███\n█·█\n███\n█·█\n███");
    expect(lerBloco(bitmap, "digito-3x5").char).toBe("8");
  });

  it("o 6 da fonte de segmentos (o mesmo dígito do nonograma de ITC 2023)", () => {
    expect(lerBloco(bloco(["XXX", "X..", "XXX", "X.X", "XXX"]), "digito-3x5").char).toBe("6");
  });

  it("errar uma célula não vira “não deu”: vira o candidato com o ±1", () => {
    const quase = bloco(["XXX", "X.X", "XXX", "X.X", "XX."]);
    const lido = lerBloco(quase, "digito-3x5");
    expect(lido.char).toBe("");
    expect(lido.candidatos[0]).toEqual({ char: "8", distancia: 1 });
  });
});

describe("lerBloco — Braille e binário", () => {
  it("a célula 2×3 cheia é ⠿ e o ponto 1 sozinho é ⠁", () => {
    expect(lerBloco(bloco(["XX", "XX", "XX"]), "braille-2x3").char).toBe("⠿");
    expect(lerBloco(bloco(["X.", "..", ".."]), "braille-2x3").char).toBe("⠁");
  });

  it("o bloco lido como binário devolve o número", () => {
    expect(lerBloco(bloco([".X.....X"]), "binario").char).toBe("65");
  });
});
