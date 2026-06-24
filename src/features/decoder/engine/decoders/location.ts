import { cepByCode, formatCep } from "@/features/cep/types";
import { detectLocation, detectWhat3Words } from "@/features/location/formats";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

export interface LocationData {
  lat: number | null;
  lng: number | null;
  label: string;
  detail?: string;
  format: string;
  /** CEP a resolver via API quando não há coordenada local. */
  cep?: string;
  /** Endereço what3words a resolver via API. */
  w3w?: string;
}

function mapCandidate(data: LocationData, score: number): DecodeCandidate {
  const coord = data.lat != null && data.lng != null;
  return {
    decoderId: "location",
    decoderName: data.format,
    category: "lookup",
    label: coord ? `${data.lat?.toFixed(5)}, ${data.lng?.toFixed(5)}` : (data.cep ?? data.w3w),
    output: data.detail ? `${data.label} — ${data.detail}` : data.label,
    forcedScore: score,
    render: "map",
    data,
  };
}

/**
 * Detecta uma localização na entrada e mostra no mapa:
 *  - coordenadas em vários formatos (DD, DMS, DDM, Geohash, Plus Code, UTM,
 *    Maidenhead, Quadkey);
 *  - CEP (8 dígitos): usa a base local de SC; se não achar, o card resolve via
 *    BrasilAPI + Nominatim.
 * Só aparece quando há de fato uma localização.
 */
export const decoders = defineDecoder({
  id: "location",
  name: "Localização",
  category: "lookup",
  decode(input, ctx) {
    const out: DecodeCandidate[] = [];

    const loc = detectLocation(input);
    if (loc) {
      out.push(
        mapCandidate(
          {
            lat: loc.lat,
            lng: loc.lng,
            label: `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`,
            format: loc.format,
          },
          0.9,
        ),
      );
    }

    const w3w = detectWhat3Words(input);
    if (w3w) {
      out.push(
        mapCandidate({ lat: null, lng: null, label: `///${w3w}`, format: "what3words", w3w }, 0.85),
      );
    }

    const digits = input.replace(/\D/g, "");
    if (digits.length === 8 && ctx.ceps) {
      const row = cepByCode(ctx.ceps).get(digits)?.[0];
      if (row && row[4] != null && row[5] != null) {
        out.push(
          mapCandidate(
            {
              lat: row[4],
              lng: row[5],
              label: formatCep(digits),
              detail: `${[row[1] || row[2], ctx.ceps.municipios[row[3]]].filter(Boolean).join(" — ")} · SC`,
              format: "CEP",
            },
            0.92,
          ),
        );
      } else {
        out.push(
          mapCandidate(
            { lat: null, lng: null, label: formatCep(digits), format: "CEP", cep: digits },
            0.7,
          ),
        );
      }
    }
    return out;
  },
});
