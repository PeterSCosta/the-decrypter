import { describe, expect, it } from "vitest";
import { type Matrix, emptyMatrix, makeDestination, parseMatrix, toStates, toText } from "./matrix";
import { type Rule, applyRules, createRule, describeRule, validateRule } from "./rules";

const grade = (texto: string): Matrix => parseMatrix(texto).matrix;
const desenho = (m: Matrix) => toText(m, { cheio: "X", vazio: "." });

/** Regra com id previsível — o teste fala do id nas checagens de erro e de contagem. */
function regra(id: string, patch: Partial<Rule>): Rule {
  return createRule({ id, ...patch });
}

describe("regra por elemento", () => {
  it("uma conta sobre os índices desenha um losango (a regra numérica vira forma)", () => {
    const r = applyRules(
      emptyMatrix(7, 7),
      null,
      [regra("losango", { condicao: "abs(r - 4) + abs(c - 4) <= 3" })],
      {},
    );
    expect(desenho(r.matrix)).toBe(
      ["...X...", "..XXX..", ".XXXXX.", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."].join("\n"),
    );
  });

  it("pintar os ímpares de uma grade 3×5 desenha o algarismo 8 (runas de 2019)", () => {
    // Cada runa da Prova da Madrugada de 2019 é um dígito nesta fonte 3×5.
    const origem = grade("1 3 5\n7 2 9\n11 13 15\n17 4 19\n21 23 25");
    const r = applyRules(origem, null, [regra("impares", { condicao: "impar(n)" })], {});
    expect(desenho(r.matrix)).toBe(["XXX", "X.X", "XXX", "X.X", "XXX"].join("\n"));
  });

  it("a vizinha resolve 'igual à célula ao lado'", () => {
    const r = applyRules(grade("A A B"), null, [regra("igual", { condicao: "v = viz(0, 1)" })], {});
    expect(desenho(r.matrix)).toBe("X..");
  });

  it("multi-estado: cada regra pode marcar com um estado diferente", () => {
    const r = applyRules(
      grade("1 2 3"),
      null,
      [
        regra("pares", { condicao: "par(n)", acao: { tipo: "pintar", estado: 2 } }),
        regra("resto", { condicao: "impar(n)", acao: { tipo: "pintar", estado: 99 } }),
      ],
      {},
    );
    // O estado é limitado ao teto (6) em vez de virar uma cor que ninguém definiu.
    expect(toStates(r.matrix)[0]).toEqual([6, 2, 6]);
  });
});

describe("regra por linha, coluna e matriz", () => {
  it("linha: o agregado decide, e a linha inteira é pintada", () => {
    const r = applyRules(
      grade("A E I\nB C D\nO U A"),
      null,
      [regra("vogais", { escopo: "linha", condicao: 'conta(linhaTxt, "[aeiou]") > 2' })],
      {},
    );
    expect(desenho(r.matrix)).toBe(["XXX", "...", "XXX"].join("\n"));
  });

  it("coluna: a soma da coluna decide", () => {
    const r = applyRules(
      grade("1 9\n2 9\n3 9"),
      null,
      [regra("soma", { escopo: "coluna", condicao: "soma(coluna) > 10" })],
      {},
    );
    expect(desenho(r.matrix)).toBe([".X", ".X", ".X"].join("\n"));
  });

  it("matriz: uma vez para tudo — serve para normalizar", () => {
    const origem = grade("ab\ncd");
    const r = applyRules(
      origem,
      makeDestination(origem, true),
      [regra("limpa", { escopo: "matriz", condicao: "nLinhas = 2", acao: { tipo: "apagar" } })],
      {},
    );
    expect(r.matrix.cells.flat().every((c) => c.v === "")).toBe(true);
    expect(r.hits.limpa).toBe(4);
  });
});

describe("modos de composição", () => {
  const regras = [
    regra("pares", { condicao: "par(n)", acao: { tipo: "marcar", texto: "░" } }),
    regra("grandes", { condicao: "n > 2", acao: { tipo: "marcar", texto: "▓" } }),
  ];
  const origem = grade("1 2 3 4 5");

  it("camadas: a segunda regra passa por cima da primeira", () => {
    const r = applyRules(origem, null, regras, { modo: "camadas" });
    expect(toText(r.matrix, { vazio: "." })).toBe(".░▓▓▓");
  });

  it("primeira que casa: a célula 4 para na regra dos pares", () => {
    const r = applyRules(origem, null, regras, { modo: "primeira" });
    expect(toText(r.matrix, { vazio: "." })).toBe(".░▓░▓");
  });

  it("manter serve de guarda no modo primeira", () => {
    const r = applyRules(
      origem,
      null,
      [
        regra("poupa", { condicao: "n = 3", acao: { tipo: "manter" } }),
        regra("resto", { condicao: "", acao: { tipo: "pintar" } }),
      ],
      { modo: "primeira" },
    );
    expect(desenho(r.matrix)).toBe("XX.XX");
  });
});

describe("extrair — a grade virando mensagem", () => {
  it("colhe as células verdadeiras na ordem de leitura escolhida", () => {
    const origem = grade("CXA\nXFX\nXEX");
    const cafe = [regra("cafe", { condicao: 'v em "C,A,F,E"', acao: { tipo: "extrair" } })];
    expect(applyRules(origem, null, cafe, { ordem: "linhas" }).extracted).toBe("CAFE");
    expect(applyRules(origem, null, cafe, { ordem: "colunas" }).extracted).toBe("CFEA");
  });

  it("a máscara lê a ORIGEM mesmo com o destino limpo (Batalha Naval 2022)", () => {
    const origem = grade("S E N A I");
    const r = applyRules(
      origem,
      makeDestination(origem, false),
      [
        regra("marca", { condicao: "vogal(v)" }),
        regra("colhe", { condicao: "m > 0", acao: { tipo: "extrair" } }),
      ],
      {},
    );
    expect(r.extracted).toBe("EAI");
    expect(r.extractions[0].regraId).toBe("colhe");
    expect(r.extractions[0].celulas).toHaveLength(3);
    // O destino continua sem texto: quem tem o conteúdo é a origem.
    expect(r.matrix.cells[0][1].v).toBe("");
  });
});

describe("as outras ações", () => {
  it("cor monta o mapa de calor pela escala dos números da origem", () => {
    const r = applyRules(grade("0 5 10"), null, [regra("calor", { acao: { tipo: "cor" } })], {});
    expect(r.matrix.cells[0].map((c) => c.heat)).toEqual([0, 0.5, 1]);
    // Cor não pinta a máscara — é leitura visual, e o bitmap do QR não pode herdar isso.
    expect(desenho(r.matrix)).toBe("...");
  });

  it("substituir troca o texto e o número acompanha", () => {
    const r = applyRules(
      grade("a b"),
      null,
      [regra("troca", { condicao: 'v = "b"', acao: { tipo: "substituir", texto: "2,5" } })],
      {},
    );
    expect(r.matrix.cells[0][1].v).toBe("2,5");
    expect(r.matrix.cells[0][1].n).toBe(2.5);
  });

  it("limpar e alternar mexem só na pintura", () => {
    const origem = grade("1 2");
    const r = applyRules(
      origem,
      null,
      [
        regra("pinta", { condicao: "" }),
        regra("apaga", { condicao: "n = 1", acao: { tipo: "limpar" } }),
        regra("inverte", { condicao: "", acao: { tipo: "alternar" } }),
      ],
      {},
    );
    expect(desenho(r.matrix)).toBe("X.");
  });
});

describe("erros e diagnóstico", () => {
  it("regra que não compila não roda, e as outras seguem", () => {
    const r = applyRules(
      grade("ab\ncd"),
      null,
      [regra("quebrada", { condicao: "1 +" }), regra("boa", { condicao: "verdadeiro" })],
      {},
    );
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].regraId).toBe("quebrada");
    expect(r.errors[0].pos).toBe(3);
    expect(r.hits.quebrada).toBe(0);
    expect(r.hits.boa).toBe(4);
    expect(desenho(r.matrix)).toBe("XX\nXX");
  });

  it("erro de execução vira uma mensagem só, com o tamanho do estrago", () => {
    const r = applyRules(grade("ab\ncd"), null, [regra("var", { condicao: "xyz > 1" })], {});
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].mensagem).toBe('não conheço "xyz" (4 células, a 1ª em A1)');
    expect(r.errors[0].celula).toBe("A1");
  });

  it("regra desligada não conta nem aparece", () => {
    const r = applyRules(grade("ab"), null, [regra("off", { condicao: "", ativa: false })], {});
    expect(desenho(r.matrix)).toBe("..");
    expect(r.hits.off).toBeUndefined();
  });

  it("não modifica a origem nem o destino recebidos", () => {
    const origem = grade("ab");
    const destino = makeDestination(origem, true);
    applyRules(origem, destino, [regra("tudo", { condicao: "", acao: { tipo: "apagar" } })], {});
    expect(destino.cells[0][0].v).toBe("a");
    expect(origem.cells[0][0].v).toBe("a");
  });

  it("origem menor que o destino não estoura: o que falta conta como célula vazia", () => {
    // A interface guarda origem e destino separados; recolar uma origem menor
    // sem redimensionar o destino é acidente de rotina, não erro de programa.
    const r = applyRules(
      grade("AB"),
      emptyMatrix(2, 4),
      [regra("cheias", { condicao: "nao vazio(v)" })],
      {},
    );
    expect(desenho(r.matrix)).toBe("XX..\n....");
  });

  it("grade vazia não explode", () => {
    const r = applyRules(emptyMatrix(0, 0), null, [regra("x", { condicao: "" })], {});
    expect(r.matrix.rows).toBe(0);
    expect(r.extracted).toBe("");
  });
});

describe("apoio à interface", () => {
  it("validateRule aponta o erro de sintaxe enquanto se digita", () => {
    expect(validateRule(regra("a", { condicao: "" }))).toBeNull();
    expect(validateRule(regra("b", { condicao: "n > 1" }))).toBeNull();
    expect(validateRule(regra("c", { condicao: "n >" }))?.pos).toBe(3);
  });

  it("describeRule resume a regra em uma linha", () => {
    expect(describeRule(regra("d", { escopo: "linha", condicao: "soma(linha) > 3" }))).toBe(
      "linha · se soma(linha) > 3 · pintar",
    );
    expect(describeRule(regra("e", { acao: { tipo: "marcar", texto: "▓" } }))).toBe(
      'elemento · sempre · marcar com caractere "▓"',
    );
  });

  it("createRule dá id único e os padrões da casa", () => {
    const a = createRule();
    const b = createRule();
    expect(a.id).not.toBe(b.id);
    expect(a.escopo).toBe("elemento");
    expect(a.acao.tipo).toBe("pintar");
    expect(a.ativa).toBe(true);
  });
});
