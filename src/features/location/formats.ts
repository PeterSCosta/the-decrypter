/**
 * Parsers de formatos de coordenadas geográficas → { lat, lng } em graus
 * decimais (WGS84). Cobre os formatos mais comuns; `detectLocation` tenta todos
 * e devolve o primeiro que casar, com o nome do formato.
 */
import { getCellByCode, getCellByLocation } from "geohex";
import { cellToLatLng, isValidCell } from "h3-js";
import { ANCHORS, VALE_BBOX, inBBox, scopeLabel } from "./anchors";
import { cartaScaleLabel, decodeCartaIbge } from "./carta-ibge";
import { decodeGars, garsCellLabel } from "./gars";
import { decodeGeoref, decodeGeorefLocal } from "./georef";
import { decodeGeoTude } from "./geotude";
import { decodeGradeIbge, gradeCellLabel } from "./grade-ibge";
import { decodeMgrs, decodeMgrsLocal, mgrsPrecisionLabel } from "./mgrs";
import { decodePlusCodeLib, recoverPlusCodeLib } from "./plus-code";
import { utmToLatLng } from "./utm";

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

/** Decoder offline (sem dependência), precisão de pares (~14 m). */
export function decodePlusCodeOffline(raw: string): GeoPoint | null {
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

/**
 * Plus Code → coordenada. Offline primeiro (sem dependência); se ele recusar
 * (refinamento de grade, código mais longo), cai na lib oficial `open-location-code`.
 */
export function decodePlusCode(raw: string): GeoPoint | null {
  return decodePlusCodeOffline(raw) ?? decodePlusCodeLib(raw);
}

// ---- UTM (inverso, WGS84): "22J 734643E 7012408N" ------------------------
/**
 * A conta mora em `utm.ts` porque o MGRS é a mesma projeção com outra grafia e
 * precisa dela sem importar este módulo de volta (ciclo).
 */
export function parseUTM(raw: string): GeoPoint | null {
  const m = raw
    .trim()
    .match(/^(\d{1,2})\s*([C-HJ-NP-Xc-hj-np-x])\s+(\d{3,7})\s*E?\s+(\d{3,8})\s*N?$/);
  if (!m) return null;
  const band = m[2].toUpperCase();
  const pt = utmToLatLng(Number(m[1]), band >= "N", Number(m[3]), Number(m[4]));
  return pt ? valid(pt.lat, pt.lng) : null;
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

// ---- GeoHex (geohex.net, @sa2da) — "Nb11458750330" -----------------------

/** Decodifica um código GeoHex (2 letras + dígitos) validando por ida-e-volta. */
function decodeGeohexCode(code: string): GeoPoint | null {
  try {
    const cell = getCellByCode(code);
    if (!Number.isFinite(cell.lat) || !Number.isFinite(cell.lon)) return null;
    // o centro da célula tem que re-codificar exatamente no mesmo código (canônico)
    if (getCellByLocation(cell.lat, cell.lon, code.length - 2).code !== code) return null;
    return valid(cell.lat, cell.lon);
  } catch {
    return null;
  }
}

/** Código GeoHex completo: 2 letras + dígitos (ex.: "Nb11458750330"). */
export function parseGeoHex(raw: string): GeoPoint | null {
  const s = raw.trim();
  if (!/^[A-Za-z]{2}\d{2,}$/.test(s)) return null;
  return decodeGeohexCode(s);
}

/**
 * Atalho do Vale do Itajaí: os códigos GeoHex de Blumenau E Itajaí começam com
 * "Nb" (prefixo regional comum). Um número puro pode ser só a "cauda" — tenta
 * "Nb" + número e só aceita se cair dentro da caixa do Vale (qualquer das duas
 * cidades). Mantém o nome `parseGeoHexBlumenau` por compatibilidade.
 */
export function parseGeoHexBlumenau(raw: string): GeoPoint | null {
  const s = raw.trim();
  if (!/^\d{4,}$/.test(s)) return null;
  const pt = decodeGeohexCode(`Nb${s}`);
  if (!pt) return null;
  return inBBox(pt, VALE_BBOX) ? pt : null;
}

// ---- Atalhos de cauda local (Plus Code curto, Geohash) -------------------
export interface LocalGeoHit extends GeoPoint {
  /** Cidade-âncora assumida ("Blumenau" / "Itajaí"). */
  anchor: string;
  /** Código completo reconstruído com o prefixo local. */
  full: string;
}

/**
 * Plus Code CURTO (sem o "area code" de 4 chars, ex.: "3WJM+6H"): reconstrói
 * antepondo o prefixo de Blumenau ("585G") ou Itajaí ("585H") e aceita o que
 * cair dentro da cidade. É a recuperação por âncora que o OLC.recoverNearest faz.
 */
export function decodePlusCodeLocal(raw: string): LocalGeoHit | null {
  const s = raw.trim().toUpperCase();
  // 1) Caso comum (4 chars antes do "+"): atalho por âncora, offline.
  if (/^[23456789CFGHJMPQRVWX]{4}\+[23456789CFGHJMPQRVWX]{2,3}$/.test(s)) {
    for (const a of ANCHORS) {
      const full = a.plusPrefix + s;
      const pt = decodePlusCode(full);
      if (pt && inBBox(pt, a.bbox)) return { ...pt, anchor: a.name, full };
    }
  }
  // 2) Fallback: recoverNearest oficial perto de cada cidade (cobre outros curtos).
  for (const a of ANCHORS) {
    const r = recoverPlusCodeLib(s, a.lat, a.lng);
    if (r && inBBox(r, a.bbox)) return { lat: r.lat, lng: r.lng, anchor: a.name, full: r.full };
  }
  return null;
}

/**
 * Cauda de Geohash (ex.: "g7rpj"): antepõe o prefixo da cidade ("6gjn" Blumenau
 * / "6gjq" Itajaí) e aceita o que cair dentro dela. Auto-validante: só passa a
 * cauda que de fato cai na caixa da cidade.
 */
export function decodeGeohashLocal(raw: string): LocalGeoHit | null {
  const s = raw.trim().toLowerCase();
  // exige ≥1 letra (lookahead) p/ não colidir com entradas puramente numéricas
  // (CEP, NCM, códigos de rua, etc.), que são as colisões mais comuns.
  if (!/^(?=.*[bcdefghjkmnpqrstuvwxyz])[0-9bcdefghjkmnpqrstuvwxyz]{4,8}$/.test(s)) return null;
  for (const a of ANCHORS) {
    const full = a.geohashCity + s;
    const pt = decodeGeohash(full);
    if (pt && inBBox(pt, a.bbox)) return { ...pt, anchor: a.name, full };
  }
  return null;
}

/**
 * Mapcode (mapcode.com): a DETECÇÃO é síncrona e barata (só a forma), mas a
 * coordenada é assíncrona — um mapcode local não decodifica sem território e a
 * lib que resolve isso pesa mais que o bundle inteiro, então entra por
 * `import()` dinâmico. Mesmo arranjo do what3words: aqui só se reconhece,
 * `resolveMapcode` é que resolve.
 */
export { detectMapcode, resolveMapcode } from "./mapcode";
export type { DetectedMapcode, MapcodeResolution, MapcodeScope } from "./mapcode";

/**
 * Os geocódigos de grade militar/oficial moram em arquivo próprio (cada um tem
 * sua aritmética), mas saem por aqui: `formats.ts` continua sendo a porta única
 * de quem só quer "código → coordenada".
 */
export { decodeMgrs, decodeMgrsLocal, parseMgrs } from "./mgrs";
export { decodeGeoref, decodeGeorefLocal, parseGeoref } from "./georef";
export { decodeGars, parseGars } from "./gars";
export { decodeCartaIbge, parseCartaIbge } from "./carta-ibge";
export { albersToLatLng, decodeGradeIbge, latLngToAlbers, parseGradeIbge } from "./grade-ibge";
export { utmToLatLng } from "./utm";

/**
 * Endereço what3words: 3 palavras separadas por ponto, com "///" opcional
 * (ex.: "filled.count.soap"). Resolução em coordenada é assíncrona (API).
 */
export function detectWhat3Words(raw: string): string | null {
  const m = raw.trim().match(/^(?:\/{3})?\s*(\p{L}{2,}\.\p{L}{2,}\.\p{L}{2,})$/u);
  return m ? m[1].toLowerCase() : null;
}

// ---- Detecção -------------------------------------------------------------

/** Nomeia a folha/célula junto do formato: "MGRS/USNG · 1 m". */
const withDetail = (format: string, detail: string) => `${format} · ${detail}`;

/**
 * Formatos com identificador próprio (grade e carta), avaliados antes da lista
 * genérica porque o rótulo carrega a escala/tamanho da célula — o código nomeia
 * uma ÁREA, e esconder isso faria o card parecer mais preciso do que é.
 */
function detectNamedGrid(input: string): DetectedLocation | null {
  const grade = decodeGradeIbge(input);
  if (grade) {
    return {
      lat: grade.lat,
      lng: grade.lng,
      format: withDetail("Grade estatística IBGE", `célula de ${gradeCellLabel(grade.cell)}`),
    };
  }
  const carta = decodeCartaIbge(input);
  if (carta) {
    return {
      lat: carta.lat,
      lng: carta.lng,
      format: withDetail("Carta IBGE/DSG", cartaScaleLabel(carta.scale)),
    };
  }
  return null;
}

export function detectLocation(raw: string): DetectedLocation | null {
  const input = raw.trim();
  if (!input) return null;

  // Prefixo literal / hífens: não disputam entrada com nada da lista abaixo.
  const named = detectNamedGrid(input);
  if (named) return named;

  const mgrs = decodeMgrs(input);
  const gars = decodeGars(input);
  const georef = decodeGeoref(input);

  const attempts: [string, GeoPoint | null][] = [
    ["Graus decimais (DD)", parseDD(input)],
    ["DMS", parseDMS(input)],
    ["Graus e minutos (DDM)", parseDDM(input)],
    ["Plus Code", decodePlusCode(input)],
    ["UTM", parseUTM(input)],
    // MGRS é a UTM em letras: vem logo depois dela, e ANTES do Geohash — todo
    // MGRS é lexicalmente um Geohash válido (o gate de maiúsculas é o que
    // impede o inverso, já que Geohash se escreve minúsculo).
    [mgrs ? withDetail("MGRS/USNG", mgrsPrecisionLabel(mgrs.parts.digits)) : "MGRS/USNG", mgrs],
    ["Maidenhead", decodeMaidenhead(input)],
    // GEOREF (4 letras + dígitos) e GARS (3 dígitos + 2 letras) também casariam
    // como Geohash se chegassem depois dele.
    ["GEOREF", georef],
    [gars ? withDetail("GARS", `célula de ${garsCellLabel(gars.cell)}`) : "GARS", gars],
    ["Quadkey", decodeQuadkey(input)],
    // H3 e GeoHex antes do Geohash: ambos (hex / 2 letras + dígitos) também
    // passariam no teste base32 do Geohash.
    ["H3", parseH3(input)],
    ["GeoHex", parseGeoHex(input)],
  ];
  for (const [format, pt] of attempts) if (pt) return { ...pt, format };

  // ---- Atalhos de cauda local (o prefixo da cidade fica subentendido) -----
  // Vem ANTES do Geohash de propósito: uma cauda de MGRS como "FR9203021024"
  // é lexicalmente um Geohash válido, e o Geohash levaria. Inverter a ordem só
  // é seguro porque os três atalhos são auto-validantes — só passam se o ponto
  // cair na caixa do Vale — e porque exigem MAIÚSCULA (ou só dígitos), enquanto o
  // Geohash da região se escreve minúsculo e começa em "6gj".
  const local: [string, GeoPoint | null][] = [
    // Número puro como cauda de um código "Nb…" (Blumenau/Itajaí).
    ["GeoHex", parseGeoHexBlumenau(input)],
    // "FR9203021024" = MGRS sem o fuso "22J", comum às duas cidades: 100% dos
    // 5.268 CEPs com coordenada de Blumenau+Itajaí em `ceps.json` caem em 22J.
    ["MGRS/USNG", decodeMgrsLocal(input)],
    // "LD5604" = GEOREF sem a célula de 15° "JE" — idem, 100% dos 5.268.
    ["GEOREF", decodeGeorefLocal(input)],
  ];
  for (const [format, pt] of local) {
    if (pt) return { ...pt, format: `${format} (${scopeLabel(pt) ?? "Vale do Itajaí"})` };
  }

  // Os mais frouxos por último: o Geohash aceita quase todo alfanumérico curto,
  // e o GeoTude, todo decimal pontuado.
  const loose: [string, GeoPoint | null][] = [
    ["Geohash", decodeGeohash(input)],
    ["GeoTude", decodeGeoTude(input)],
  ];
  for (const [format, pt] of loose) if (pt) return { ...pt, format };
  return null;
}
