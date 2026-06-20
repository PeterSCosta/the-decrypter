import { type ProductInfo, fetchProduct } from "@/lib/openfoodfacts";
import { Barcode, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { BarcodeHint } from "../engine/decoders/barcode";

const SPECIAL_LABEL: Record<string, string> = {
  isbn: "Livro (ISBN) — veja o card ISBN para o título",
  issn: "Revista / periódico (ISSN)",
  internal: "Uso interno de loja — sem fabricante registrado",
  coupon: "Cupom / vale",
  gs1: "Faixa global GS1",
};

export function BarcodeCard({ hint }: { hint: BarcodeHint }) {
  // Só busca produto quando faz sentido (alimento de varejo, não ISBN/ISSN/cupom).
  const lookupProduct = !hint.special;
  const [data, setData] = useState<ProductInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(lookupProduct);

  useEffect(() => {
    if (!lookupProduct) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    fetchProduct(hint.code)
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
  }, [hint.code, lookupProduct]);

  const product = data ? [data.name, data.brands, data.quantity].filter(Boolean).join(" · ") : "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Barcode className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="font-mono text-base text-[var(--text-primary)]">{hint.code}</span>
        <span className="text-xs text-[var(--text-secondary)]">{hint.type}</span>
        {hint.country ? (
          <span className="text-xs text-[var(--text-muted)]">· {hint.country}</span>
        ) : null}
      </div>

      {hint.special ? (
        <p className="text-xs text-[var(--text-muted)]">{SPECIAL_LABEL[hint.special]}</p>
      ) : loading ? (
        <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" /> Buscando produto…
        </p>
      ) : data && product ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
          <div className="font-display text-sm text-[var(--text-primary)]">
            {data.name ?? data.brands}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            {[data.brands, data.quantity].filter(Boolean).join(" · ")}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">{error ?? "Produto não encontrado."}</p>
      )}
    </div>
  );
}
