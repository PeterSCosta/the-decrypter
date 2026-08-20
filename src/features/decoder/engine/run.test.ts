import type { StreetRow, StreetsData } from "@/features/street-guide/types";
import { describe, expect, it } from "vitest";
import { runDecoders } from "./run";
import type { DecodeContext, Decoder } from "./types";

const streets: StreetsData = {
  source: "test",
  generatedAt: "2026-01-01",
  count: 1,
  rows: [
    {
      codigo: 3722,
      tipo: "R",
      nome: "ABACATE",
      bairroNum: 16,
      bairro: "Do Salto",
      numLei: 6416,
      dataLei: "09/02/2004",
      localizacao: "R. DAS TORRES, 45",
      ext: 135,
      larg: 8.4,
      atas: "",
    },
  ],
};

/**
 * CEP saiu do navegador: chega pré-resolvido em `hits`. O `bairro` da API é o
 * que o app chama de `localidade`, e o `localidade` da API é o município.
 */
const cepDaApi = {
  code: "88010500",
  logradouro: "Rua Teste",
  bairro: "Centro",
  localidade: "Florianópolis",
  uf: "SC",
  lat: -27.5,
  lng: -48.5,
};

const ctx: DecodeContext = { key: "", streets };
const noData: DecodeContext = { key: "", streets: null, ceps: null };
/** Contexto com o acerto que a API teria devolvido para `q`. */
const comHits = (q: string, hits: Partial<NonNullable<DecodeContext["hits"]>>): DecodeContext =>
  ({ key: "", streets, hits: { q, ...hits } }) as DecodeContext;

describe("runDecoders", () => {
  it("ranks readable Base64 output at the top", () => {
    const { results } = runDecoders("SGVsbG8gbXVuZG8=", noData);
    expect(results[0].decoderId).toBe("base64");
    expect(results[0].output).toBe("Hello mundo");
  });

  it("resolves a Blumenau street código as a high-confidence lookup", () => {
    const { results } = runDecoders("3722", ctx);
    const hit = results.find((r) => r.decoderId === "street-code");
    expect(hit).toBeDefined();
    expect((hit?.data as StreetRow[])[0].nome).toBe("ABACATE");
    expect(hit?.score ?? 0).toBeGreaterThan(0.9);
  });

  it("resolves a Nº da Lei", () => {
    const { results } = runDecoders("6416", ctx);
    expect(results.some((r) => r.decoderId === "street-law")).toBe(true);
  });

  it("resolves a Data da Lei (date query)", () => {
    const hit = runDecoders("09/02/2004", ctx).results.find((r) => r.decoderId === "street-date");
    expect(hit).toBeDefined();
    expect((hit?.data as StreetRow[])[0].nome).toBe("ABACATE");
  });

  it("resolves a street by name (text query)", () => {
    const exact = runDecoders("ABACATE", ctx).results.find((r) => r.decoderId === "street-name");
    expect(exact).toBeDefined();
    expect((exact?.data as StreetRow[])[0].nome).toBe("ABACATE");
    expect(exact?.score ?? 0).toBeGreaterThan(0.9); // nome exato
    // prefixo também acha
    expect(runDecoders("abac", ctx).results.some((r) => r.decoderId === "street-name")).toBe(true);
    // texto curto demais não dispara
    expect(runDecoders("ab", ctx).results.some((r) => r.decoderId === "street-name")).toBe(false);
  });

  it("resolves an exact CEP (with dash)", () => {
    const { results } = runDecoders("88010-500", comHits("88010-500", { cep: cepDaApi }));
    expect(results.some((r) => r.decoderId === "cep-exact")).toBe(true);
  });

  it("resolves CEPs by wildcard pattern", () => {
    const ctxCuringa = comHits("880105x0", { cepCuringa: { total: 1, hits: [cepDaApi] } });
    const hit = runDecoders("880105x0", ctxCuringa).results.find(
      (r) => r.decoderId === "cep-wildcard",
    );
    expect(hit).toBeDefined();
    const curinga = hit?.data as { padrao: string; total: number; hits: { cep: string }[] };
    expect(curinga.hits[0].cep).toBe("88010500");
    // O padrão vai no payload porque é ele que o botão de baixar CSV manda ao
    // servidor — o `output` do card é prosa, não serve para pedir arquivo.
    expect(curinga.padrao).toBe("880105x0");
    expect(curinga.total).toBe(1);
    // O rótulo mostra o total REAL do banco, não o tamanho da lista trazida.
    expect(hit?.label).toContain("1 CEP(s)");
    // sem curinga, o decoder de curinga não dispara (fica com o cep-exact)
    expect(
      runDecoders("88010500", comHits("88010500", { cep: cepDaApi })).results.some(
        (r) => r.decoderId === "cep-wildcard",
      ),
    ).toBe(false);
  });

  it("produces nothing for empty data lookups when datasets are absent", () => {
    const { results } = runDecoders("3722", noData);
    // Lookups que dependem de dataset (ruas/CEP/IBGE) ficam silenciosos sem dados.
    // `digit-count` é um lookup de tabela estática (não precisa de dataset) e pode aparecer.
    expect(results.some((r) => r.category === "lookup" && r.decoderId !== "digit-count")).toBe(
      false,
    );
  });
});

describe("dedup não gasta o topo com a mesma resposta", () => {
  it("colapsa saídas que só diferem em caixa ou acento", () => {
    // O caso medido na tela: `34 31 38 38 41` punha a MESMA leitura em #1, #2 e
    // #3 — cíclico em minúscula, Aritmética escondida em maiúscula, e o painel.
    // Três cards, todos 0,75, uma resposta só. O topo é o espaço mais escasso
    // deste produto; três cópias parecem confirmação e não são.
    const falso = (id: string, output: string): Decoder => ({
      id,
      name: id,
      category: "classical",
      decode: () => [
        { decoderId: id, decoderName: id, category: "classical", output, forcedScore: 0.75 },
      ],
    });
    const r = runDecoders("x", { key: "", streets: null } as unknown as DecodeContext, [
      falso("a", "hello"),
      falso("b", "HELLO"),
      falso("c", "héllo"),
      falso("d", "outra coisa"),
    ]);
    expect(r.results).toHaveLength(2);
    expect(r.results.map((c) => c.output)).toContain("outra coisa");
  });
});
