import { type RegistroBrInfo, fetchRegistroBr } from "@/lib/brasilapi";
import { Globe, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { RegistroBrHint } from "../engine/decoders/registrobr";

const STATUS_LABEL: Record<string, string> = {
  REGISTERED: "Registrado",
  AVAILABLE: "Disponível",
  EXPIRED: "Expirado",
};

export function RegistroBrCard({ hint }: { hint: RegistroBrHint }) {
  const [data, setData] = useState<RegistroBrInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    fetchRegistroBr(hint.domain)
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError((e as Error).message);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [hint.domain]);

  const expires = data?.["expires-at"]?.slice(0, 10);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="font-mono text-base text-[var(--text-primary)]">{hint.domain}</span>
      </div>

      {loading ? (
        <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" /> Consultando Registro.br…
        </p>
      ) : data ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
          <div className="font-display text-sm text-[var(--text-primary)]">
            {STATUS_LABEL[data.status] ?? data.status}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            {[expires ? `expira em ${expires}` : null, data["publication-status"]]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">{error ?? "Domínio não encontrado."}</p>
      )}
    </div>
  );
}
