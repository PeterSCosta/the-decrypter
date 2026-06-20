import { Card } from "@/components/ui/card";
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
    </Card>
  );
}
