import type { FleetDevice } from "@/features/fleet/types";
import { api } from "./api";

/** Frota em tempo real (Traccar) via backend. Lista vazia = Traccar não configurado. */
export async function fetchFleet(): Promise<FleetDevice[]> {
  const res = await fetch(api("/fleet"));
  if (!res.ok) throw new Error(`Falha ao carregar a frota (HTTP ${res.status}).`);
  return (await res.json()) as FleetDevice[];
}
