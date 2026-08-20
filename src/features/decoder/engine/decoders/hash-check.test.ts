import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { DecodeCandidate, DecodeContext } from "../types";
import { decoders } from "./hash-check";

const dec = Array.isArray(decoders) ? decoders[0] : decoders;
const ctx = (aux: string) => ({ key: "", aux, streets: null, ceps: null }) as DecodeContext;
const cards = (texto: string, hash: string) => dec.decode(texto, ctx(hash)) as DecodeCandidate[];

const TEXTO = "PONTE DE FERRO";

describe("conferir hash", () => {
  /**
   * A única família desta bancada com risco ZERO de resposta errada: bate ou não
   * bate. Por isso é a nota mais alta que existe aqui — não é palpite, é
   * igualdade.
   */
  it("reconhece o acerto nos três hashes e no CRC", () => {
    for (const [nome, alg] of [
      ["MD5", "md5"],
      ["SHA-1", "sha1"],
      ["SHA-256", "sha256"],
    ] as const) {
      const h = createHash(alg).update(TEXTO, "utf8").digest("hex");
      const c = cards(TEXTO, h)[0];
      expect(c.label, nome).toContain("BATE");
      expect(c.forcedScore, nome).toBe(0.99);
    }
  });

  it("o algoritmo sai do COMPRIMENTO, não de uma escolha da pessoa", () => {
    const md5 = createHash("md5").update(TEXTO, "utf8").digest("hex");
    expect(cards(TEXTO, md5)[0].label).toContain("MD5");
    const sha = createHash("sha256").update(TEXTO, "utf8").digest("hex");
    expect(cards(TEXTO, sha)[0].label).toContain("SHA-256");
  });

  /**
   * Resposta negativa é resposta: mostrar o hash CALCULADO deixa a pessoa
   * comparar caractere a caractere, em vez de só ouvir "não".
   */
  it("quando não bate, mostra o hash calculado", () => {
    const h = createHash("md5").update(TEXTO, "utf8").digest("hex");
    const c = cards("OUTRA COISA", h)[0];
    expect(c.label).toContain("não bate");
    expect(c.output).toContain(createHash("md5").update("OUTRA COISA", "utf8").digest("hex"));
  });

  it("caixa do hash não importa — a prova pode dar em maiúsculas", () => {
    const h = createHash("sha1").update(TEXTO, "utf8").digest("hex").toUpperCase();
    expect(cards(TEXTO, h)[0].label).toContain("BATE");
  });

  describe("o portão", () => {
    it("sem hash no 2º campo, não emite — é o que o mantém fora do fan-out", () => {
      expect(cards(TEXTO, "")).toHaveLength(0);
    });

    it("2º campo que não é hex não é para nós", () => {
      expect(cards(TEXTO, "chave da prova")).toHaveLength(0);
      expect(cards(TEXTO, "GINCANA")).toHaveLength(0);
    });

    it("entrada vazia não emite", () => {
      expect(cards("", createHash("md5").update("x").digest("hex"))).toHaveLength(0);
    });
  });

  /**
   * Comprimento hex que não é de nenhum algoritmo conhecido: a bancada DIZ o que
   * conhece, em vez de calar. Calar aqui pareceria defeito.
   */
  it("comprimento desconhecido devolve o que a bancada conhece", () => {
    const c = cards(TEXTO, "abc123")[0];
    expect(c.output).toContain("CRC-32 (8)");
    expect(c.output).toContain("SHA-256 (64)");
  });
});
