import type { ItemWikidata } from "@/features/filme/types";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders } from "./wikidata-item";

const d = Array.isArray(decoders) ? decoders[0] : decoders;
const ctx = (q: string, item: ItemWikidata | null) =>
  ({ key: "", streets: null, ceps: null, hits: { q, item } }) as unknown as DecodeContext;

const base: ItemWikidata = {
  qid: "Q2",
  rotulo: "Terra",
  lingua: "pt-BR",
  descricao: "terceiro planeta a partir do Sol no Sistema Solar",
  tipos: ["planeta interior"],
  imdbId: null,
  lat: null,
  lng: null,
  ehFilme: false,
};

describe("o item do Wikidata", () => {
  it("responde o que a coisa é", () => {
    const r = d.decode("Q2", ctx("Q2", base));
    expect(r).toHaveLength(1);
    expect(r[0].output).toContain("Terra");
    expect(r[0].output).toContain("terceiro planeta");
    expect(r[0].forcedScore).toBe(0.9);
  });

  /**
   * A COORDENADA É O QUE MAIS VALE: ela cai no domínio central da bancada, e
   * o card vira ponto no mapa em vez de texto.
   */
  it("com coordenada, vira mapa e encadeia o ponto", () => {
    const r = d.decode(
      "Q155",
      ctx("Q155", { ...base, qid: "Q155", rotulo: "Brasil", lat: -14, lng: -53 }),
    );
    expect(r[0].render).toBe("map");
    expect(r[0].chainValue).toBe("-14, -53");
  });

  /**
   * O QID NUNCA ENCADEIA. Medido no repositório: 61% dos QIDs sorteados são
   * lidos como coordenada pela própria bancada — encadear um joga a volta
   * seguinte de volta na armadilha que este card acabou de desarmar.
   */
  it("sem coordenada, encadeia o rótulo — nunca o QID", () => {
    const r = d.decode("Q2", ctx("Q2", base));
    expect(r[0].chainValue).toBe("Terra");
    expect(r[0].chainValue).not.toContain("Q2");
  });

  /**
   * A língua do rótulo aparece quando NÃO é português. "Douglas Adams [mul]" é
   * honesto; apresentá-lo como se fosse o nome em português não é.
   */
  it("rótulo fora do português diz em que língua está", () => {
    const r = d.decode(
      "Q42",
      ctx("Q42", { ...base, qid: "Q42", rotulo: "Douglas Adams", lingua: "mul" }),
    );
    expect(r[0].notes).toContain("mul");
  });

  it("em português, não polui a nota com a língua", () => {
    expect(d.decode("Q2", ctx("Q2", base))[0].notes).not.toContain("pt-BR");
  });

  /**
   * Filme tem card próprio, mais rico — com título, ano, duração e direção.
   * Dois cards dizendo a mesma coisa com detalhe diferente é ruído com cara de
   * confirmação.
   */
  it("quando o item é filme, este card cala", () => {
    expect(d.decode("Q4941", ctx("Q4941", { ...base, qid: "Q4941", ehFilme: true }))).toEqual([]);
  });

  /**
   * Um `Q…` não promete existir. Sem confirmação, o silêncio é a resposta — e
   * a leitura de coordenada que fica na tela é a honesta ali.
   */
  it("QID desconhecido cala", () => {
    expect(d.decode("Q999999999", ctx("Q999999999", null))).toEqual([]);
  });

  it("o que não é QID nem chega à consulta", () => {
    for (const s of ["tt0111161", "4941", "Q0", "a porta preta"]) {
      expect(d.decode(s, ctx(s, base)), s).toEqual([]);
    }
  });

  it("resposta de outra tecla não vira card desta", () => {
    expect(d.decode("Q2", ctx("Q155", base))).toEqual([]);
  });
});
