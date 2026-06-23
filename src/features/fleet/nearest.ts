import type { FleetDevice } from "./types";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Distância em km entre dois pontos (Haversine). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface NearestResult {
  device: FleetDevice;
  km: number;
}

/** Membro da frota (com posição) mais próximo do ponto. null se ninguém tem posição. */
export function nearestDevice(point: GeoPoint, devices: FleetDevice[]): NearestResult | null {
  let best: NearestResult | null = null;
  for (const d of devices) {
    if (d.lat == null || d.lng == null) continue;
    const km = haversineKm(point, { lat: d.lat, lng: d.lng });
    if (!best || km < best.km) best = { device: d, km };
  }
  return best;
}

/** "850 m" / "1,2 km" / "13 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
}
