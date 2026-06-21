import type { AirportRow } from "@/features/airport/types";
import { defineDecoder } from "../define";
import type { LocationData } from "./location";

/**
 * Código de aeroporto → aeroporto no mapa. IATA (3 letras, ex.: GRU) ou ICAO
 * (4 letras, ex.: SBGR). Lê a base de aeroportos do contexto (OpenFlights,
 * carregada sob demanda quando a entrada é 3–4 letras).
 */
export const decoders = defineDecoder({
  id: "airport",
  name: "Aeroporto (IATA/ICAO)",
  category: "lookup",
  decode(input, ctx) {
    const code = input.trim().toUpperCase();
    if (!ctx.airports) return [];

    let row: AirportRow | undefined;
    let kind: string;
    let score: number;
    if (/^[A-Z]{3}$/.test(code)) {
      row = ctx.airports.rows.find((r) => r[0] === code);
      kind = "Aeroporto IATA";
      score = 0.5;
    } else if (/^[A-Z]{4}$/.test(code)) {
      row = ctx.airports.rows.find((r) => r[1] === code);
      kind = "Aeroporto ICAO";
      score = 0.62;
    } else {
      return [];
    }
    if (!row) return [];

    const [iata, icao, name, city, country, lat, lng] = row;
    const codes = [iata, icao].filter(Boolean).join(" / ");
    const place = [city, country].filter(Boolean).join(", ");
    const data: LocationData = {
      lat,
      lng,
      label: `${name} (${codes})`,
      detail: place,
      format: kind,
    };
    return [
      {
        decoderId: "airport",
        decoderName: kind,
        category: "lookup",
        label: codes,
        output: `${name} — ${place}`,
        forcedScore: score,
        render: "map",
        data,
      },
    ];
  },
});
