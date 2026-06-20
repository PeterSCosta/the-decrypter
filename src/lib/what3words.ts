import type { GeoPoint } from "@/features/location/formats";

const KEY = import.meta.env.VITE_W3W_API_KEY;

export interface W3WResult extends GeoPoint {
  words: string;
  nearestPlace: string;
  country: string;
}

export const hasW3WKey = () => Boolean(KEY);

/** Resolve um endereço de 3 palavras (ex.: "filled.count.soap") em coordenada. */
export async function w3wToCoordinates(words: string): Promise<W3WResult> {
  if (!KEY) throw new Error("Defina VITE_W3W_API_KEY no .env.local.");
  const url = `https://api.what3words.com/v3/convert-to-coordinates?words=${encodeURIComponent(
    words,
  )}&key=${KEY}`;
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as {
    coordinates?: { lat: number; lng: number };
    words?: string;
    nearestPlace?: string;
    country?: string;
    error?: { message?: string };
  };
  if (!res.ok || data.error || !data.coordinates) {
    throw new Error(data.error?.message || `Falha na consulta what3words (HTTP ${res.status}).`);
  }
  return {
    lat: data.coordinates.lat,
    lng: data.coordinates.lng,
    words: data.words ?? words,
    nearestPlace: data.nearestPlace ?? "",
    country: data.country ?? "",
  };
}
