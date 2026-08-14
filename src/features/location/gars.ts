/**
 * GARS (Global Area Reference System) — a grade de 30' da NGA, a linguagem
 * comum de "área" entre forças aéreas e terrestres.
 *
 * `262FG49` = faixa de 30' de longitude nº 262 (contada de 180°W), faixa de 30'
 * de latitude "FG" (contada de 90°S), quadrante de 15' nº 4 e tecla de 5' nº 9.
 * Os dois últimos são opcionais: `262FG` sozinho é a célula de 30' (~55 km).
 *
 * Duas convenções de numeração, ambas conferidas contra a pygeodesy:
 *  - quadrante 1=NO, 2=NE, 3=SO, 4=SE;
 *  - tecla 1..9 como um teclado numérico INVERTIDO — o 1 é o canto NOROESTE.
 * Devolve o CENTRO da célula.
 */
import type { GeoPoint } from "./formats";

/** Mesmo alfabeto de 24 letras do GEOREF: pula I e O. */
const G24 = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Gate. Maiúsculas obrigatórias (o Geohash, que é lexicalmente compatível, se
 * escreve em minúsculas) e a tecla nunca é 0 — checagem barata de graça.
 */
const GARS_RE = /^(\d{3})([A-HJ-NP-Z]{2})(?:([1-4])([1-9])?)?$/;

export interface GarsHit extends GeoPoint {
  /** Lado da célula em graus (0,5 / 0,25 / 1/12). */
  cell: number;
}

/** GARS → centro da célula. `null` quando não é um código. */
export function decodeGars(raw: string): GarsHit | null {
  const s = raw.trim().replace(/\s+/g, "");
  const m = s.match(GARS_RE);
  if (!m) return null;
  // Tecla sem quadrante não existe: a regex aninha os dois grupos justamente
  // para que "262FG9" não seja lido como tecla 9 solta.
  const lonBand = Number(m[1]);
  if (lonBand < 1 || lonBand > 720) return null;
  const a = G24.indexOf(m[2][0]);
  const b = G24.indexOf(m[2][1]);
  const latBand = a * 24 + b;
  if (latBand > 359) return null;

  // Canto noroeste da célula de 30': oeste na longitude, NORTE na latitude
  // (a numeração de quadrante e de tecla desce a partir do norte).
  let west = -180 + (lonBand - 1) * 0.5;
  let north = -90 + (latBand + 1) * 0.5;
  let cell = 0.5;

  if (m[3]) {
    const q = Number(m[3]);
    cell = 0.25;
    if (q === 2 || q === 4) west += 0.25; // leste
    if (q === 3 || q === 4) north -= 0.25; // sul
  }
  if (m[4]) {
    const k = Number(m[4]) - 1;
    const step = cell / 3;
    west += (k % 3) * step;
    north -= Math.floor(k / 3) * step;
    cell = step;
  }

  const lng = west + cell / 2;
  const lat = north - cell / 2;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng, cell };
}

export const parseGars = (raw: string): GeoPoint | null => {
  const hit = decodeGars(raw);
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
};

/** "30'" / "15'" / "5'" — o lado da célula em minutos, para o rótulo do card. */
export const garsCellLabel = (cell: number): string => `${Math.round(cell * 60)}'`;
