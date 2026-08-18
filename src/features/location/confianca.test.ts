import { runDecoders } from "@/features/decoder/engine/run";
import type { DecodeContext } from "@/features/decoder/engine/types";
import type { EstacoesData } from "@/features/estacao/types";
import { describe, expect, it } from "vitest";
import { CONFIANCA, detectLocation } from "./formats";

/**
 * A cascata do `detectLocation` sempre ordenou por confiança — os frouxos por
 * último, com o comentário explicando o porquê. Mas a NOTA emitida era 0,90
 * para todos, e o efeito era o pior tipo de erro: resposta errada com cara de
 * certa, acima da certa.
 */
const estacoes: EstacoesData = {
  source: "IBGE",
  cobertura: "Vale do Itajaí",
  count: 1,
  municipios: ["Blumenau"],
  rows: [["1400M", 0, "R", "NÃO ENCONTRADA", "Marco padrão IBGE.", -26.8761, -49.1288]],
};

describe("a nota segue a camada que resolveu", () => {
  it("assinatura literal vale mais que forma própria, que vale mais que frouxo", () => {
    expect(detectLocation("geo:-26.9194,-49.0661")!.confianca).toBe(CONFIANCA.literal);
    expect(detectLocation("-26.9194, -49.0661")!.confianca).toBe(CONFIANCA.forma);
    // `1400m` só casa como Geohash — a camada frouxa.
    expect(detectLocation("1400m")!.confianca).toBe(CONFIANCA.frouxa);
  });

  it("uma estação REAL de Blumenau ganha do Geohash que cai na Antártida", () => {
    // Era este o sintoma: `1400M` saía como Geohash em −78,68/−134,75 com 0,90,
    // e a estação geodésica de verdade ficava em segundo.
    const { results } = runDecoders("1400M", {
      key: "",
      streets: null,
      estacoes,
    } as unknown as DecodeContext);
    const primeiro = results[0];
    expect(primeiro.decoderName).toContain("Estação");
    const geohash = results.find((r) => r.decoderName.includes("Geohash"));
    expect(geohash!.score).toBeLessThan(primeiro.score);
  });

  it("o atalho local ganha do Geohash global — é o que a Ajuda promete", () => {
    // `g7rpj` saía na Islândia com 0,90, acima de Blumenau.
    const { results } = runDecoders("g7rpj", { key: "", streets: null } as DecodeContext);
    const blumenau = results.find((r) => String(r.output).includes("Blumenau"));
    expect(blumenau, "a leitura local sumiu").toBeTruthy();
    const islandia = results.find(
      (r) => r.decoderName === "Geohash" && !String(r.output).includes("Blumenau"),
    );
    if (islandia) expect(blumenau!.score).toBeGreaterThan(islandia.score);
  });
});
