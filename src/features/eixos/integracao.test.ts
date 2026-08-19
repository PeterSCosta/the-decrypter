import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decoders } from "@/features/decoder/engine/registry";
import { runDecoders } from "@/features/decoder/engine/run";
import type { DecodeContext } from "@/features/decoder/engine/types";
import type { EixosData } from "@/features/eixos/types";
import { describe, expect, it } from "vitest";

const eixos = JSON.parse(
  readFileSync(resolve(__dirname, "../../../public/data/eixos-blumenau.json"), "utf8"),
) as EixosData;

/**
 * O registro descobre os decoders por glob de arquivo. Um teste de unidade que
 * importa o decoder direto passa mesmo que ele NUNCA seja registrado — este
 * fecha esse buraco: entra pelo fan-out de verdade, como a bancada entra.
 */
describe("quadra no fan-out real", () => {
  const ctx = { key: "", streets: null, eixos } as DecodeContext;

  it("é descoberta pelo registro", () => {
    expect(decoders.map((d) => d.id)).toContain("quadra-blumenau");
  });

  it("responde uma quadra digitada e lidera o ranking", () => {
    const { results } = runDecoders("3-4-10-3", ctx);
    const card = results.find((c) => c.decoderId === "quadra-blumenau");
    expect(card).toBeDefined();
    // Nada mais na bancada sabe o que são quatro grupos de números de Blumenau,
    // então o card da quadra tem de ficar acima do ruído das cifras.
    expect(results[0].decoderId).toBe("quadra-blumenau");
  });

  it("não polui a bancada com quatro números que não são quadra", () => {
    const { results } = runDecoders("12-25-2019-1", ctx);
    expect(results.find((c) => c.decoderId === "quadra-blumenau")).toBeUndefined();
  });
});
