import type { GeoPoint } from "@/features/location/formats";
import { apiFetch } from "./api";

/** Geocodificação via backend (Nominatim/OSM) — usado como fallback p/ CEP. */
export async function geocode(query: string): Promise<GeoPoint | null> {
  // Devolve `null` em qualquer falha: o geocodificador é o último recurso da
  // escada de resolução, e quem chama já tem um caminho para "não achei".
  const d = await apiFetch<{ lat?: number; lng?: number }>(
    `/geocode?q=${encodeURIComponent(query)}`,
  ).catch(() => null);
  return d && typeof d.lat === "number" && typeof d.lng === "number"
    ? { lat: d.lat, lng: d.lng }
    : null;
}
