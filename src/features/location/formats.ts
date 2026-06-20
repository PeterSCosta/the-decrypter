/**
 * Parsers de formatos de coordenadas geográficas → { lat, lng } em graus
 * decimais (WGS84). Cobre os formatos mais comuns; `detectLocation` tenta todos
 * e devolve o primeiro que casar, com o nome do formato.
 */
import { cellToLatLng, isValidCell } from "h3-js";

export interface GeoPoint {
  lat: number;
  lng: number;
}
export interface DetectedLocation extends GeoPoint {
  format: string;
}

function valid(lat: number, lng: number): GeoPoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// ---- DD: "-26.9906, -48.6356" --------------------------------------------
export function parseDD(raw: string): GeoPoint | null {
  const m = raw.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  return valid(Number(m[1]), Number(m[2]));
}

// ---- DMS / DDM: "26°59'26.2\"S 48°38'08.2\"W" / "26°59.436'S 48°38.136'W" --
function angleComponents(raw: string, withSeconds: boolean): GeoPoint | null {
  const re = withSeconds
    ? /(\d{1,3})\s*[°:\s]\s*(\d{1,2})\s*['′:\s]\s*([\d.]+)\s*["″]?\s*([NSEWnsew])/g
    : /(\d{1,3})\s*[°:\s]\s*([\d.]+)\s*['′]?\s*([NSEWnsew])/g;
  const found: { value: number; hemi: string }[] = [];
  for (const m of raw.matchAll(re)) {
    const deg = Number(m[1]);
    const min = Number(m[2]);
    const sec = withSeconds ? Number(m[3]) : 0;
    const hemi = (withSeconds ? m[4] : m[3]).toUpperCase();
    found.push({ value: deg + min / 60 + sec / 3600, hemi });
  }
  if (found.length < 2) return null;
  const lat = found.find((f) => f.hemi === "N" || f.hemi === "S");
  const lng = found.find((f) => f.hemi === "E" || f.hemi === "W");
  if (!lat || !lng) return null;
  return valid(
    lat.hemi === "S" ? -lat.value : lat.value,
    lng.hemi === "W" ? -lng.value : lng.value,
  );
}
export const parseDMS = (raw: string) => angleComponents(raw, true);
export const parseDDM = (raw: string) => angleComponents(raw, false);

// ---- Geohash --------------------------------------------------------------
const GEOHASH_B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
export function decodeGeohash(raw: string): GeoPoint | null {
  const h = raw.trim().toLowerCase();
  // exige >=4 chars válidos e ao menos 1 letra (p/ não confundir com Quadkey/CEP)
  if (h.length < 4 || !/[a-z]/.test(h) || ![...h].every((c) => GEOHASH_B32.includes(c)))
    return null;
  let even = true;
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  for (const c of h) {
    const idx = GEOHASH_B32.indexOf(c);
    for (let b = 4; b >= 0; b--) {
      const bit = (idx >> b) & 1;
      if (even) {
        const mid = (lngMin + lngMax) / 2;
        if (bit) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (bit) latMin = mid;
        else latMax = mid;
      }
      even = !even;
    }
  }
  return valid((latMin + latMax) / 2, (lngMin + lngMax) / 2);
}

// ---- Maidenhead grid locator ---------------------------------------------
export function decodeMaidenhead(raw: string): GeoPoint | null {
  const g = raw.trim();
  if (!/^[A-Ra-r]{2}\d{2}([A-Xa-x]{2}(\d{2})?)?$/.test(g)) return null;
  const U = g.toUpperCase();
  let lng = -180;
  let lat = -90;
  let lngSize = 20;
  let latSize = 10;
  lng += (U.charCodeAt(0) - 65) * lngSize;
  lat += (U.charCodeAt(1) - 65) * latSize;
  lngSize = 2;
  latSize = 1;
  lng += Number(U[2]) * lngSize;
  lat += Number(U[3]) * latSize;
  if (U.length >= 6) {
    lngSize = 5 / 60;
    latSize = 2.5 / 60;
    lng += (U.charCodeAt(4) - 65) * lngSize;
    lat += (U.charCodeAt(5) - 65) * latSize;
  }
  if (U.length >= 8) {
    lngSize = 5 / 600;
    latSize = 2.5 / 600;
    lng += Number(U[6]) * lngSize;
    lat += Number(U[7]) * latSize;
  }
  return valid(lat + latSize / 2, lng + lngSize / 2);
}

// ---- Plus Code (Open Location Code) — precisão de pares (~14 m) -----------
const OLC = "23456789CFGHJMPQRVWX";
export function decodePlusCode(raw: string): GeoPoint | null {
  const s = raw.trim().toUpperCase();
  // Exige o separador "+" (sempre presente num Plus Code) p/ não confundir com
  // ISBN/outros números que só usem dígitos do alfabeto OLC (2–9).
  if (!/^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/.test(s)) return null;
  const c = s.replace("+", "");
  let lat = -90;
  let lng = -180;
  let latUnit = 20;
  let lngUnit = 20;
  for (let d = 0; d < 5 && 2 * d + 1 < c.length; d++) {
    lat += OLC.indexOf(c[2 * d]) * latUnit;
    lng += OLC.indexOf(c[2 * d + 1]) * lngUnit;
    if (d < 4) {
      latUnit /= 20;
      lngUnit /= 20;
    }
  }
  return valid(lat + latUnit / 2, lng + lngUnit / 2);
}

// ---- UTM (inverso, WGS84): "22J 734643E 7012408N" ------------------------
export function parseUTM(raw: string): GeoPoint | null {
  const m = raw
    .trim()
    .match(/^(\d{1,2})\s*([C-HJ-NP-Xc-hj-np-x])\s+(\d{3,7})\s*E?\s+(\d{3,8})\s*N?$/);
  if (!m) return null;
  const zone = Number(m[1]);
  const band = m[2].toUpperCase();
  const easting = Number(m[3]);
  const northing = Number(m[4]);
  if (zone < 1 || zone > 60) return null;
  const isNorth = band >= "N";

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

  return valid((lat * 180) / Math.PI, (lng * 180) / Math.PI);
}

// ---- Quadkey (Bing tile) → centro do tile --------------------------------
export function decodeQuadkey(raw: string): GeoPoint | null {
  const q = raw.trim();
  // min. 12 (zoom 12) p/ evitar falsos positivos com NCM/CEP que só tenham 0–3.
  if (!/^[0-3]{12,23}$/.test(q)) return null;
  const zoom = q.length;
  let tileX = 0;
  let tileY = 0;
  for (const ch of q) {
    tileX <<= 1;
    tileY <<= 1;
    const d = Number(ch);
    if (d & 1) tileX |= 1;
    if (d & 2) tileY |= 1;
  }
  const n = 2 ** zoom;
  const lng = ((tileX + 0.5) / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (tileY + 0.5)) / n)));
  return valid((latRad * 180) / Math.PI, lng);
}

