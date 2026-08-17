import { CopyButton } from "@/components/ui/copy-button";
import { comPonto, detalhesDoCid } from "@/features/decoder/engine/decoders/cid";
import type { Cid } from "@/lib/lookup-cache";
import { Stethoscope } from "lucide-react";

/**
 * Ficha de um código da CID-10 — ou a lista curta, quando a busca foi por nome.
 *
 * O que a tela precisa mostrar além da doença é o CAPÍTULO: numa prova, o
 * agrupamento costuma valer mais que o diagnóstico ("todos os códigos são do
 * capítulo IX" é a pista), e ele não se deduz do código sem a tabela na mão.
 */
export function CidCard({ dado }: { dado: Cid | Cid[] }) {
  const lista = Array.isArray(dado) ? dado : [dado];
  const unico = !Array.isArray(dado);

  return (
    <div className="flex flex-col gap-3">
      {lista.map((c) => (
        <div key={c.codigo} className="flex items-start gap-2.5">
          <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-sm text-[var(--text-primary)]">
                {comPonto(c.codigo)}
              </span>
              <CopyButton value={comPonto(c.codigo)} />
              <span className="min-w-0 text-sm text-[var(--text-primary)]">{c.descricao}</span>
            </div>
            {/* Na lista por nome, só o capítulo: cinco fichas inteiras viram
                parede de texto e escondem justamente a comparação entre elas. */}
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {(unico ? detalhesDoCid(c) : detalhesDoCid(c).slice(0, 1)).join(" · ")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
