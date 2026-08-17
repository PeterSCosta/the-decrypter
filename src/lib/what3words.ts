import type { GeoPoint } from "@/features/location/formats";
import { ApiError, apiFetch } from "./api";

export interface W3WResult extends GeoPoint {
  words: string;
  nearestPlace: string;
  country: string;
}

/** A chave do what3words agora vive no backend; o front só chama /api/what3words. */
export const hasW3WKey = () => true;

/** Resolve um endereço de 3 palavras (ex.: "filled.count.soap") em coordenada. */
export async function w3wToCoordinates(words: string): Promise<W3WResult> {
  const d = await apiFetch<{
    words?: string;
    lat: number;
    lng: number;
    nearestPlace?: string;
    country?: string;
  }>(`/what3words/${encodeURIComponent(words)}`).catch((e) => {
    if (e instanceof ApiError && e.status === 404) {
      throw new Error("what3words indisponível (sem chave no servidor ou endereço inválido).");
    }
    throw e;
  });
  return {
    lat: d.lat,
    lng: d.lng,
    words: d.words ?? words,
    nearestPlace: d.nearestPlace ?? "",
    country: d.country ?? "",
  };
}
