import { FleetLocationView } from "@/features/fleet/components/fleet-location-view";
import { fetchCep } from "@/lib/brasilapi";
import { geocode } from "@/lib/geocode";
import { w3wToCoordinates } from "@/lib/what3words";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import type { LocationData } from "../engine/decoders/location";

export function MapCard({ data }: { data: LocationData }) {
  const initial = data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng } : null;
  const [coords, setCoords] = useState(initial);
  const [detail, setDetail] = useState(data.detail);
  const [status, setStatus] = useState<"ok" | "loading" | "error">(initial ? "ok" : "loading");
  const [error, setError] = useState<string | null>(null);

  // Resolve coordenada quando não veio pronta: what3words (API) ou CEP fora da
  // base local (BrasilAPI p/ endereço + Nominatim p/ coordenada).
  useEffect(() => {
    if (coords || (!data.cep && !data.w3w)) return;
    let alive = true;
    (async () => {
      try {
        if (data.w3w) {
          const r = await w3wToCoordinates(data.w3w);
          if (!alive) return;
          setDetail(`${[r.nearestPlace, r.country].filter(Boolean).join(" · ")} (what3words)`);
          setCoords({ lat: r.lat, lng: r.lng });
          setStatus("ok");
          return;
        }
        const cep = await fetchCep(data.cep as string);
        const addr = [cep.logradouro, cep.bairro, cep.localidade, cep.uf]
          .filter(Boolean)
          .join(", ");
        if (alive) setDetail(addr || `${data.cep}`);
        if (cep.lat != null && cep.lng != null) {
          if (alive) {
            setCoords({ lat: cep.lat, lng: cep.lng });
            setStatus("ok");
          }
          return;
        }
        const pt = await geocode(
          [cep.logradouro, cep.localidade, cep.uf].filter(Boolean).join(", ") ||
            `${data.cep}, Brasil`,
        );
        if (!alive) return;
        if (pt) {
          setCoords(pt);
          setStatus("ok");
        } else setStatus("error");
      } catch (e) {
        if (alive) {
          setError((e as Error).message);
          setStatus("error");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [coords, data.cep, data.w3w]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-sm text-[var(--text-primary)]">{data.label}</div>
          {detail ? <div className="text-xs text-[var(--text-secondary)]">{detail}</div> : null}
          {coords ? (
            <div className="font-mono text-xs text-[var(--text-muted)]">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </div>
          ) : null}
        </div>
        {coords ? (
          <div className="flex items-center gap-3 text-xs">
            <a
              className="inline-flex items-center gap-1 text-[var(--brand-strong)] hover:underline"
              href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat}/${coords.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              OSM <ExternalLink className="h-3 w-3" />
            </a>
            <a
              className="inline-flex items-center gap-1 text-[var(--brand-strong)] hover:underline"
              href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Google <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}
      </div>

      {coords ? (
        <FleetLocationView point={coords} label={data.label} />
      ) : status === "loading" ? (
        <p className="text-xs text-[var(--text-muted)]">Resolvendo coordenada…</p>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          {error ?? "Sem coordenada para exibir no mapa."}
        </p>
      )}
    </div>
  );
}
