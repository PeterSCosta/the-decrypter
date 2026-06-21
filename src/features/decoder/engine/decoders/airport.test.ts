import type { AirportsData } from "@/features/airport/types";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as airport } from "./airport";

const airports: AirportsData = {
  source: "test",
  generatedAt: "2026-01-01",
  count: 2,
  rows: [
    ["GRU", "SBGR", "Guarulhos Intl", "Sao Paulo", "Brazil", -23.43556, -46.47306],
    ["NVT", "SBNF", "Min. Victor Konder", "Navegantes", "Brazil", -26.88, -48.6514],
  ],
};
const ctx: DecodeContext = { key: "", streets: null, ceps: null, airports };
const decode = (input: string) => airport.decode(input, ctx);

describe("aeroporto (IATA/ICAO)", () => {
  it("IATA (3 letras) → aeroporto no mapa", () => {
    const c = decode("GRU")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("map");
    expect(c.decoderName).toBe("Aeroporto IATA");
    expect(c.output).toContain("Guarulhos");
    const data = c.data as { lat: number; lng: number; label: string };
    expect(data.lat).toBeCloseTo(-23.43556, 3);
    expect(data.label).toContain("GRU / SBGR");
  });

  it("ICAO (4 letras) → aeroporto", () => {
    const c = decode("SBNF")[0];
    expect(c.decoderName).toBe("Aeroporto ICAO");
    expect(c.output).toContain("Navegantes");
  });

  it("código inexistente ou sem base não dispara", () => {
    expect(decode("ZZZ")).toEqual([]);
    expect(airport.decode("GRU", { key: "", streets: null, ceps: null })).toEqual([]);
  });
});
