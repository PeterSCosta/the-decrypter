import type { GeoPoint } from "@/features/location/formats";
import { api } from "./api";

/** Geocodificação via backend (Nominatim/OSM) — usado como fallback p/ CEP. */
export async function geocode(query: string): Promise<GeoPoint | null> {
  const res = await fetch(api(`/geocode?q=${encodeURIComponent(query)}`));
  if (!res.ok) return null;
  const d = (await res.json().catch(() => null)) as { lat?: number; lng?: number } | null;
  return d && typeof d.lat === "number" && typeof d.lng === "number"
    ? { lat: d.lat, lng: d.lng }
    : null;
}
