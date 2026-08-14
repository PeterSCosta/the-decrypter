/**
 * GEOREF (World Geographic Reference System) — o geocódigo aeronáutico/militar
 * da OTAN, usado em plano de voo e em coordenação de busca e salvamento.
 *
 * `JELD5604` = célula de 15° "JE", célula de 1° "LD", 56 minutos de longitude e
 * 04 de latitude. A pegadinha é a ORDEM: longitude ANTES de latitude, nas letras
 * E nos dígitos. Inverter põe o ponto na China.
 *
 * Convenção: devolve o CENTRO da célula (como Maidenhead e Plus Code) — é o que
 * a pygeodesy também faz: Georef('JELD5604').latlon = (-26.925, -49.058333),
 * conferido dígito a dígito contra a conta manual pela especificação.
 */
import { type BBox, VALE_BBOX, inBBox } from "./anchors";
import type { GeoPoint } from "./formats";

/** Alfabeto de 24 letras do GEOREF: pula I e O. */
const G24 = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Gate. Maiúsculas obrigatórias e dígitos OBRIGATÓRIOS: só as 4 letras (célula
 * de 1°, ~111 km) casaria com palavra de 4 letras — "REDE" é um GEOREF válido —
 * e ainda não diria nada de útil. Com os dígitos, o formato fica inconfundível.
 */
const GEOREF_RE = /^([A-HJ-NP-Z]{4})(\d{4}|\d{6}|\d{8})$/;

/** Minutos a partir dos dígitos de um eixo: 2 inteiros + o resto em decimais. */
function minutes(part: string): number | null {
  const whole = Number(part.slice(0, 2));
  if (whole > 59) return null;
  const rest = part.slice(2);
  return whole + (rest ? Number(rest) / 10 ** rest.length : 0);
}

/** Tamanho da célula em minutos: 1' com 2 dígitos, 0,1' com 3, 0,01' com 4. */
const cellMinutes = (perAxis: number): number => 10 ** -(perAxis - 2);

export interface GeorefHit extends GeoPoint {
  /** Dígitos por eixo (2 = 1 minuto, 3 = 0,1', 4 = 0,01'). */
  perAxis: number;
}

/** GEOREF → centro da célula. `null` quando não é um código. */
export function decodeGeoref(raw: string): GeorefHit | null {
  const s = raw.trim().replace(/\s+/g, "");
  const m = s.match(GEOREF_RE);
  if (!m) return null;

  const [c0, c1, c2, c3] = [...m[1]].map((c) => G24.indexOf(c));
  // 24 células de 15° na longitude, 12 na latitude; dentro delas, 15 graus.
  if (c1 > 11 || c2 > 14 || c3 > 14) return null;

  const digits = m[2];
  const perAxis = digits.length / 2;
  const lonMin = minutes(digits.slice(0, perAxis));
  const latMin = minutes(digits.slice(perAxis));
  if (lonMin === null || latMin === null) return null;

  const half = cellMinutes(perAxis) / 2;
  const lng = -180 + c0 * 15 + c2 + (lonMin + half) / 60;
  const lat = -90 + c1 * 15 + c3 + (latMin + half) / 60;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng, perAxis };
}

export const parseGeoref = (raw: string): GeoPoint | null => {
  const hit = decodeGeoref(raw);
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
};

/**
 * Atalho de cauda do Vale: as duas cidades estão inteiras na célula de 15° "JE"
 * (medido: 5.268/5.268 dos CEPs com coordenada de Blumenau e Itajaí), então
 * "LD5604" se completa sozinho. Auto-validante: só passa o que cai na caixa.
 */
export function decodeGeorefLocal(raw: string, bbox: BBox = VALE_BBOX): GeoPoint | null {
  const s = raw.trim().replace(/\s+/g, "");
  if (!/^[A-HJ-NP-Z]{2}(\d{4}|\d{6}|\d{8})$/.test(s)) return null;
  const pt = parseGeoref(`JE${s}`);
  return pt && inBBox(pt, bbox) ? pt : null;
}
