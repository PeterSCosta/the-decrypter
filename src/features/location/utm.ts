/**
 * Inverso da projeção UTM (WGS84): easting/northing → lat/lon.
 *
 * Mora fora de `formats.ts` porque o MGRS é literalmente UTM com outro nome nas
 * casas: `mgrs.ts` precisa desta conta e `formats.ts` importa os dois. Deixar a
 * conta aqui evita o ciclo de import (formats → mgrs → formats).
 */

export interface GeoPointLike {
  lat: number;
  lng: number;
}

/**
 * Série inversa de Snyder para a UTM em WGS84. `isNorth` decide se o northing
 * carrega o falso norte de 10.000.000 m do hemisfério sul.
 */
export function utmToLatLng(
  zone: number,
  isNorth: boolean,
  easting: number,
  northing: number,
): GeoPointLike | null {
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) return null;
  if (zone < 1 || zone > 60) return null;

  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const x = easting - 500000;
  let y = northing;
  if (!isNorth) y -= 10000000;

  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const fp =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinF = Math.sin(fp);
  const cosF = Math.cos(fp);
  const tanF = Math.tan(fp);
  const C1 = ep2 * cosF ** 2;
  const T1 = tanF ** 2;
  const R1 = (a * (1 - e2)) / (1 - e2 * sinF ** 2) ** 1.5;
  const N1 = a / Math.sqrt(1 - e2 * sinF ** 2);
  const D = x / (N1 * k0);

  const lat =
    fp -
    ((N1 * tanF) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 3 * C1 ** 2 - 252 * ep2) * D ** 6) / 720);
  const lng0 = ((zone * 6 - 183) * Math.PI) / 180;
  const lng =
    lng0 +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5) / 120) /
      cosF;

  const outLat = (lat * 180) / Math.PI;
  const outLng = (lng * 180) / Math.PI;
  if (!Number.isFinite(outLat) || !Number.isFinite(outLng)) return null;
  if (outLat < -90 || outLat > 90 || outLng < -180 || outLng > 180) return null;
  return { lat: outLat, lng: outLng };
}
