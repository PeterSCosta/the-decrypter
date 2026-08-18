import type { VotacoesData } from "@/features/votacao/types";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as votacao } from "./votacao";

const base: VotacoesData = {
  source: "TSE",
  generatedAt: "2026-08-18",
  cobertura: "Blumenau/SC, eleição de 2024",
  aviso: "",
  count: 3,
  rows: [
    [1490, "ROSANE MAGALY MARTINS", "Prefeito", 2024, "44"],
    [55968, "ODAIR TRAMONTIN", "Prefeito", 2024, "11"],
    // empate real: 17 votações desta base têm mais de um candidato
    [1490, "FULANO DE TAL", "Vereador", 2024, "12345"],
  ],
};
const decode = (input: string, votacoes: VotacoesData | null = base) =>
  votacao.decode(input, { key: "", streets: null, votacoes } as DecodeContext);

describe("votação de Blumenau", () => {
  it("acha pelo número exato de votos — é a mecânica da GIA-34", () => {
    const c = decode("55968")[0];
    expect(c.output).toContain("ODAIR TRAMONTIN");
    expect(c.chainValue).toBe("ODAIR TRAMONTIN");
  });

  it("empate mostra TODOS: escolher um seria inventar a resposta", () => {
    const c = decode("1490")[0];
    expect(c.output).toContain("ROSANE");
    expect(c.output).toContain("FULANO");
  });

  it("é pré-resolvido: número que não é votação de ninguém não emite", () => {
    // Um número de 4 a 6 dígitos não tem assinatura nenhuma. Se emitisse por
    // forma, sujaria toda entrada numérica da bancada.
    expect(decode("12345")).toHaveLength(0);
  });

  it("a nota fica acima do corte, e a conta é o argumento", () => {
    // 171 votações distintas em 90.000 números de cinco dígitos = 0,19% de
    // chance de bater por acaso. Isso é sinal, não ruído — a primeira versão
    // deste decoder punha 0,34 e escondia o acerto na gaveta.
    const n = decode("55968")[0].forcedScore as number;
    expect(n).toBeGreaterThan(0.35);
    // E longe do teto: a base é só de 2024.
    expect(n).toBeLessThan(0.7);
  });

  it("sem a base carregada, não inventa", () => {
    expect(decode("55968", null)).toHaveLength(0);
  });

  it("texto não é número de votos", () => {
    expect(decode("55968 votos")).toHaveLength(0);
  });
});
