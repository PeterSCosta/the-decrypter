import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as airport } from "./airport";

/**
 * A base de aeroportos saiu do navegador: o decoder deixou de varrer 7.599
 * linhas e passou a formatar o que a API pré-resolveu em `ctx.hits`. Os casos
 * são os mesmos; o que mudou é de onde o acerto vem.
 */
const GRU = {
  iata: "GRU",
  icao: "SBGR",
  nome: "Guarulhos Intl",
  cidade: "Sao Paulo",
  pais: "Brazil",
  lat: -23.43556,
  lng: -46.47306,
};
const SBNF = {
  iata: "NVT",
  icao: "SBNF",
  nome: "Min. Victor Konder",
  cidade: "Navegantes",
  pais: "Brazil",
  lat: -26.88,
  lng: -48.6514,
};

const decode = (input: string, aeroporto: typeof GRU | null) =>
  airport.decode(input, {
    key: "",
    streets: null,
    hits: { q: input.trim(), aeroporto },
  } as DecodeContext);

describe("aeroporto (IATA/ICAO)", () => {
  it("IATA (3 letras) → aeroporto no mapa", () => {
    const c = decode("GRU", GRU)[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("map");
    expect(c.decoderName).toBe("Aeroporto IATA");
    expect(c.output).toContain("Guarulhos");
    const data = c.data as { lat: number; lng: number; label: string };
    expect(data.lat).toBeCloseTo(-23.43556, 3);
    expect(data.label).toContain("GRU / SBGR");
  });

  it("ICAO (4 letras) → aeroporto, e pontua mais que IATA", () => {
    const icao = decode("SBNF", SBNF)[0];
    expect(icao.decoderName).toBe("Aeroporto ICAO");
    expect(icao.output).toContain("Navegantes");
    // 4 letras erram menos por acaso que 3 — o score reflete isso.
    expect(icao.forcedScore).toBeGreaterThan(decode("GRU", GRU)[0].forcedScore as number);
  });

  it("sem acerto do servidor não dispara", () => {
    expect(decode("ZZZ", null)).toEqual([]);
    expect(airport.decode("GRU", { key: "", streets: null } as DecodeContext)).toEqual([]);
  });

  it("recusa acerto de uma consulta anterior", () => {
    const stale = airport.decode("GRU", {
      key: "",
      streets: null,
      hits: { q: "NVT", aeroporto: GRU },
    } as DecodeContext);
    expect(stale).toEqual([]);
  });
});
