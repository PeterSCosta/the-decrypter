import type { GeoPoint } from "@/features/location/formats";

/** Geocodificação via Nominatim (OpenStreetMap) — usado como fallback p/ CEP. */
export async function geocode(query: string): Promise<GeoPoint | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(
    query,
  )}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const arr = (await res.json()) as { lat: string; lon: string }[];
  if (!arr.length) return null;
  return { lat: Number(arr[0].lat), lng: Number(arr[0].lon) };
}
