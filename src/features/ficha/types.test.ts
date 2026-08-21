import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { type FichasData, buscar, casar, termosDeFobia } from "./types";

/**
 * Contra a BASE VIVA, como o teste das lojas — e pelo mesmo motivo: uma fixture
 * de três linhas prova a função e não prova o dado, e aqui o dado é o produto.
 */
const CAMINHO = resolve(process.cwd(), "public/data/fichas-cp.json");
const data: FichasData = JSON.parse(readFileSync(CAMINHO, "utf8"));

describe("o artefato das fichas da CP", () => {
  it("bate com a própria contagem", () => {
    expect(data.fichas).toHaveLength(data.count);
    expect(data.count).toBe(17);
  });

  it("não repete codinome nem slug", () => {
    expect(new Set(data.fichas.map((f) => f.codinome)).size).toBe(17);
    expect(new Set(data.fichas.map((f) => f.slug)).size).toBe(17);
  });

  /**
   * O teste que existe por causa do defeito CALADO.
   *
   * A Biblioteca mostra a miniatura de toda linha e abre o dossiê no clique.
   * Um caminho que não existe não dá erro em lugar nenhum: dá um retângulo
   * vazio no meio da madrugada. O `build:fichas` já morre nisso; aqui trava de
   * novo, porque o artefato é versionado e pode ser editado à mão.
   */
  it("toda ficha tem o dossiê e a miniatura no disco", () => {
    for (const f of data.fichas) {
      expect(existsSync(resolve(process.cwd(), "public", f.imagem.slice(1))), f.imagem).toBe(true);
      expect(existsSync(resolve(process.cwd(), "public", f.mini.slice(1))), f.mini).toBe(true);
    }
  });

  it("cabe em 32 KB", () => {
    expect(readFileSync(CAMINHO).length).toBeLessThan(32 * 1024);
  });
});

describe("casar — a entrada INTEIRA é o termo", () => {
  it("acha pelo codinome, sem ligar para caixa nem acento", () => {
    expect(casar(data, "zaz")[0].ficha.nomeCivil).toBe("CARLOS EDUARDO HOEPERS");
    expect(casar(data, "  Cardoso ")[0].campo).toBe("codinome");
  });

  it("acha pelo nome civil inteiro", () => {
    const [a] = casar(data, "Diogo Jeferson dos Santos");
    expect(a.campo).toBe("nome");
    expect(a.ficha.codinome).toBe("DIOGO");
  });

  /**
   * A regra que segura a base fora da prosa. "diego" acende; a frase que
   * CONTÉM "diego" não — senão todo texto decifrado ganharia um card de ficha.
   */
  it("não acende dentro de uma frase", () => {
    expect(casar(data, "diego")).toHaveLength(1);
    expect(casar(data, "o diego escreveu a prova")).toHaveLength(0);
    expect(casar(data, "renata gosta de plantas")).toHaveLength(0);
  });

  it("acha pelo termo de fobia, inclusive quando ele vem acompanhado", () => {
    expect(casar(data, "Fronemofobia")[0].ficha.codinome).toBe("ZAZ");
    // A do CRISTIAN é "Aracnofobia e irritar Fabíola".
    expect(casar(data, "aracnofobia")[0].ficha.codinome).toBe("CRISTIAN");
    expect(casar(data, "Aracnofobia e irritar Fabíola")[0].ficha.codinome).toBe("CRISTIAN");
  });

  it("acha pelo ALVO quando ele não é frase — o MCACLCAS do DIOGO", () => {
    const [a] = casar(data, "MCACLCAS");
    expect(a.campo).toBe("alvo");
    expect(a.ficha.codinome).toBe("DIOGO");
  });

  /**
   * O ARQUIVO N é o MESMO nas 17: quem digita devolve as 17, porque essa é a
   * resposta verdadeira — o número é da arte, não da pessoa.
   */
  it("o número de arquivo devolve todas as 17", () => {
    const todos = casar(data, data.arquivoN);
    expect(todos).toHaveLength(17);
    expect(todos.every((a) => a.campo === "arquivo")).toBe(true);
  });

  it("base ausente ou termo vazio não inventam acerto", () => {
    expect(casar(null, "zaz")).toEqual([]);
    expect(casar(data, "   ")).toEqual([]);
  });
});

describe("buscar — a porta larga da Biblioteca", () => {
  it("acha por pedaço de diagnóstico", () => {
    const r = buscar(data, "Comensal da Morte");
    expect(r).toHaveLength(1);
    expect(r[0].codinome).toBe("DIOGO");
  });

  it("acha por nome no meio do nome civil", () => {
    expect(buscar(data, "ferracini")[0].codinome).toBe("RENATA");
  });

  it("termo vazio devolve as 17", () => {
    expect(buscar(data, "")).toHaveLength(17);
  });
});

describe("termosDeFobia", () => {
  it("separa a fobia de quem tem duas coisas na linha", () => {
    expect(termosDeFobia("Aracnofobia e irritar Fabíola")).toContain("aracnofobia");
    expect(termosDeFobia("Fobofobia")).toEqual(["fobofobia"]);
  });
});
