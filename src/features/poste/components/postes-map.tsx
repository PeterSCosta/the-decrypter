import "leaflet/dist/leaflet.css";
import { BLUMENAU } from "@/features/location/anchors";
import { ShareLocationButton } from "@/features/location/components/share-location-button";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { type Caixa, type RespostaCaixa, postesNaCaixa } from "../api";
import { type Poste, enderecoDoPoste } from "../types";

/** Escuta o viewport e avisa quando ele para de se mexer. */
function Viewport({ aoMover }: { aoMover: (c: Caixa) => void }) {
  const mapa = useMapEvents({
    moveend: () => {
      const b = mapa.getBounds();
      aoMover({
        sul: b.getSouth(),
        norte: b.getNorth(),
        oeste: b.getWest(),
        leste: b.getEast(),
      });
    },
  });
  // Primeira carga: o `moveend` só dispara depois de a pessoa mexer.
  useEffect(() => {
    const b = mapa.getBounds();
    aoMover({ sul: b.getSouth(), norte: b.getNorth(), oeste: b.getWest(), leste: b.getEast() });
  }, [mapa, aoMover]);
  return null;
}

/**
 * Mapa dos postes, carregado por viewport.
 *
 * `preferCanvas` não é detalhe: são até 2.000 marcadores por tela, e em SVG
 * (o padrão do Leaflet) isso é um nó de DOM cada — a aba engasga ao arrastar.
 */
export function PostesMap({
  selecionado,
  aoSelecionar,
}: {
  selecionado: Poste | null;
  aoSelecionar: (p: Poste) => void;
}) {
  const [resposta, setResposta] = useState<RespostaCaixa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  /** Ignora respostas de caixas que já não são a atual. */
  const pedido = useRef(0);

  const carregar = useCallback(async (c: Caixa) => {
    const meu = ++pedido.current;
    try {
      const r = await postesNaCaixa(c);
      if (meu === pedido.current) {
        setResposta(r);
        setErro(null);
      }
    } catch (e) {
      if (meu === pedido.current) setErro((e as Error).message);
    }
  }, []);

  const centro: [number, number] = selecionado
    ? [selecionado.lat, selecionado.lng]
    : [BLUMENAU.lat, BLUMENAU.lng];

  return (
    <div className="relative">
      <MapContainer
        center={centro}
        zoom={selecionado ? 17 : 13}
        scrollWheelZoom
        preferCanvas
        className="h-[460px] w-full rounded-[var(--radius-lg)] border border-[var(--border-subtle)]"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Viewport aoMover={carregar} />

        {resposta?.hits.map((p) => {
          const ativo = selecionado?.id === p.id;
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={ativo ? 9 : 4}
              pathOptions={{
                color: ativo ? "#14161D" : "#7BA60B",
                weight: ativo ? 2 : 1,
                fillColor: ativo ? "#C6F135" : "#C6F135",
                fillOpacity: ativo ? 1 : 0.7,
              }}
              eventHandlers={{ click: () => aoSelecionar(p) }}
            >
              {/*
                O popup responde de imediato "que poste é este e onde ele
                fica" — inclusive o botão de compartilhar, que no celular abre
                o WhatsApp pelo Web Share. Quem está numa gincana precisa
                mandar a localização sem passar por mais uma tela.
              */}
              <Popup>
                <div className="flex min-w-[13rem] flex-col gap-1.5">
                  <div className="flex items-baseline gap-2">
                    <strong className="font-mono text-sm">{p.plaqueta ?? `#${p.id}`}</strong>
                    {p.bairro ? <span className="text-xs opacity-70">{p.bairro}</span> : null}
                  </div>
                  <div className="text-xs">{enderecoDoPoste(p)}</div>
                  {p.estrutura ? <div className="text-xs opacity-70">{p.estrutura}</div> : null}
                  <div className="font-mono text-xs opacity-70">
                    {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <ShareLocationButton
                      lat={p.lat}
                      lng={p.lng}
                      label={`Poste ${p.plaqueta ?? p.id}`}
                    />
                    <a
                      href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--brand-strong)] hover:underline"
                    >
                      Abrir no Maps
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-[var(--radius-md)] bg-[var(--surface-card)]/95 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] shadow">
        {erro ? (
          <span className="text-[var(--color-pulse-600)]">{erro}</span>
        ) : resposta === null ? (
          "Carregando postes…"
        ) : resposta.truncado ? (
          <span>
            {resposta.total.toLocaleString("pt-BR")} de muitos —{" "}
            <strong>aproxime para ver todos</strong>
          </span>
        ) : (
          `${resposta.total.toLocaleString("pt-BR")} poste(s) nesta área`
        )}
      </div>
    </div>
  );
}
