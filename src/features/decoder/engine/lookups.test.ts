import { describe, expect, it } from "vitest";
import { lookupDecoders } from "./lookups";
import type { DecodeContext } from "./types";

/**
 * A base de CEPs saiu do navegador: o decoder deixou de varrer um dataset local
 * e passou a formatar o que a API pré-resolveu em `ctx.hits`. Os casos são os
 * mesmos; o que mudou é de onde o acerto vem.
 *
 * Nota do mapeamento: `bairro` da API é o que o app chama de `localidade`, e
 * `localidade` da API é o **município** (ver `Seeder.SeedCeps`). Os fixtures
 * abaixo respeitam isso de propósito.
 */
const linha = (code: string, logradouro: string) => ({
  code,
  logradouro,
  bairro: "Centro",
  localidade: "Blumenau",
  uf: "SC",
  lat: null,
  lng: null,
});

const cepScPrefix = lookupDecoders.find((d) => d.id === "cep-sc-prefix");
if (!cepScPrefix) throw new Error("decoder cep-sc-prefix não registrado");

const decode = (input: string, achados: ReturnType<typeof linha>[] = []) =>
  cepScPrefix.decode(input, {
    key: "",
    streets: null,
    hits: { q: input.trim(), cepsPrefixo: achados },
  } as DecodeContext);

describe("CEP sem prefixo SC (88/89)", () => {
  it("6 dígitos resolvem prefixando 88", () => {
    const c = decode("305500", [linha("88305500", "Rua A")])[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("cep");
    expect(c.output).toContain("88305-500");
  });

  it("ignora separadores (305-500)", () => {
    expect(decode("305-500", [linha("88305500", "Rua A")])[0]?.output).toContain("88305-500");
  });

  it("não emite sem acerto — o portão de 8 dígitos agora é do servidor", () => {
    // Sem `cepsPrefixo`, não há o que formatar. O servidor é quem decide que
    // 8 dígitos são `cep-exact` e 6 são prefixo — a regra vive num lugar só.
    expect(decode("88305500")).toEqual([]);
    expect(decode("999999")).toEqual([]);
  });

  it("recusa acerto de uma consulta anterior", () => {
    const stale = cepScPrefix.decode("305500", {
      key: "",
      streets: null,
      hits: { q: "305501", cepsPrefixo: [linha("88305500", "Rua A")] },
    } as DecodeContext);
    expect(stale).toEqual([]);
  });
});
