import { fetchFleet } from "@/lib/fleet";
import { Car, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { formatAge, formatDistance, nearestDevice } from "../nearest";
import type { FleetDevice } from "../types";
import { LocationFleetMap } from "./location-fleet-map";

/**
 * Dado um ponto resolvido, mostra o membro da frota mais próximo (com os dados do
 * Traccar) e o mapa com o ponto + a frota. Reusado pelo MapCard (coordenada/w3w/
 * GeoHex/CEP) e pelo StreetCard (rua geocodificada).
 */
export function FleetLocationView({
  point,
  label,
}: {
  point: { lat: number; lng: number };
  label: string;
}) {
  const [fleet, setFleet] = useState<FleetDevice[]>([]);

  useEffect(() => {
    let alive = true;
    fetchFleet()
      .then((f) => alive && setFleet(f))
      .catch(() => alive && setFleet([]));
    return () => {
      alive = false;
    };
  }, []);

  const near = nearestDevice(point, fleet);

  return (
    <div className="flex flex-col gap-2">
      {near ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 shrink-0 text-[var(--color-pulse-600)]" />
            <span className="text-[var(--text-secondary)]">Frota mais próxima:</span>
            <span className="font-display text-[var(--text-primary)]">{near.device.name}</span>
            <span className="ml-auto font-mono text-xs text-[var(--text-muted)]">
              {formatDistance(near.km)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-6 text-xs text-[var(--text-secondary)]">
            <span>
              {near.device.moving
                ? `${near.device.speedKmh ?? 0} km/h`
                : near.device.status === "online"
                  ? "parado · online"
                  : near.device.status}
            </span>
            {near.device.battery != null ? <span>bateria {near.device.battery}%</span> : null}
            <span>visto {formatAge(near.device.lastUpdate)}</span>
            {near.device.lat != null && near.device.lng != null ? (
              <a
                className="inline-flex items-center gap-1 text-[var(--brand-strong)] hover:underline"
                href={`https://www.openstreetmap.org/?mlat=${near.device.lat}&mlon=${near.device.lng}#map=16/${near.device.lat}/${near.device.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                posição <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <LocationFleetMap
        point={point}
        pointLabel={label}
        devices={fleet}
        nearestId={near?.device.id}
      />
    </div>
  );
}
