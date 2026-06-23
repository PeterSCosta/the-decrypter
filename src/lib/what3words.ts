import type { GeoPoint } from "@/features/location/formats";
import { api } from "./api";

export interface W3WResult extends GeoPoint {
  words: string;
  nearestPlace: string;
  country: string;
}

/** A chave do what3words agora vive no backend; o front só chama /api/what3words. */
export const hasW3WKey = () => true;

/** Resolve um endereço de 3 palavras (ex.: "filled.count.soap") em coordenada. */
export async function w3wToCoordinates(words: string): Promise<W3WResult> {
  const res = await fetch(api(`/what3words/${encodeURIComponent(words)}`));
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "what3words indisponível (sem chave no servidor ou endereço inválido)."
        : `Falha na consulta what3words (HTTP ${res.status}).`,
    );
  }
  const d = (await res.json()) as {
    words?: string;
    lat: number;
    lng: number;
    nearestPlace?: string;
    country?: string;
  };
  return {
    lat: d.lat,
    lng: d.lng,
    words: d.words ?? words,
    nearestPlace: d.nearestPlace ?? "",
    country: d.country ?? "",
  };
}