// ---- H3 (índice hexagonal da Uber) — "8928308280fffff" -------------------
export function parseH3(raw: string): GeoPoint | null {
  const h = raw.trim().toLowerCase();
  // índice de célula H3: 15–16 dígitos hex. `isValidCell` faz a checagem real,
  // a regex só é um pré-filtro barato (evita rodar a lib em strings quaisquer).
  if (!/^[0-9a-f]{15,16}$/.test(h) || !isValidCell(h)) return null;
  try {
    const [lat, lng] = cellToLatLng(h);
    return valid(lat, lng);
  } catch {
    return null;
  }
}

/**
 * Endereço what3words: 3 palavras separadas por ponto, com "///" opcional
 * (ex.: "filled.count.soap"). Resolução em coordenada é assíncrona (API).
 */
export function detectWhat3Words(raw: string): string | null {
  const m = raw.trim().match(/^(?:\/{3})?\s*(\p{L}{2,}\.\p{L}{2,}\.\p{L}{2,})$/u);
  return m ? m[1].toLowerCase() : null;
}

// ---- Detecção -------------------------------------------------------------
export function detectLocation(raw: string): DetectedLocation | null {
  const input = raw.trim();
  if (!input) return null;
  const attempts: [string, GeoPoint | null][] = [
    ["Graus decimais (DD)", parseDD(input)],
    ["DMS", parseDMS(input)],
    ["Graus e minutos (DDM)", parseDDM(input)],
    ["Plus Code", decodePlusCode(input)],
    ["UTM", parseUTM(input)],
    ["Maidenhead", decodeMaidenhead(input)],
    ["Quadkey", decodeQuadkey(input)],
    // H3 antes do Geohash: um índice H3 (hex) também passaria no teste base32.
    ["H3", parseH3(input)],
    ["Geohash", decodeGeohash(input)],
  ];
  for (const [format, pt] of attempts) if (pt) return { ...pt, format };
  return null;
}
