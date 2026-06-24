import { Card } from "@/components/ui/card";
import { FleetLocationView } from "@/features/fleet/components/fleet-location-view";
import { geocode } from "@/lib/geocode";
import { Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { type StreetRow, nomeCompleto } from "../types";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="truncate font-mono text-sm text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

export function StreetCard({ row }: { row: StreetRow }) {
  const dims = row.ext || row.larg ? `${row.ext ?? "?"}m × ${row.larg ?? "?"}m` : "—";
  // Coordenada já vem do join local com a base de CEPs (centroide do logradouro);
  // só geocodifica via Nominatim sob demanda quando a rua não casou no join.
  const baked = row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null;
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(baked);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const showMap = async () => {
    if (point || state === "loading") return;
    setState("loading");
    const q = [nomeCompleto(row), row.bairro, "Blumenau", "SC"].filter(Boolean).join(", ");
    const pt = await geocode(q);
    if (pt) {
      setPoint(pt);
      setState("idle");
    } else {
      setState("error");
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-base text-[var(--text-primary)]">{nomeCompleto(row)}</h3>
        <span className="shrink-0 rounded-md bg-[var(--surface-sunken)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
          cód {row.codigo}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Field
          label="Bairro"
          value={row.bairroNum ? `${row.bairroNum} · ${row.bairro}` : row.bairro}
        />
        <Field label="Nº da Lei" value={row.numLei ? String(row.numLei) : "—"} />
        <Field label="Data da Lei" value={row.dataLei ?? "—"} />
        <Field label="Localização" value={row.localizacao || "—"} />
        <Field label="Ext × Larg" value={dims} />
        {row.atas ? <Field label="Atas / Decretos" value={row.atas} /> : null}
      </dl>

      <div className="mt-3">
        {point ? (
          <FleetLocationView point={point} label={nomeCompleto(row)} />
        ) : (
          <button
            type="button"
            onClick={showMap}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-strong)] hover:underline disabled:opacity-60"
            disabled={state === "loading"}
          >
            {state === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            {state === "loading"
              ? "Localizando…"
              : state === "error"
                ? "Não localizei — tentar de novo"
                : "Ver no mapa + frota mais próxima"}
          </button>
        )}
      </div>
    </Card>
  );
}
