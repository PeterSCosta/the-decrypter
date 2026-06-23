import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { FleetDevice } from "../types";

interface Props {
  point: { lat: number; lng: number };
  pointLabel: string;
  devices: FleetDevice[];
  nearestId?: number;
}

type Located = FleetDevice & { lat: number; lng: number };

function Fit({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (pts.length === 1) map.setView(pts[0], 14);
    else map.fitBounds(pts, { padding: [50, 50], maxZoom: 16 });
  }, [map, pts]);
  return null;
}

/** Mapa do ponto decodificado (lime) + frota; o membro mais próximo fica vermelho
 *  e ligado por uma linha tracejada. */
export function LocationFleetMap({ point, pointLabel, devices, nearestId }: Props) {
  const located = devices.filter((d): d is Located => d.lat != null && d.lng != null);
  const nearest = located.find((d) => d.id === nearestId);
  const pts: [number, number][] = [[point.lat, point.lng]];
  if (nearest) pts.push([nearest.lat, nearest.lng]);

  return (
    <MapContainer
      center={[point.lat, point.lng]}
      zoom={14}
      scrollWheelZoom
      className="h-80 w-full rounded-[var(--radius-lg)] border border-[var(--border-subtle)]"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Fit pts={pts} />

      {nearest ? (
        <Polyline
          positions={[
            [point.lat, point.lng],
            [nearest.lat, nearest.lng],
          ]}
          pathOptions={{ color: "#FF5436", weight: 2, dashArray: "6 6" }}
        />
      ) : null}

      {/* ponto decodificado */}
      <CircleMarker
        center={[point.lat, point.lng]}
        radius={9}
        pathOptions={{ color: "#14161D", weight: 2, fillColor: "#C6F135", fillOpacity: 0.95 }}
      >
        <Popup>{pointLabel}</Popup>
      </CircleMarker>

      {/* frota */}
      {located.map((d) => {
        const isNear = d.id === nearestId;
        return (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lng]}
            radius={isNear ? 9 : 6}
            pathOptions={{
              color: "#14161D",
              weight: isNear ? 2 : 1,
              fillColor: isNear ? "#FF5436" : "#9ca3af",
              fillOpacity: isNear ? 0.95 : 0.7,
            }}
          >
            <Popup>
              {d.name}
              {isNear ? " (mais próximo)" : ""}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
