import { CopyButton } from "@/components/ui/copy-button";
import { type CnpjInfo, fetchCnpj } from "@/lib/brasilapi";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { DocResult } from "../engine/decoders/documents";

function Info({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="break-words text-sm text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

export function DocumentCard({ doc }: { doc: DocResult }) {
  const [data, setData] = useState<CnpjInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canLookup = doc.kind === "cnpj" && doc.valid && !doc.alfanumerico;

  // Consulta automática assim que um CNPJ válido é detectado (igual ISBN/NCM).
  useEffect(() => {
    if (!canLookup) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    fetchCnpj(doc.raw)
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
  }, [canLookup, doc.raw]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {doc.valid ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-success-600)]" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-[var(--color-pulse-600)]" />
        )}
        <span className="font-mono text-base text-[var(--text-primary)]">{doc.formatted}</span>
        <CopyButton value={doc.formatted} />
        <span className="ml-auto text-sm font-medium text-[var(--text-secondary)]">
          {doc.valid ? "válido" : "inválido"}
        </span>
      </div>

      {doc.alfanumerico ? (
        <p className="text-xs text-[var(--text-muted)]">
          CNPJ alfanumérico (novo formato, vigente a partir de 2026). A consulta online ainda não se
          aplica a este formato.
        </p>
      ) : null}

      {canLookup && loading ? (
        <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" /> Consultando dados na BrasilAPI…
        </p>
      ) : null}
      {error ? <p className="text-xs text-[var(--color-pulse-600)]">{error}</p> : null}

      {data ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
          <div className="mb-2 font-display text-sm text-[var(--text-primary)]">
            {data.razao_social}
            {data.nome_fantasia ? (
              <span className="ml-1.5 font-sans font-normal text-[var(--text-secondary)]">
                ({data.nome_fantasia})
              </span>
            ) : null}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Info label="Situação" value={data.descricao_situacao_cadastral} />
            <Info label="Atividade" value={data.cnae_fiscal_descricao} />
            <Info
              label="Endereço"
              value={[data.logradouro, data.numero, data.bairro].filter(Boolean).join(", ")}
            />
            <Info label="Município/UF" value={`${data.municipio} — ${data.uf}`} />
            <Info label="CEP" value={data.cep} />
            <Info label="Telefone" value={data.ddd_telefone_1} />
          </dl>
        </div>
      ) : null}
    </div>
  );
}
