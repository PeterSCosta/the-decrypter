import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ALGORITMOS, crc32, md5, sha1, sha256 } from "./hashes";

/**
 * A VERDADE DE REFERÊNCIA É O `node:crypto`.
 *
 * Estas quatro funções foram escritas à mão porque o `crypto.subtle` do
 * navegador é assíncrono e não tem MD5 nem CRC-32 — e o `decode()` de um
 * decoder é síncrono por contrato. Escrever hash à mão só é aceitável porque
 * cada linha é conferida contra uma implementação de verdade: se qualquer uma
 * estiver errada em qualquer entrada, este teste reprova.
 */

/** Entradas escolhidas para exercitar padding, múltiplos de bloco e UTF-8. */
const CASOS = [
  "",
  "a",
  "abc",
  "The quick brown fox jumps over the lazy dog",
  "A resposta esta na praca da prefeitura de Blumenau",
  "ação, coração e não", // multi-byte: o padding conta BYTES, não caracteres
  "x".repeat(55), // um byte antes de precisar de bloco extra
  "x".repeat(56), // exatamente onde o comprimento não cabe mais
  "x".repeat(64), // um bloco cheio
  "x".repeat(1000),
];

describe("hashes contra o node:crypto", () => {
  for (const [nome, meu, alg] of [
    ["MD5", md5, "md5"],
    ["SHA-1", sha1, "sha1"],
    ["SHA-256", sha256, "sha256"],
  ] as const) {
    it(nome, () => {
      for (const t of CASOS) {
        expect(meu(t), `${nome} de ${JSON.stringify(t.slice(0, 24))}`).toBe(
          createHash(alg).update(t, "utf8").digest("hex"),
        );
      }
    });
  }
});

describe("CRC-32", () => {
  /** Os vetores canônicos do polinômio 0xEDB88320. */
  it("bate nos vetores canônicos", () => {
    expect(crc32("")).toBe("00000000");
    expect(crc32("a")).toBe("e8b7be43");
    expect(crc32("abc")).toBe("352441c2");
    expect(crc32("123456789")).toBe("cbf43926");
  });

  it("sai sempre com oito caracteres, inclusive com zero à esquerda", () => {
    for (const t of CASOS) expect(crc32(t)).toHaveLength(8);
  });
});

describe("a tabela que o decoder usa", () => {
  it("o comprimento em hex de cada algoritmo é o que ele de fato produz", () => {
    for (const a of ALGORITMOS) {
      expect(a.fn("qualquer coisa"), a.nome).toHaveLength(a.hex);
    }
  });

  it("os quatro comprimentos são distintos — é o que permite escolher pelo tamanho", () => {
    const tamanhos = ALGORITMOS.map((a) => a.hex);
    expect(new Set(tamanhos).size).toBe(tamanhos.length);
  });
});
