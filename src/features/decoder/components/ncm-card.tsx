import { type NcmInfo, fetchNcm } from "@/lib/brasilapi";
import { Loader2, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import type { NcmHint } from "../engine/decoders/ncm";

/** A descrição da BrasilAPI pode trazer HTML (ex.: "cm<sup>2</sup>"). */
function clean(desc: string): string {
  return desc
    .replace(/<sup>2<\/sup>/g, "²")
    .replace(/<sup>3<\/sup>/g, "³")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function NcmCard({ hint }: { hint: NcmHint }) {
  const [data, setData] = useState<NcmInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  // Consulta automática: confirma se é um NCM e mostra a descrição.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setData(null);
    fetchNcm(hint.code)
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setNotFound(true);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [hint.code]);

  if (loading) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin" /> Verificando NCM {hint.formatted}…
      </p>
    );
  }
  if (notFound || !data) {
    return (
      <p className="text-xs text-[var(--text-muted)]">{hint.formatted} não consta na tabela NCM.</p>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <Tag className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
      <div className="min-w-0">
        <div className="text-sm text-[var(--text-primary)]">{clean(data.descricao ?? "")}</div>
        <div className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">NCM {data.codigo}</div>
      </div>
    </div>
  );
}
