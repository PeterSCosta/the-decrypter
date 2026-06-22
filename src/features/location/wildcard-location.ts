/**
 * Resolvedor de localização por curinga: dado um código com partes faltando
 * (curingas `x X * _ ?`), enumera os candidatos, decodifica e mantém só os que
 * caem dentro de uma caixa (Brasil / Blumenau). Usado para "achar o lugar"
 * quando falta um pedaço do código. CEP usa o índice do dataset (em cep/search);
 * GeoHex é algorítmico e enumerado aqui.
 */
import { type GeoPoint, parseGeoHex } from "./formats";

export interface BBox {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export const BRAZIL_BBOX: BBox = { latMin: -33.77, latMax: 5.27, lonMin: -73.99, lonMax: -28.84 };
export const BLUMENAU_BBOX: BBox = {
  latMin: -27.25,
  latMax: -26.7,
  lonMin: -49.35,
  lonMax: -48.75,
};

export const inBBox = (p: GeoPoint, b: BBox): boolean =>
  p.lat >= b.latMin && p.lat <= b.latMax && p.lng >= b.lonMin && p.lng <= b.lonMax;

const WILDCARD = /[xX*_?]/;
/** Limite de segurança: 4 curingas decimais = 10.000 candidatos. */
export const MAX_WILDCARDS = 4;

/** Expande um padrão em todos os candidatos (cada curinga → 0–9). null se passar do cap. */
export function enumerateWildcards(pattern: string, alphabet = "0123456789"): string[] | null {
  const positions: number[] = [];
  [...pattern].forEach((ch, i) => {
    if (WILDCARD.test(ch)) positions.push(i);
  });
  if (positions.length === 0) return [pattern];
  if (positions.length > MAX_WILDCARDS) return null;

  const base = [...pattern];
  const total = alphabet.length ** positions.length;
  const out: string[] = [];
  for (let n = 0; n < total; n++) {
    let v = n;
    for (let k = positions.length - 1; k >= 0; k--) {
      base[positions[k]] = alphabet[v % alphabet.length];
      v = Math.floor(v / alphabet.length);
    }
    out.push(base.join(""));
  }
  return out;
}

export interface GeoHexHit {
  code: string;
  lat: number;
  lng: number;
}

/**
 * Código GeoHex com curingas → pontos válidos dentro da bbox. Retorna null se
 * houver curingas demais (acima do cap).
 */
export function resolveGeoHexWildcard(pattern: string, bbox: BBox, limit = 30): GeoHexHit[] | null {
  const candidates = enumerateWildcards(pattern.trim());
  if (!candidates) return null;
  const hits: GeoHexHit[] = [];
  for (const code of candidates) {
    const pt = parseGeoHex(code);
    if (pt && inBBox(pt, bbox)) {
      hits.push({ code, lat: pt.lat, lng: pt.lng });
      if (hits.length >= limit) break;
    }
  }
  return hits;
}
