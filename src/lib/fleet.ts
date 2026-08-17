import type { FleetDevice } from "@/features/fleet/types";
import { apiFetch } from "./api";

/** Frota em tempo real (Traccar) via backend. Lista vazia = Traccar não configurado. */
export async function fetchFleet(): Promise<FleetDevice[]> {
  return apiFetch<FleetDevice[]>("/fleet");
}
