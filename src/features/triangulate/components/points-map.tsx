import "leaflet/dist/leaflet.css";
import { ShareLocationButton } from "@/features/location/components/share-location-button";
import type { GeoPoint } from "@/features/location/formats";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
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
  /** Arrastou um marcador: escreve a coordenada de volta na caixa de texto. */
  aoMover: (indice: number, lat: number, lng: number) => void;
  /** Clicou no mapa vazio: novo ponto. */
  aoAdicionar: (lat: number, lng: number) => void;
}

const posicoes = (pts: GeoPoint[]) => pts.map((p) => [p.lat, p.lng] as [number, number]);

/**
 * Ícone próprio em vez do padrão do Leaflet.
 *
 * Não é preciosismo: o ícone padrão vem de URLs relativas que o bundler não
 * reescreve, e num app empacotado ele simplesmente **404** — o marcador some.
 * Como este repo nunca usara `Marker` (só `CircleMarker`, que é um `Path` e não
 * arrasta), o problema apareceria só agora. O `divIcon` ainda deixa o número
 * dentro do pino, que é a informação que liga o mapa à lista.
 */
const pino = (n: number) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:#C6F135;border:2px solid #14161D;
      display:flex;align-items:center;justify-content:center;
      font:600 12px/1 ui-monospace,monospace;color:#14161D;
      box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:grab;
    ">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

function Enquadra({ chave, pts }: { chave: string; pts: [number, number][] }) {
  const map = useMap();
  // Depende da CHAVE (quais pontos existem), NÃO das coordenadas. Antes o efeito
  // rodava a cada render, porque `pts` era um array novo toda vez — inofensivo
  // enquanto o mapa era só leitura, mas com marcador arrastável ele
  // reenquadraria a cada movimento e brigaria com quem está arrastando. Incluir
  // `pts` nas dependências, como o Biome pede, é exatamente o bug.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reenquadrar só quando o conjunto muda
  useEffect(() => {
    if (!pts.length) return;
    if (pts.length === 1) map.setView(pts[0], 15);
    else map.fitBounds(pts, { padding: [48, 48], maxZoom: 16 });
  }, [map, chave]);
  return null;
}

function CliqueNoMapa({ aoAdicionar }: { aoAdicionar: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => aoAdicionar(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

/** Os pontos digitados (lime, numerados e arrastáveis), a rota e os centros. */
export function PointsMap({
  pontos,
  centros,
  rota,
  fechar,
  triangulo,
  aoMover,
  aoAdicionar,
}: Props) {
  const pts = posicoes(pontos);
  const todos = [...pts, ...posicoes(centros.map((c) => c.ponto))];
  /** Enquadra quando o CONJUNTO muda, não quando uma coordenada muda. */
  const chave = pontos.map((p) => p.indice).join("|");
  /** `useRef` para o arraste não depender de identidade de função. */
  const mover = useRef(aoMover);
  mover.current = aoMover;

  // Só o número entra no ícone, então recriá-los quando uma coordenada muda é
  // trabalho jogado fora — e, pior, trocar a instância do ícone no meio de um
  // arraste faz o Leaflet recriar o elemento e soltar o ponteiro.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o ícone só depende da quantidade
  const icones = useMemo(() => pontos.map((_, i) => pino(i + 1)), [pontos.length]);

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
      <Enquadra chave={chave} pts={todos} />
      <CliqueNoMapa aoAdicionar={aoAdicionar} />

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
        <Marker
          key={p.indice}
          position={[p.lat, p.lng]}
          icon={icones[i]}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              mover.current(p.indice, lat, lng);
            },
          }}
        >
          <Popup>
            <div className="flex flex-col gap-1.5">
              <strong>
                {i + 1}. {p.rotulo}
              </strong>
              <span className="text-xs opacity-70">{p.detalhe}</span>
              <span className="font-mono text-xs">
                {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
              </span>
              <ShareLocationButton lat={p.lat} lng={p.lng} label={p.rotulo} />
            </div>
          </Popup>
        </Marker>
      ))}

      {centros.map((c) => (
        <CircleMarker
          key={c.nome}
          center={[c.ponto.lat, c.ponto.lng]}
          radius={7}
          pathOptions={{ color: c.cor, weight: 3, fillColor: "#ffffff", fillOpacity: 1 }}
        >
          <Popup>
            <div className="flex flex-col gap-1.5">
              <strong>{c.nome}</strong>
              <span className="font-mono text-xs">
                {c.ponto.lat.toFixed(6)}, {c.ponto.lng.toFixed(6)}
              </span>
              <ShareLocationButton lat={c.ponto.lat} lng={c.ponto.lng} label={c.nome} />
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
