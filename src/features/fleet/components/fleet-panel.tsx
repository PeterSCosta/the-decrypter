import "leaflet/dist/leaflet.css";
import { BatteryFull, Loader2, MapPin, Navigation } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { FleetDevice } from "../types";
import { useFleet } from "../use-fleet";

const BLUMENAU: [number, number] = [-26.9194, -49.0661];

/** Cor do marcador: vermelho = em movimento, lime = online parado, cinza = offline. */
function color(d: FleetDevice): string {
  if (d.moving) return "#FF5436";
  if (d.status === "online") return "#7BA60B";
  return "#9ca3af";
}

function ago(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `há ${s}s`;
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} d`;
}

/** Enquadra todos os pontos uma vez (não re-enquadra a cada atualização). */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || points.length === 0) return;
    done.current = true;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(points, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

type Located = FleetDevice & { lat: number; lng: number };

export function FleetPanel() {
  const { devices, error, loading } = useFleet();

  const located = useMemo(
    () => (devices ?? []).filter((d): d is Located => d.lat != null && d.lng != null),
    [devices],
  );
  const points = useMemo(() => located.map((d) => [d.lat, d.lng] as [number, number]), [located]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando frota…
      </p>
    );
  }
  if (error) {
    return <p className="text-sm text-[var(--color-pulse-600)]">{error}</p>;
  }
  if (!devices || devices.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-6 text-sm text-[var(--text-secondary)]">
        <p className="font-display text-[var(--text-primary)]">Nenhum dispositivo na frota.</p>
        <p className="mt-2">
          Configure o Traccar no backend (<code>TRACCAR_BASE_URL</code> + <code>TRACCAR_TOKEN</code>
          ) e instale o app <strong>Traccar Client</strong> nos celulares da equipe.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {points.length > 0 ? (
        <MapContainer
          center={points[0] ?? BLUMENAU}
          zoom={13}
          scrollWheelZoom
          className="h-[420px] w-full rounded-[var(--radius-lg)] border border-[var(--border-subtle)]"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          {located.map((d) => (
            <CircleMarker
              key={d.id}
              center={[d.lat, d.lng]}
              radius={9}
              pathOptions={{ color: "#14161D", weight: 2, fillColor: color(d), fillOpacity: 0.9 }}
            >
              <Popup>
                <div className="text-sm leading-snug">
                  <div className="font-semibold">{d.name}</div>
                  <div>{d.moving ? `${d.speedKmh ?? 0} km/h` : "parado"}</div>
                  {d.battery != null ? <div>bateria {d.battery}%</div> : null}
                  <div>visto {ago(d.lastUpdate)}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      ) : null}

      <ul className="flex flex-col gap-2">
        {devices.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color(d) }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm text-[var(--text-primary)]">
                {d.name}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  {d.moving ? `${d.speedKmh ?? 0} km/h` : "parado"}
                </span>
                {d.battery != null ? (
                  <span className="inline-flex items-center gap-1">
                    <BatteryFull className="h-3 w-3" />
                    {d.battery}%
                  </span>
                ) : null}
                <span>visto {ago(d.lastUpdate)}</span>
              </div>
            </div>
            {d.lat != null && d.lng != null ? (
              <a
                className="inline-flex items-center gap-1 text-xs text-[var(--brand-strong)] hover:underline"
                href={`https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=16/${d.lat}/${d.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin className="h-3 w-3" /> mapa
              </a>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">sem posição</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
