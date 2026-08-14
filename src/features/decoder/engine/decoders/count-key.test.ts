import { describe, expect, it } from "vitest";
import { partition, runDecoders } from "../run";
import type { DecodeContext } from "../types";
import { decoders as countKey } from "./count-key";

const ctx = (extra: Partial<DecodeContext> = {}): DecodeContext => ({
  key: "",
  streets: null,
  ceps: null,
  ...extra,
});

const run = (input: string, extra?: Partial<DecodeContext>) => countKey.decode(input, ctx(extra));

/**
 * Âncora do acervo: GIA-2026 04 "O poder das palavras" — 8 parágrafos que
 * contam 22 5 14 3 5 4 15 18 → VENCEDOR.
 * (acervo/gia-2026/gia-04-o-poder-das-palavras/texto/resolucao.md)
 */
const GIA04 = `Vieram as chuvas, os tropeços, o medo, as noites longas, mas juntos seguimos, lado a lado, sem hesitar, para vencermos com honra.

Escolhemos lutar sempre, mesmo cansados.

Nada impediu nossos passos firmes em frente. Lutando com fé, força, garra, coragem, união.

Caímos, levantamos, reerguemos.

Erros nos moldaram a crescer.

De cada queda, aprendizado.

Avançamos quando todos recuaram, buscamos mais, mesmo na incerteza, confiando no impossível, adiante pela vitória.

Resistimos a tudo que tentava nos parar, e fizemos disso nossa motivação maior. E essa é a Arromba!`;

describe("count-key (contagem como chave)", () => {
  it("GIA-04: os parágrafos entregam vencedor", () => {
    const cs = run(GIA04);
    const a1z26 = cs.find((c) => c.output === "vencedor");
    expect(a1z26).toBeDefined();
    expect(a1z26?.label).toBe("palavras por parágrafo → A1Z26");
    expect(a1z26?.forcedScore).toBeUndefined(); // texto disputa o topo pelo score normal

    const serie = cs.find((c) => c.output === "22 5 14 3 5 4 15 18");
    expect(serie?.forcedScore).toBe(0.3); // gaveta por projeto, não por acidente
  });

  it("a leitura sobe ao provável, a série crua fica na gaveta", () => {
    const { likely, unlikely } = partition(runDecoders(GIA04, ctx(), [countKey]).results);
    expect(likely.map((c) => c.output)).toContain("vencedor");
    expect(unlikely.map((c) => c.output)).toContain("22 5 14 3 5 4 15 18");
  });

  it("o portão barra entrada curta ou de uma linha só", () => {
    expect(run("sol e mar")).toEqual([]);
    expect(run("um dois tres quatro cinco seis sete oito nove dez onze doze")).toEqual([]);
    expect(run("um dois\ntres")).toEqual([]);
  });

  it("no modo uma cifra só, o portão não se aplica", () => {
    const cs = run("um dois\ntres", { only: "count-key" });
    expect(cs.map((c) => c.output)).toContain("2 1");
  });

  it("contagem fora de 1..26 não vira letra", () => {
    // Parágrafo de 30 palavras: a série sai, a leitura A1Z26 não.
    const longo = `${Array.from({ length: 30 }, (_, i) => `p${i}`).join(" ")}\n\nsol e mar\n\npaz total`;
    const cs = run(longo);
    expect(cs.some((c) => c.output === "30 3 2")).toBe(true);
    expect(cs.some((c) => c.label?.includes("A1Z26"))).toBe(false);
  });

  it("o caractere do 2º campo vira uma série própria", () => {
    const texto = `A ave azul canta na varanda quando amanhece devagar

Sol e mar em paz

Casa cheia de gente boa`;
    const cs = run(texto, { aux: "a" });
    expect(cs.some((c) => c.label?.startsWith('ocorrências de "a"'))).toBe(true);
  });

  it("prosa comum não inventa leitura A1Z26 em toda linha", () => {
    const cs = run("Sol\ne mar\n\nazul do ceu que cobre a cidade inteira de manha");
    // A série existe (gaveta), mas nada aqui promete ser mensagem.
    expect(cs.every((c) => c.forcedScore === 0.3 || c.label?.includes("A1Z26"))).toBe(true);
  });
});
