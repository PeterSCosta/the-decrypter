import { OpenLocationCode } from "open-location-code";
import type { GeoPoint } from "./formats";

/**
 * Fallback oficial de Plus Code (Open Location Code), usado quando o nosso decoder
 * offline simplificado não cobre o caso: códigos com refinamento de grade
 * (precisão sub-14 m) e a recuperação de código curto (`recoverNearest`). Roda
 * 100% no navegador — a lib é só algoritmo (MIT), sem chamada externa.
 */
const olc = new OpenLocationCode();

/** Plus Code COMPLETO → centro da célula (cobre refinamento de grade). */
export function decodePlusCodeLib(code: string): GeoPoint | null {
  try {
    const s = code.trim().toUpperCase();
    if (!olc.isValid(s) || !olc.isFull(s)) return null;
    const a = olc.decode(s);
    return { lat: a.latitudeCenter, lng: a.longitudeCenter };
  } catch {
    return null;
  }
}

export interface PlusRecovery extends GeoPoint {
  /** Código completo reconstruído pela lib (recoverNearest). */
  full: string;
}

/** Plus Code CURTO perto de uma referência → centro + código completo recuperado. */
export function recoverPlusCodeLib(
  short: string,
  refLat: number,
  refLng: number,
): PlusRecovery | null {
  try {
    const s = short.trim().toUpperCase();
    if (!olc.isShort(s)) return null;
    const full = olc.recoverNearest(s, refLat, refLng);
    const a = olc.decode(full);
    return { lat: a.latitudeCenter, lng: a.longitudeCenter, full };
  } catch {
    return null;
  }
}
