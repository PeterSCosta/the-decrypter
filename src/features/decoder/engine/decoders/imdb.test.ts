import type { Filme } from "@/features/filme/types";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { PARECE_IMDB, decoders } from "./imdb";

const d = Array.isArray(decoders) ? decoders[0] : decoders;

const ctx = (q: string, filme: Filme | null) =>
  ({ key: "", streets: null, ceps: null, hits: { q, filme } }) as unknown as DecodeContext;

const shawshank: Filme = {
  imdbId: "tt0111161",
  tituloBr: "Um Sonho de Liberdade",
  tituloPt: "Os Condenados de Shawshank",
  tituloOriginal: "The Shawshank Redemption",
  tituloIngles: "The Shawshank Redemption",
  ano: 1994,
  duracaoMin: 142,
  direcao: ["Frank Darabont"],
  generos: null,
  paises: null,
  wikidataId: "Q172241",
  fonte: "Wikidata",
};

describe("o portão do ID da IMDb", () => {
  it("aceita 7 e 8 dígitos, em qualquer caixa", () => {
    for (const s of ["tt0111161", "tt15398776", "TT0111161"])
      expect(PARECE_IMDB.test(s), s).toBe(true);
  });

  it("recusa o que não é ID de obra", () => {
    // `nm…` é PESSOA na IMDb — outra porta, que esta não abre.
    for (const s of ["tt111", "tt123456789", "nm0000151", "0111161", "tt01111a1"])
      expect(PARECE_IMDB.test(s), s).toBe(false);
  });
});

describe("o decoder de filme", () => {
  it("com a ficha confirmada, emite o card", () => {
    const r = d.decode("tt0111161", ctx("tt0111161", shawshank));
    expect(r).toHaveLength(1);
    expect(r[0].output).toContain("Um Sonho de Liberdade");
    expect(r[0].output).toContain("1994");
    expect(r[0].forcedScore).toBe(0.88);
    expect(r[0].render).toBe("filme");
  });

  /**
   * O ENCADEAMENTO É O TÍTULO, e o QID **jamais** encadeia: medido em 2.000
   * QIDs sorteados, 61,0% deles são lidos como coordenada pela própria bancada
   * — `Q220741` devolve três leituras de Geohash no litoral de SC.
   */
  it("encadeia o título, nunca o QID", () => {
    const r = d.decode("tt0111161", ctx("tt0111161", shawshank));
    expect(r[0].chainValue).toBe("Um Sonho de Liberdade");
    expect(r[0].chainValue).not.toContain("Q172241");
  });

  /**
   * A DISTINÇÃO QUE O CARD INTEIRO EXISTE PARA MANTER: perguntamos e a fonte
   * não conhece o ID. Isso NÃO é "o filme não existe" — o Wikidata cobre uma
   * fração do catálogo da IMDb (6,2% dos filmes de 2019 têm título pt-BR lá).
   */
  it("sem confirmação, diz que não confirmou — e não que o filme não existe", () => {
    const r = d.decode("tt9999999", ctx("tt9999999", null));
    expect(r).toHaveLength(1);
    expect(r[0].output).toContain("não conhece este ID");
    expect(r[0].output).not.toMatch(/não existe\b(?!:)/);
    expect(r[0].output).toContain("cobre só parte do catálogo");
    // Não resolveu nada: fica abaixo de qualquer leitura de verdade, e não
    // encadeia — encadear "não confirmei" seria propagar o nada.
    expect(r[0].forcedScore).toBeLessThan(0.4);
    expect(r[0].chainValue).toBe("");
  });

  it("resposta de outra tecla não vira card desta", () => {
    expect(d.decode("tt0111161", ctx("tt0068646", shawshank))).toHaveLength(0);
  });

  it("sem consulta nenhuma, cala", () => {
    expect(
      d.decode("tt0111161", { key: "", streets: null } as unknown as DecodeContext),
    ).toHaveLength(0);
  });

  it("o que não tem a forma nem chega à consulta", () => {
    for (const s of ["A resposta", "89010000", "nm0000151"])
      expect(d.decode(s, ctx(s, shawshank)), s).toHaveLength(0);
  });
});
