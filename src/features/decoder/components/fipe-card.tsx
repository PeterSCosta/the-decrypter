import { CopyButton } from "@/components/ui/copy-button";
import { type VeiculoFipe, consultarFipe } from "@/lib/fipe";
import { Car, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FipeHint } from "../engine/decoders/fipe";

/**
 * Consulta o código na FIPE e mostra o veículo.
 *
 * São até quatro chamadas em sequência (tabela vigente + varredura dos três
 * tipos), então isto NUNCA roda no fan-out: só quando o card aparece, e o card
 * só aparece quando a forma `######-#` bate.
 */
export function FipeCard({ hint }: { hint: FipeHint }) {
  const [v, setV] = useState<VeiculoFipe | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "nao-existe">("carregando");

  useEffect(() => {
    let vivo = true;
    setEstado("carregando");
    setV(null);
    consultarFipe(hint.codigo)
      .then((r) => {
        if (!vivo) return;
        setV(r);
        setEstado(r ? "ok" : "nao-existe");
      })
      .catch(() => vivo && setEstado("nao-existe"));
    return () => {
      vivo = false;
    };
  }, [hint.codigo]);

  if (estado === "carregando") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin" /> Consultando {hint.codigo} na FIPE…
      </p>
    );
  }
  if (estado === "nao-existe" || !v) {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        {hint.codigo} não respondeu na FIPE — ou o código não existe, ou a consulta deles mudou. É
        API interna, sem contrato.
      </p>
    );
  }

  const tipo = { 1: "carro", 2: "moto", 3: "caminhão" }[v.tipo] ?? "veículo";
  return (
    <div className="flex items-start gap-2.5">
      <Car className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--text-primary)]">
          {v.marca} · {v.modelo}
        </p>
        <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
          {v.anoModelo} {v.combustivel} · {tipo} · {v.valor} ({v.mesReferencia})
          <CopyButton value={`${v.marca} ${v.modelo} ${v.anoModelo}`} />
        </p>
        {v.outrosAnos.length ? (
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            o mesmo código também tem: {v.outrosAnos.join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
