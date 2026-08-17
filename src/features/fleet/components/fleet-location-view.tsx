import { ShareLocationButton } from "@/features/location/components/share-location-button";
import { fetchFleet } from "@/lib/fleet";
import { Car, ExternalLink, MapPin, Phone } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import { formatAge, formatDistance, nearestDevice } from "../nearest";
import type { FleetDevice } from "../types";
/**
 * O mapa entra sob demanda porque ele arrasta o Leaflet + react-leaflet, e daqui
 * a dependência alcançava o **decodificador**: `MapCard` e `StreetCard` usam
 * esta view, então o Leaflet estava no chunk de entrada de toda sessão, mesmo de
 * quem só cola um Base64. Carregado assim, ele só chega quando existe um ponto
 * para desenhar — que é exatamente quando este componente renderiza.
 */
const LocationFleetMap = lazy(() =>
  import("./location-fleet-map").then((m) => ({ default: m.LocationFleetMap })),
);

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
      {/* Toolbar da seção: rótulo à esquerda ancora o botão (não flutua mais sozinho). */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          No mapa
        </div>
        <ShareLocationButton lat={point.lat} lng={point.lng} label={label} />
      </div>

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
            {near.device.phone ? (
              <a
                className="inline-flex items-center gap-1 text-[var(--brand-strong)] hover:underline"
                href={`tel:${near.device.phone}`}
              >
                <Phone className="h-3 w-3" />
                {near.device.phone}
              </a>
            ) : null}
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

      <Suspense
        fallback={
          <div className="h-[280px] w-full animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)]" />
        }
      >
        <LocationFleetMap
          point={point}
          pointLabel={label}
          devices={fleet}
          nearestId={near?.device.id}
        />
      </Suspense>
    </div>
  );
}
