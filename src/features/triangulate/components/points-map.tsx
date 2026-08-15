import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "@/features/location/formats";
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { PontoResolvido } from "../resolve";

interface Centro {
  nome: string;
  ponto: GeoPoint;
  cor: string;
}

interface Props {
  pontos: PontoResolvido[];
  centros: Centro[];
  /** Desenha a rota ligando os pontos na ordem. */
  rota: boolean;
  /** Fecha o circuito voltando ao primeiro. */
  fechar: boolean;
  /** Sombreia o triângulo (só com exatamente 3 pontos). */
  triangulo: boolean;
}

const posicoes = (pts: GeoPoint[]) => pts.map((p) => [p.lat, p.lng] as [number, number]);

function Enquadra({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!pts.length) return;
    if (pts.length === 1) map.setView(pts[0], 15);
    else map.fitBounds(pts, { padding: [48, 48], maxZoom: 16 });
  }, [map, pts]);
  return null;
}

/** Os pontos digitados (lime, numerados), a rota entre eles e os centros calculados. */
export function PointsMap({ pontos, centros, rota, fechar, triangulo }: Props) {
  const pts = posicoes(pontos);
  const todos = [...pts, ...posicoes(centros.map((c) => c.ponto))];
  if (!pts.length) return null;

  const linha = fechar && pts.length > 2 ? [...pts, pts[0]] : pts;

  return (
    <MapContainer
      center={pts[0]}
      zoom={14}
      scrollWheelZoom
      className="h-[420px] w-full rounded-[var(--radius-lg)] border border-[var(--border-subtle)]"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Enquadra pts={todos} />

      {triangulo && pts.length === 3 ? (
        <Polygon
          positions={pts}
          pathOptions={{ color: "#14161D", weight: 1, fillColor: "#C6F135", fillOpacity: 0.12 }}
        />
      ) : null}

      {rota && pts.length > 1 ? (
        <Polyline positions={linha} pathOptions={{ color: "#FF5436", weight: 3, opacity: 0.85 }} />
      ) : null}

      {pontos.map((p, i) => (
        <CircleMarker
          key={`${p.entrada}-${i}`}
          center={[p.lat, p.lng]}
          radius={10}
          pathOptions={{ color: "#14161D", weight: 2, fillColor: "#C6F135", fillOpacity: 0.95 }}
        >
          <Popup>
            <strong>
              {i + 1}. {p.rotulo}
            </strong>
            <br />
            {p.detalhe}
          </Popup>
        </CircleMarker>
      ))}

      {centros.map((c) => (
        <CircleMarker
          key={c.nome}
          center={[c.ponto.lat, c.ponto.lng]}
          radius={7}
          pathOptions={{ color: c.cor, weight: 3, fillColor: "#ffffff", fillOpacity: 1 }}
        >
          <Popup>{c.nome}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
