import { fetchFleet } from "@/lib/fleet";
import { useEffect, useState } from "react";
import type { FleetDevice } from "./types";

const POLL_MS = 15_000;

/** Carrega a frota e re-busca a cada 15s. */
export function useFleet() {
  const [devices, setDevices] = useState<FleetDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const d = await fetchFleet();
        if (!alive) return;
        setDevices(d);
        setError(null);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message);
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return { devices, error, loading };
}
