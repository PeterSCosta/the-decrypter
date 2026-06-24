/**
 * Âncoras locais de Blumenau e Itajaí. Para cada sistema de geocódigo, guarda o
 * prefixo/faixa fixo da cidade — a base dos "atalhos de cauda" (como o "Nb" do
 * GeoHex): um código parcial é auto-completado assumindo o prefixo local.
 *
 * Prefixos VERIFICADOS rodando encoders reais contra as coordenadas-âncora
 * (centro de cada cidade). Fonte única — não duplicar bbox/prefixo por aí.
 */

export interface BBox {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export const inBBox = (p: { lat: number; lng: number }, b: BBox): boolean =>
  p.lat >= b.latMin && p.lat <= b.latMax && p.lng >= b.lonMin && p.lng <= b.lonMax;

export const BRAZIL_BBOX: BBox = { latMin: -33.77, latMax: 5.27, lonMin: -73.99, lonMax: -28.84 };

export interface LocalAnchor {
  /** Nome legível da cidade. */
  name: string;
  /** Centro aproximado (WGS84). */
  lat: number;
  lng: number;
  /** Caixa justa da cidade (discrimina entre as âncoras — não se sobrepõem). */
  bbox: BBox;
  /** Código IBGE do município. */
  ibge: string;
  /** Faixa de CEP da sede [min, max] como inteiros de 8 dígitos. */
  cepSede: [number, number];
  /** Prefixo de 2 letras do GeoHex (geohex.net) — comum às duas: "Nb". */
  geohex: string;
  /** "Area code" de 4 chars do Plus Code (OLC) p/ recuperar código curto. */
  plusPrefix: string;
  /** Exemplo de Plus Code completo no centro da cidade. */
  plusExample: string;
  /** Prefixo de Geohash da cidade (regional comum = "6gj"). */
  geohashCity: string;
  /** Zona UTM (banda inclusa) — comum às duas: "22J". */
  utmZone: string;
}

export const BLUMENAU: LocalAnchor = {
  name: "Blumenau",
  lat: -26.9194,
  lng: -49.0661,
  bbox: { latMin: -27.05, latMax: -26.78, lonMin: -49.2, lonMax: -48.95 },
  ibge: "4202404",
  cepSede: [89010000, 89045999],
  geohex: "Nb",
  plusPrefix: "585G",
  plusExample: "585G3WJM+6H",
  geohashCity: "6gjn",
  utmZone: "22J",
};

export const ITAJAI: LocalAnchor = {
  name: "Itajaí",
  lat: -26.9078,
  lng: -48.6618,
  bbox: { latMin: -27.0, latMax: -26.82, lonMin: -48.78, lonMax: -48.58 },
  ibge: "4208203",
  cepSede: [88300000, 88319999],
  geohex: "Nb",
  plusPrefix: "585H",
  plusExample: "585H38RQ+V7",
  geohashCity: "6gjq",
  utmZone: "22J",
};

export const ANCHORS: LocalAnchor[] = [BLUMENAU, ITAJAI];

/**
 * Caixa que cobre as DUAS cidades (e o trecho entre elas: Gaspar, Ilhota,
 * Navegantes, Balneário Camboriú). Usada pelos atalhos que compartilham prefixo
 * regional (GeoHex "Nb", Geohash "6gj") e aceitam tanto Blumenau quanto Itajaí.
 */
export const VALE_BBOX: BBox = { latMin: -27.3, latMax: -26.5, lonMin: -49.45, lonMax: -48.55 };

/** Âncora cuja caixa justa contém o ponto (ou null se cair fora das duas). */
export function anchorForPoint(p: { lat: number; lng: number }): LocalAnchor | null {
  return ANCHORS.find((a) => inBBox(p, a.bbox)) ?? null;
}

/** Rótulo de escopo de um ponto: cidade específica, "Vale do Itajaí", ou null. */
export function scopeLabel(p: { lat: number; lng: number }): string | null {
  const a = anchorForPoint(p);
  if (a) return a.name;
  return inBBox(p, VALE_BBOX) ? "Vale do Itajaí" : null;
}
