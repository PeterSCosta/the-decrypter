import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { MapPin } from "lucide-react";
import { type CepHit, formatCep } from "../types";

export function CepCard({ hit }: { hit: CepHit }) {
  const maps =
    hit.lat !== null && hit.lng !== null
      ? `https://www.google.com/maps?q=${hit.lat},${hit.lng}`
      : null;
  return (
    <Card className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-base font-medium tabular-nums text-[var(--text-primary)]">
            {formatCep(hit.cep)}
          </span>
          <CopyButton value={hit.cep} />
        </div>
        <div className="truncate text-sm text-[var(--text-primary)]">{hit.logradouro || "—"}</div>
        <div className="truncate text-xs text-[var(--text-secondary)]">
          {hit.localidade ? `${hit.localidade} · ` : ""}
          {hit.municipio} — SC
        </div>
      </div>
      {maps ? (
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          title="Abrir no mapa"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--brand-strong)]"
        >
          <MapPin className="h-4 w-4" />
        </a>
      ) : null}
    </Card>
  );
}
