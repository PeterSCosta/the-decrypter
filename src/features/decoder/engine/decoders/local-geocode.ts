import {
  type LocalGeoHit,
  decodeGeohashLocal,
  decodePlusCodeLocal,
} from "@/features/location/formats";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";
import type { LocationData } from "./location";

/**
 * Atalhos de cauda local: um código PARCIAL (sem o prefixo da cidade) é
 * auto-completado assumindo Blumenau ou Itajaí — a mesma ideia do "Nb" do GeoHex,
 * estendida ao Plus Code curto e à cauda de Geohash. Score moderado e rótulo
 * "assumindo {cidade}" porque é uma suposição, não uma leitura inequívoca.
 */
function candidate(hit: LocalGeoHit, format: string, score: number): DecodeCandidate {
  const data: LocationData = {
    lat: hit.lat,
    lng: hit.lng,
    label: `${format} ${hit.full}`,
    detail: `assumindo ${hit.anchor}`,
    format,
  };
  return {
    decoderId: "local-geocode",
    decoderName: format,
    category: "lookup",
    label: `${hit.full} · ${hit.anchor}`,
    output: `${hit.full} — ${hit.lat.toFixed(5)}, ${hit.lng.toFixed(5)} (${hit.anchor})`,
    forcedScore: score,
    render: "map",
    data,
  };
}

export const decoders = defineDecoder({
  id: "local-geocode",
  name: "Código local (cauda)",
  category: "lookup",
  decode(input) {
    const q = input.trim();
    const out: DecodeCandidate[] = [];

    const plus = decodePlusCodeLocal(q);
    if (plus) out.push(candidate(plus, "Plus Code (local)", 0.72));

    const gh = decodeGeohashLocal(q);
    // 0,62 e não 0,50: o atalho SE AUTO-VALIDA — só emite se o ponto cair na
    // caixa do Vale —, e isso é evidência que o Geohash global não tem. Com os
    // dois em 0,50 dava empate, e `g7rpj` continuava saindo na Islândia acima
    // de Blumenau, que é justamente o que a Ajuda promete o contrário.
    // Fica abaixo do Plus Code local (0,72), porque a cauda de geohash é uma
    // inferência mais frouxa que a de plus code.
    if (gh) out.push(candidate(gh, "Geohash (cauda)", 0.62));

    return out;
  },
});
