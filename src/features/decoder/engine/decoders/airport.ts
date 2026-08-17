import { defineDecoder } from "../define";
import type { LocationData } from "./location";

/**
 * Código de aeroporto → aeroporto no mapa. IATA (3 letras, ex.: GRU) ou ICAO
 * (4 letras, ex.: SBGR).
 *
 * A resposta vem pré-resolvida em `ctx.hits`. Antes o app baixava os 7.599
 * aeroportos (230 KB gzip) e fazia um `find` linear a cada tecla, para responder
 * uma consulta por chave exata — a base inteira no navegador para achar uma
 * linha.
 */
export const decoders = defineDecoder({
  id: "airport",
  name: "Aeroporto (IATA/ICAO)",
  category: "lookup",
  decode(input, ctx) {
    const code = input.trim().toUpperCase();
    if (ctx.hits?.q !== input.trim() || !ctx.hits.aeroporto) return [];
    const a = ctx.hits.aeroporto;
    if (a.lat == null || a.lng == null) return [];

    // ICAO discrimina mais que IATA: 4 letras erram menos por acaso que 3.
    const ehIcao = code.length === 4;
    const kind = ehIcao ? "Aeroporto ICAO" : "Aeroporto IATA";
    const score = ehIcao ? 0.62 : 0.5;

    const codes = [a.iata, a.icao].filter(Boolean).join(" / ");
    const place = [a.cidade, a.pais].filter(Boolean).join(", ");
    const data: LocationData = {
      lat: a.lat,
      lng: a.lng,
      label: `${a.nome} (${codes})`,
      detail: place,
      format: kind,
    };
    return [
      {
        decoderId: "airport",
        decoderName: kind,
        category: "lookup",
        label: codes,
        output: `${a.nome} — ${place}`,
        forcedScore: score,
        render: "map",
        data,
      },
    ];
  },
});
