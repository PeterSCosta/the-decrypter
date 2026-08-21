import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { type LojasData, buscar, canonIdentificador, porFormaNua, porIdentificador } from "./types";

/**
 * O teste que olha a BASE VIVA, não uma fixture.
 *
 * O molde é `bridge/integridade`: uma fixture de três linhas prova a função e
 * não prova o dado, e é o dado que envelhece. Aqui se trava a contagem, a
 * coerência interna e as três armadilhas que a medição achou no catálogo de
 * origem — se o `build:lojas` mudar qualquer uma, isto fica vermelho.
 */
const data: LojasData = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/data/lojas-blumenau.json"), "utf8"),
);

describe("o artefato de lojas", () => {
  it("bate com a própria contagem", () => {
    expect(data.rows).toHaveLength(data.count);
    expect(data.count).toBe(372);
    expect(data.rows.filter((r) => r[1]).length).toBe(data.comIdentificador);
    expect(data.comIdentificador).toBe(119);
    expect(data.shoppings).toHaveLength(4);
  });

  it("toda linha aponta para um shopping que existe", () => {
    for (const r of data.rows) expect(data.shoppings[r[0]]).toBeTruthy();
  });

  /**
   * O peso importa: a Cola e a Biblioteca **não** são preguiçosas do lado do
   * chunk, e a régua da casa é `nada novo no bundle inicial`. Esta base é
   * preguiçosa, mas o teto existe para ninguém dobrá-la sem perceber.
   */
  it("cabe em 64 KB", () => {
    const bytes = readFileSync(resolve(process.cwd(), "public/data/lojas-blumenau.json")).length;
    expect(bytes).toBeLessThan(64 * 1024);
  });

  /**
   * A COBERTURA VIAJA NO DADO. Neumarkt e Norte entram sem número porque a
   * fonte usada não o traz — e o aviso tem de dizer isso com essas palavras,
   * senão a tela apresenta ausência de leitura como ausência de publicação.
   */
  it("o aviso não afirma que Neumarkt e Norte não numeram", () => {
    expect(data.aviso).toMatch(/não traz o número/i);
    expect(data.aviso).toMatch(/página de detalhe/i);
    expect(data.aviso).not.toMatch(/não (têm|tem|possuem) número/i);
  });
});

describe("porIdentificador", () => {
  it("acha pela forma completa, com ou sem espaço e caixa", () => {
    for (const forma of ["L2032", "l2032", " L2032 "]) {
      expect(porIdentificador(data, forma).map((l) => l.nome)).toEqual(["60 Sabores"]);
    }
    expect(porIdentificador(data, "loja 15")[0]?.nome).toBe("Lavi Shoes");
    expect(porIdentificador(data, "LOJA15")[0]?.nome).toBe("Lavi Shoes");
  });

  /**
   * `L25` e `L-25` são DUAS lojas no mesmo piso e na mesma ala do Park Europeu.
   * Achatar o hífen fundiria as duas — por isso `canonIdentificador` o preserva.
   */
  it("não funde L25 com L-25", () => {
    expect(porIdentificador(data, "L25").map((l) => l.nome)).toEqual(["IOA"]);
    expect(porIdentificador(data, "L-25").map((l) => l.nome)).toEqual([
      "Uniavan - Faculdade Avantis",
    ]);
  });

  /** Empate é real e mostra os dois: escolher um seria inventar a resposta. */
  it("devolve TODAS as lojas do mesmo identificador", () => {
    expect(
      porIdentificador(data, "A13")
        .map((l) => l.nome)
        .sort(),
    ).toEqual(["Americanas", "Pittol"]);
    expect(porIdentificador(data, "L1071/72/92/93/94")).toHaveLength(2);
  });

  it("identificador que não existe devolve vazio, e base nula também", () => {
    expect(porIdentificador(data, "L9999")).toEqual([]);
    expect(porIdentificador(null, "L2032")).toEqual([]);
    expect(porIdentificador(data, "")).toEqual([]);
  });

  it("traz piso, ala e shopping junto", () => {
    const [l] = porIdentificador(data, "L2032");
    expect(l.piso).toBe("2º Piso");
    expect(l.ala).toBe("Praça De Alimentação");
    expect(l.shopping.nome).toBe("Shopping Park Europeu");
  });
});

describe("porFormaNua", () => {
  /**
   * A porta que existe para os cinco identificadores que já são dígito puro.
   * Ela é separada porque 83,9% das formas nuas já são código de rua — quem a
   * chama tem de entrar ABAIXO da resposta de rua, e o decoder faz isso.
   */
  it("acha pelo número sem o prefixo de letra", () => {
    expect(porFormaNua(data, "2032").map((l) => l.nome)).toContain("60 Sabores");
    expect(porFormaNua(data, "2024").map((l) => l.nome)).toEqual(["Mistura Brasileira"]);
  });

  it("o que não começa com dígito não passa", () => {
    expect(porFormaNua(data, "L2032")).toEqual([]);
    expect(porFormaNua(null, "2032")).toEqual([]);
  });
});

describe("buscar (a Biblioteca)", () => {
  it("sem termo devolve tudo", () => {
    expect(buscar(data, "")).toHaveLength(372);
  });

  it("acha por nome, por shopping, por piso e por ramo", () => {
    expect(buscar(data, "mistura")[0]?.nome).toBe("Mistura Brasileira");
    expect(buscar(data, "neumarkt").length).toBe(150);
    expect(buscar(data, "subsolo").length).toBe(3);
    expect(buscar(data, "quiosque").length).toBeGreaterThan(0);
  });

  it("acha as lojas sem identificador — elas não somem da Biblioteca", () => {
    const semId = buscar(data, "swarovski");
    expect(semId).toHaveLength(1);
    expect(semId[0].identificador).toBeNull();
    expect(semId[0].shopping.nome).toBe("Neumarkt Shopping");
  });
});

describe("canonIdentificador", () => {
  it("sobe a caixa, tira espaço e ponto, e preserva - e /", () => {
    expect(canonIdentificador("Loja Serv. 03")).toBe("LOJASERV03");
    expect(canonIdentificador("l2036/2037/2038")).toBe("L2036/2037/2038");
    expect(canonIdentificador("Loja 16-A")).toBe("LOJA16-A");
  });
});
