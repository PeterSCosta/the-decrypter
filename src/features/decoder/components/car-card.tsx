import { CopyButton } from "@/components/ui/copy-button";
import { Trees } from "lucide-react";
import type { CarHint } from "../engine/decoders/car";

/**
 * O que o CAR entrega — e o que ele NÃO entrega.
 *
 * O município sai do próprio código, offline. A coordenada não sai: o polígono
 * do imóvel vive no SICAR, cuja consulta pública passa por captcha. Dizer isso
 * na tela é o que evita a equipe procurar meia hora por um ponto que a bancada
 * nunca teve.
 */
export function CarCard({ hint }: { hint: CarHint }) {
  return (
    <div className="flex items-start gap-2.5">
      <Trees className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--text-primary)]">
          Imóvel rural em{" "}
          <strong>
            {hint.municipio ?? `município ${hint.ibge}`}/{hint.uf}
          </strong>
        </p>
        <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
          IBGE {hint.ibge} · dígito verificador confere
          <CopyButton value={hint.ibge} />
        </p>
        <p className="mt-1 break-all font-mono text-[0.625rem] text-[var(--text-muted)]">
          {hint.imovel}
        </p>
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          O município sai do próprio código, sem consulta. Já o polígono do imóvel só existe no
          SICAR, atrás de captcha — a bancada não tem o ponto, e não vai fingir que tem.
        </p>
      </div>
    </div>
  );
}
