import { describe, expect, it } from "vitest";
import {
  type Matrix,
  cellLabel,
  cluesCols,
  cluesRows,
  colLabel,
  crop,
  detectFormat,
  emptyMatrix,
  extractString,
  insertCol,
  insertRow,
  makeDestination,
  marksPerRow,
  mirrorH,
  mirrorV,
  parseColLabel,
  parseMatrix,
  parseNumeroBR,
  removeCol,
  removeRow,
  resize,
  rotate,
  setCell,
  setCells,
  toBitmap,
  toContiguous,
  toMarkdown,
  toText,
  transpose,
  trimEmpty,
} from "./matrix";

/** Pinta a grade a partir de um desenho ASCII — é como as expectativas ficam legíveis. */
function pintar(desenho: string): Matrix {
  const linhas = desenho.trim().split("\n");
  let m = emptyMatrix(linhas.length, linhas[0].length);
  linhas.forEach((linha, r) => {
    [...linha].forEach((ch, c) => {
      if (ch !== ".") m = setCell(m, r, c, { mark: 1 });
    });
  });
  return m;
}

const textos = (m: Matrix) => m.cells.map((l) => l.map((c) => c.v));

describe("parseMatrix — formatos", () => {
  it("lê a tabela markdown do pdftotext, descartando a linha de separação", () => {
    const r = parseMatrix("| a | b |\n|---|---|\n| c | d |");
    expect(r.format).toBe("markdown");
    expect(textos(r.matrix)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("não engole a linha vazia da grade achando que é separador markdown", () => {
    const r = parseMatrix("| a | b |\n|   |   |\n| c | d |");
    expect(r.matrix.rows).toBe(3);
    expect(textos(r.matrix)[1]).toEqual(["", ""]);
  });

  it("lê o TSV colado do Excel", () => {
    const r = parseMatrix("a\tb\nc\td");
    expect(r.format).toBe("tsv");
    expect(textos(r.matrix)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("lê CSV com vírgula e com ponto e vírgula", () => {
    expect(parseMatrix("a,b\nc,d").format).toBe("csv");
    const r = parseMatrix("a;b\nc;d");
    expect(r.format).toBe("csv");
    expect(textos(r.matrix)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("não confunde vírgula decimal pt-BR com separador de células", () => {
    const r = parseMatrix("1,5 2,5\n3,5 4,5");
    expect(r.format).toBe("espaco");
    expect(r.matrix.cols).toBe(2);
    expect(r.matrix.cells[0][0].n).toBe(1.5);
  });

  it("lê a grade contígua (8 letras coladas por linha)", () => {
    const r = parseMatrix("ABC\nDEF\nGHI");
    expect(r.format).toBe("contiguo");
    expect(r.matrix.rows).toBe(3);
    expect(r.matrix.cols).toBe(3);
    expect(r.matrix.cells[2][0].v).toBe("G");
  });

  it("aceita o formato forçado à mão quando a detecção é ambígua", () => {
    const r = parseMatrix("1,5\n2,5", "csv");
    expect(textos(r.matrix)).toEqual([
      ["1", "5"],
      ["2", "5"],
    ]);
  });

  it("texto vazio devolve grade 0×0 sem reclamar", () => {
    const r = parseMatrix("   \n\n");
    expect(r.format).toBe("vazio");
    expect(r.matrix.rows).toBe(0);
    expect(r.issues).toEqual([]);
  });
});

describe("parseMatrix — grade torta", () => {
  it("completa a linha curta e diz exatamente qual é", () => {
    const r = parseMatrix("abcdefgh\nabcdefgh\nabcdefg\nabcdefgh");
    expect(r.matrix.cols).toBe(8);
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0].mensagem).toBe("linha 3 tem 7 colunas, as outras têm 8");
    expect(r.matrix.cells[2][7].v).toBe("");
  });

  it("numera a linha como ela aparece no campo, contando as vazias", () => {
    const r = parseMatrix("\n\nabcd\nabc");
    expect(r.issues[0].linha).toBe(4);
    expect(r.issues[0].mensagem).toContain("linha 4");
  });

  it("avisa quando há vírgulas mas o formato caiu em contíguo", () => {
    const r = parseMatrix("1,5\n2,5");
    expect(r.format).toBe("contiguo");
    expect(r.issues.some((i) => i.mensagem.includes("escolha o formato CSV"))).toBe(true);
  });
});

describe("número da célula", () => {
  it("aceita as duas convenções, com a vírgula sempre decimal", () => {
    expect(parseNumeroBR("1,5")).toBe(1.5);
    expect(parseNumeroBR("1.234,56")).toBe(1234.56);
    expect(parseNumeroBR("1.234")).toBe(1234); // milhar pt-BR
    expect(parseNumeroBR("1.5")).toBe(1.5); // decimal com ponto
    expect(parseNumeroBR("-3")).toBe(-3);
    expect(parseNumeroBR("  12  ")).toBe(12);
  });

  it("o que não é número devolve null (a célula continua sendo texto)", () => {
    expect(parseNumeroBR("A")).toBeNull();
    expect(parseNumeroBR("")).toBeNull();
    expect(parseNumeroBR("R$ 5")).toBeNull();
    expect(parseNumeroBR("1,2,3")).toBeNull();
  });

  it("o número segue o texto quando a célula é reescrita", () => {
    const m = setCell(emptyMatrix(1, 1), 0, 0, { v: "2,5" });
    expect(m.cells[0][0].n).toBe(2.5);
  });
});

describe("saídas", () => {
  const oito = pintar(["XXX", "X.X", "XXX", "X.X", "XXX"].join("\n"));

  it("toText devolve a máscara copiável", () => {
    expect(toText(oito, { cheio: "X", vazio: "." })).toBe("XXX\nX.X\nXXX\nX.X\nXXX");
  });

  it("toBitmap devolve a matriz booleana que o QR e o PNG consomem", () => {
    expect(toBitmap(oito)[1]).toEqual([true, false, true]);
  });

  it("extractString respeita a ordem de leitura", () => {
    const r = parseMatrix("AB\nCD");
    const m = setCells(
      r.matrix,
      [
        { r: 0, c: 0 },
        { r: 0, c: 1 },
        { r: 1, c: 0 },
      ],
      { mark: 1 },
    );
    expect(extractString(m, "linhas")).toBe("ABC");
    expect(extractString(m, "colunas")).toBe("ACB");
    expect(extractString(m, "serpentina-linhas")).toBe("ABC");
  });

  it("exporta nos dois formatos que o Decodificador aceita", () => {
    const m = parseMatrix("AB\nCD").matrix;
    expect(toMarkdown(m)).toBe("| A | B |\n| C | D |");
    expect(toContiguous(m)).toBe("AB\nCD");
  });

  it("contagem por linha e pistas de nonograma: o dígito 6 da etapa 3 de 2023", () => {
    // XXX / X.. / XXX / X.X / XXX é o 6 na fonte 3×5 das runas.
    const seis = pintar(["XXX", "X..", "XXX", "X.X", "XXX"].join("\n"));
    expect(marksPerRow(seis)).toEqual([3, 1, 3, 2, 3]);
    // As pistas batem com as impressas na prova: linhas 3/1/3/1 1/3, colunas 5/1 1 1/1 3.
    expect(cluesRows(seis)).toEqual([[3], [1], [3], [1, 1], [3]]);
    expect(cluesCols(seis)).toEqual([[5], [1, 1, 1], [1, 3]]);
  });
});

describe("transformações", () => {
  const m = parseMatrix("ab\ncd").matrix;

  it("transpõe", () => {
    expect(textos(transpose(m))).toEqual([
      ["a", "c"],
      ["b", "d"],
    ]);
  });

  it("gira no sentido horário", () => {
    expect(textos(rotate(m, 90))).toEqual([
      ["c", "a"],
      ["d", "b"],
    ]);
    expect(textos(rotate(m, 180))).toEqual([
      ["d", "c"],
      ["b", "a"],
    ]);
    expect(textos(rotate(m, 270))).toEqual([
      ["b", "d"],
      ["a", "c"],
    ]);
  });

  it("quatro giros voltam ao começo", () => {
    expect(textos(rotate(rotate(rotate(rotate(m, 90), 90), 90), 90))).toEqual(textos(m));
  });

  it("espelha na horizontal (esquerda vira direita) e na vertical", () => {
    expect(textos(mirrorH(m))).toEqual([
      ["b", "a"],
      ["d", "c"],
    ]);
    expect(textos(mirrorV(m))).toEqual([
      ["c", "d"],
      ["a", "b"],
    ]);
  });

  it("preserva a pintura ao transformar (a máscara não descola do conteúdo)", () => {
    const pintada = setCell(m, 0, 1, { mark: 1 });
    expect(rotate(pintada, 90).cells[1][1].mark).toBe(1);
  });

  it("recorta um bloco 3×5 de dentro de uma grade maior", () => {
    const grande = parseMatrix(["xxxxx", "xABCx", "xDEFx", "xxxxx"].join("\n")).matrix;
    expect(textos(crop(grande, 1, 1, 2, 3))).toEqual([
      ["A", "B", "C"],
      ["D", "E", "F"],
    ]);
    expect(crop(grande, 99, 0, 2, 2).rows).toBe(0);
  });

  it("redimensiona preservando o que couber", () => {
    expect(textos(resize(m, 3, 1))).toEqual([["a"], ["c"], [""]]);
    expect(resize(m, 1, 1).cells[0][0].v).toBe("a");
  });

  it("apara as bordas vazias", () => {
    const solta = parseMatrix("| | | |\n| |X| |\n| | | |").matrix;
    const aparada = trimEmpty(solta);
    expect(aparada.rows).toBe(1);
    expect(aparada.cols).toBe(1);
    expect(aparada.cells[0][0].v).toBe("X");
    expect(trimEmpty(emptyMatrix(3, 3)).rows).toBe(0);
  });

  it("insere e remove linha e coluna", () => {
    expect(textos(insertRow(m, 1))).toEqual([
      ["a", "b"],
      ["", ""],
      ["c", "d"],
    ]);
    expect(textos(removeRow(m, 0))).toEqual([["c", "d"]]);
    expect(textos(insertCol(m, 0))).toEqual([
      ["", "a", "b"],
      ["", "c", "d"],
    ]);
    expect(textos(removeCol(m, 1))).toEqual([["a"], ["c"]]);
  });
});

describe("régua de coordenadas", () => {
  it("numera as colunas como planilha", () => {
    expect(colLabel(0)).toBe("A");
    expect(colLabel(25)).toBe("Z");
    expect(colLabel(26)).toBe("AA");
    expect(parseColLabel("A")).toBe(0);
    expect(parseColLabel("aa")).toBe(26);
    expect(parseColLabel("3")).toBeNull();
    expect(cellLabel(2, 1)).toBe("B3");
  });
});

describe("origem e destino", () => {
  it("o destino nasce limpo, ou espelhando o conteúdo — mas nunca a pintura", () => {
    const origem = setCell(parseMatrix("AB\nCD").matrix, 0, 0, { mark: 1 });
    const limpo = makeDestination(origem, false);
    const espelho = makeDestination(origem, true);
    expect(limpo.cells[0][0].v).toBe("");
    expect(espelho.cells[0][0].v).toBe("A");
    expect(espelho.cells[0][0].mark).toBe(0);
    expect(detectFormat("AB\nCD")).toBe("contiguo");
  });
});
