import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { type EstacoesData, porChapa, proximas, rotuloTipo } from "./types";

/**
 * MARCOS POR PERTO — a metade que o `location` passou a usar.
 *
 * O endpoint de postes com índice GiST e o `postesProximos` existiam nas duas
 * pontas com ZERO chamadas; esta é a versão local, sobre as 491 estações do
 * BDG, que não precisa de rede nenhuma. A prova dá uma coordenada e pergunta o
 * que há ali; a descrição de uma estação costuma ser enunciado pronto.
 */
describe("estações mais próximas", () => {
  const dados = JSON.parse(
    readFileSync(resolve(process.cwd(), "public/data/estacoes-ibge.json"), "utf8"),
  );

  it("acha as de Blumenau a partir do centro", () => {
    const r = proximas(dados, -26.9194, -49.0661, 3);
    expect(r).toHaveLength(3);
    expect(r[0].km).toBeLessThan(5);
    expect(r[0].municipio).toBe("Blumenau");
  });

  it("acha as de Itajaí a partir do centro de lá", () => {
    expect(proximas(dados, -26.9078, -48.6618, 1)[0].municipio).toBe("Itajaí");
  });

  it("devolve em ordem de distância", () => {
    const r = proximas(dados, -26.9194, -49.0661, 8);
    for (let i = 1; i < r.length; i++) expect(r[i].km).toBeGreaterThanOrEqual(r[i - 1].km);
  });

  /**
   * O ponto distante continua devolvendo resultado — quem filtra por raio é
   * quem chama (o `location` corta em 15 km). A função não decide o que é
   * "perto"; ela ordena.
   */
  it("um ponto longe devolve as menos distantes, com a distância real", () => {
    const r = proximas(dados, -77.3, -103.7, 1);
    expect(r[0].km).toBeGreaterThan(1000);
  });

  it("sem base carregada devolve lista vazia, não erro", () => {
    expect(proximas(null, -26.9, -49.0)).toEqual([]);
  });
});

/**
 * A SEGUNDA PORTA — o que está gravado no bronze (Onda 5.2).
 *
 * A prova dá `MR-103`, não `99861`. Antes disto esse texto não encontrava nada
 * e terminava em `caesar-bruteforce` a 0,40: um palpite ocupando o lugar de um
 * acerto exato numa base real.
 */
describe("busca pela inscrição da chapa", () => {
  const dados: EstacoesData = JSON.parse(
    readFileSync(resolve(process.cwd(), "public/data/estacoes-ibge.json"), "utf8"),
  );

  it("acha pela chapa gravada", () => {
    const r = porChapa(dados, "MR-103");
    expect(r).toHaveLength(1);
    expect(r[0].municipio).toBe("Blumenau");
    expect(r[0].codigo).toBe("99861");
  });

  it("hífen, espaço e caixa não importam — ninguém digita como está no bronze", () => {
    for (const s of ["mr-103", "MR 103", "MR103", "  mr103  "]) {
      expect(porChapa(dados, s)[0]?.codigo, s).toBe("99861");
    }
  });

  /**
   * O SILÊNCIO É O PONTO, e aqui ele é mais importante que nas outras bases:
   * só **57 das 491** estações têm chapa. Uma chapa não cadastrada tem de
   * devolver nada — não a estação mais parecida.
   */
  it("chapa que não está na base devolve vazio, não a mais parecida", () => {
    expect(porChapa(dados, "ZZ-999")).toHaveLength(0);
    expect(porChapa(dados, "MR-999")).toHaveLength(0);
  });

  it("não casa com fragmento — o alvo curto sairia dando qualquer coisa", () => {
    expect(porChapa(dados, "MR")).toHaveLength(0);
    expect(porChapa(dados, "10")).toHaveLength(0);
  });

  it("sem base carregada, devolve vazio em vez de erro", () => {
    expect(porChapa(null, "MR-103")).toHaveLength(0);
  });

  /**
   * A cobertura é FINA e o número fica escrito: 57 vêm da coluna
   * `inscricaoChapa` do BDG e 13 saem da descrição, que às vezes diz em prosa o
   * que está gravado ("…estampada: RN 2004-R"). Se este número cair, o
   * extrator do `build:estacoes` parou de achar — e cai calado.
   */
  it("a cobertura é fina, e o teste registra o número", () => {
    const comChapa = dados.rows.filter((r) => (r[9] ?? "").trim()).length;
    expect(comChapa).toBe(70);
  });

  it("as inscrições tiradas da prosa entram, e nenhum NOME gravado entra", () => {
    // "RN 2004-R" é inscrição; "SPITZCOPF 95" é o nome na chapa. As duas vêm
    // depois de "estampada:" na mesma base.
    expect(porChapa(dados, "RN2004H").length).toBeGreaterThan(0);
    expect(porChapa(dados, "EP-SG-22-1048")[0]?.codigo).toBe("11053");
    expect(porChapa(dados, "SPITZCOPF95")).toHaveLength(0);
    expect(porChapa(dados, "ILSE94")).toHaveLength(0);
    // Uma descrição diz literalmente "estampada: o nome da estação".
    expect(dados.rows.some((r) => /[A-Z]{4,}/.test(r[9] ?? ""))).toBe(false);
  });
});

/**
 * O RÓTULO DO TIPO — o campo que existe para a bancada não fingir que sabe.
 */
describe("rótulo do tipo", () => {
  const dados: EstacoesData = JSON.parse(
    readFileSync(resolve(process.cwd(), "public/data/estacoes-ibge.json"), "utf8"),
  );

  /**
   * `EG` é **gravimétrica**, não "geodésica" — a semelhança das duas palavras
   * já produziu o rótulo errado uma vez, na escrita deste próprio teste.
   */
  it("o tema manda, quando existe", () => {
    expect(rotuloTipo("E", "EG")).toBe("estação gravimétrica");
    expect(rotuloTipo("R", "RN")).toBe("referência de nível (altimetria)");
    expect(rotuloTipo("V", "VT")).toBe("vértice de triangulação (planimetria)");
  });

  /**
   * `EP` não tem nome de propósito. Inventar "estação planimétrica" por
   * semelhança seria exatamente o erro que este rótulo conserta — então ele
   * mostra a sigla E DIZ que é sigla.
   */
  it("sigla sem fonte aparece como sigla, não como nome inventado", () => {
    expect(rotuloTipo("P", "EP")).toBe("EP (sigla do BDG)");
  });

  it("sem tema, cai na letra; sem letra, diz que não sabe", () => {
    expect(rotuloTipo("R")).toBe("referência de nível (altitude)");
    expect(rotuloTipo("Z")).toBe("tipo Z (não catalogado)");
    expect(rotuloTipo("")).toBe("tipo não informado");
  });

  /**
   * A REGRESSÃO QUE IMPORTA: antes do enriquecimento, 47,3% da base caía no
   * ramo "não catalogado". Se algum dia voltar a cair, é porque o `build:estacoes`
   * parou de trazer o `tema` — e o card volta a imprimir letra crua.
   */
  it("nenhuma linha da base cai no ramo do desconhecido", () => {
    const semTema = dados.rows.filter((r) => !r[7]).length;
    expect(semTema).toBe(0);
  });
});
