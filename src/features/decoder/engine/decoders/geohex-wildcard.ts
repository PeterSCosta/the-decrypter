import {
  BLUMENAU_BBOX,
  BRAZIL_BBOX,
  type GeoHexHit,
  resolveGeoHexWildcard,
} from "@/features/location/wildcard-location";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";
import type { LocationData } from "./location";

const WILDCARD = /[xX*_?]/;

function build(hits: GeoHexHit[], scope: string): DecodeCandidate[] {
  if (hits.length === 1) {
    const h = hits[0];
    const data: LocationData = {
      lat: h.lat,
      lng: h.lng,
      label: `GeoHex ${h.code}`,
      detail: scope,
      format: "GeoHex (curinga)",
    };
    return [
      {
        decoderId: "geohex-wildcard",
        decoderName: "GeoHex curinga",
        category: "lookup",
        label: `${h.code} · ${scope}`,
        output: `${h.code} — ${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`,
        forcedScore: 0.85,
        render: "map",
        data,
      },
    ];
  }
  // vários casamentos → lista de código → coordenada (escolha o certo p/ ver no mapa)
  const items = hits.map((h) => ({
    code: h.code,
    name: `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`,
    detail: scope,
  }));
  return [
    {
      decoderId: "geohex-wildcard",
      decoderName: "GeoHex curinga",
      category: "lookup",
      label: `${hits.length} casamentos em ${scope}`,
      output: hits.map((h) => h.code).join(" · "),
      forcedScore: 0.65,
      render: "code-list",
      data: items,
    },
  ];
}

/**
 * GeoHex com partes faltando (curingas) → lugares que casam, filtrados pelo
 * Brasil/Blumenau. Aceita o código com prefixo de 2 letras ("Nb1145875xxxx")
 * ou só a cauda numérica ("1145875xxx"), que é testada com o prefixo "Nb".
 */
export const decoders = defineDecoder({
  id: "geohex-wildcard",
  name: "GeoHex curinga",
  category: "lookup",
  decode(input) {
    const q = input.trim();
    if (!WILDCARD.test(q)) return [];

    let tail: string;
    let withPrefix: string;
    let onlyBlumenau = false;
    if (/^[A-Za-z]{2}[\dxX*_?]+$/.test(q)) {
      withPrefix = q;
      tail = q.slice(2);
    } else if (/^[\dxX*_?]+$/.test(q)) {
      withPrefix = `Nb${q}`; // cauda de Blumenau
      tail = q;
      onlyBlumenau = true;
    } else {
      return [];
    }

    const fixedDigits = (tail.match(/\d/g) ?? []).length;
    const wilds = (tail.match(/[xX*_?]/g) ?? []).length;
    if (fixedDigits < 3 || wilds < 1) return [];

    let hits = resolveGeoHexWildcard(withPrefix, BLUMENAU_BBOX);
    if (hits === null) return []; // curingas demais
    let scope = "Vale do Itajaí";
    if (hits.length === 0 && !onlyBlumenau) {
      hits = resolveGeoHexWildcard(withPrefix, BRAZIL_BBOX) ?? [];
      scope = "Brasil";
    }
    if (hits.length === 0) return [];
    return build(hits, scope);
  },
});
