import type { Cid } from "@/lib/lookup-cache";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as cid, comPonto, detalhesDoCid } from "./cid";

const COLERA: Cid = {
  codigo: "A000",
  descricao: "Cólera devida a Vibrio cholerae 01, biótipo cholerae",
  capitulo: 1,
  capituloDesc: "Algumas doenças infecciosas e parasitárias",
  grupoDesc: "Doenças infecciosas intestinais",
  classif: null,
  sexo: null,
  naoObito: false,
};
const HIPERTENSAO: Cid = {
  codigo: "I10",
  descricao: "Hipertensão essencial (primária)",
  capitulo: 9,
  capituloDesc: "Doenças do aparelho circulatório",
  grupoDesc: "Doenças hipertensivas",
  classif: null,
  sexo: null,
  naoObito: false,
};

const decode = (input: string, hits: Partial<DecodeContext["hits"]>) =>
  cid.decode(input, {
    key: "",
    streets: null,
    hits: { q: input.trim(), ...hits },
  } as DecodeContext);

describe("CID-10", () => {
  it("resolve o código e mostra a doença", () => {
    const c = decode("A00.0", { cid: COLERA })[0];
    expect(c.render).toBe("cid");
    expect(c.output).toContain("A00.0");
    expect(c.output).toContain("Cólera");
  });

  it("o ponto vale mais que o acerto: a mesma doença pontua por grafia", () => {
    // Os três resolvem contra a mesma linha; só a nota muda, porque é a GRAFIA
    // que carrega o sinal de "isto é um CID".
    const comPontinho = decode("A00.0", { cid: COLERA })[0].forcedScore as number;
    const semPonto = decode("A000", { cid: COLERA })[0].forcedScore as number;
    const nua = decode("I10", { cid: HIPERTENSAO })[0].forcedScore as number;
    expect(comPontinho).toBeGreaterThan(semPonto);
    expect(semPonto).toBeGreaterThan(nua);
    // A forma de três caracteres casa com 80% do espaço letra+2 dígitos: "achou"
    // ali não é notícia, e ela fica abaixo do corte da bancada.
    expect(nua).toBeLessThan(0.35);
  });

  it("a busca por nome é sugestão, não achado", () => {
    const c = decode("cólera", { cids: [COLERA, HIPERTENSAO] })[0];
    expect(c.decoderId).toBe("cid-nome");
    expect(c.forcedScore).toBeLessThan(0.35);
    expect(c.label).toBe("2 códigos");
  });

  it("ignora acerto de uma tecla atrás", () => {
    const fora = cid.decode("A00.1", {
      key: "",
      streets: null,
      hits: { q: "A00.0", cid: COLERA },
    } as DecodeContext);
    expect(fora).toHaveLength(0);
  });

  it("encadeia a descrição, que é o que vira entrada de outra cifra", () => {
    expect(decode("A00.0", { cid: COLERA })[0].chainValue).toBe(COLERA.descricao);
  });

  it("repõe o ponto só quando há subcategoria", () => {
    expect(comPonto("A000")).toBe("A00.0");
    expect(comPonto("I10")).toBe("I10");
  });

  it("os detalhes trazem o capítulo, que é a pista que o código esconde", () => {
    const d = detalhesDoCid({ ...COLERA, sexo: "F", naoObito: true, classif: "*" });
    expect(d[0]).toContain("Capítulo 1");
    expect(d).toContain("Doenças infecciosas intestinais");
    expect(d).toContain("só para o sexo feminino");
    expect(d).toContain("não pode ser causa básica de óbito");
    expect(d.some((x) => x.includes("manifestação"))).toBe(true);
  });
});
