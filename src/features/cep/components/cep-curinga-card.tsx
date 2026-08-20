import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { baixarCsvDeCeps, estadoDoExport, ouvirExport } from "../export";
import type { CepCuringaData } from "../types";
import { CepCard } from "./cep-card";

/**
 * O card do CEP com curinga: os 12 primeiros acertos e a saída para o resto.
 *
 * O teto de 12 é de LEITURA (ninguém lê 40 mil linhas num card); o CSV é de
 * POSSE. São perguntas diferentes e por isso não disputam o mesmo controle — o
 * card fica enxuto e quem quer a lista inteira tem para onde ir.
 */
export function CepCuringaCard({ data }: { data: CepCuringaData }) {
  const { padrao, total, hits } = data;

  // O estado do download mora no módulo, não aqui: este componente é remontado
  // a cada tecla e levaria "Baixando…" e a mensagem de erro junto. Ver `export.ts`.
  const [estado, setEstado] = useState(() => estadoDoExport(padrao));
  useEffect(() => {
    setEstado(estadoDoExport(padrao));
    return ouvirExport(padrao, () => setEstado(estadoDoExport(padrao)));
  }, [padrao]);

  const baixar = useCallback(() => {
    void baixarCsvDeCeps(padrao);
  }, [padrao]);

  const baixando = estado.fase === "baixando";

  return (
    <div className="flex flex-col gap-2">
      {hits.map((hit, i) => (
        <CepCard key={`${hit.cep}-${i}`} hit={hit} />
      ))}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
        <Button
          variant="secondary"
          size="sm"
          disabled={baixando}
          onClick={baixar}
          title={`Baixa os ${total} CEPs que casam ${padrao}`}
        >
          <Download className="h-4 w-4" />
          {baixando ? "Baixando…" : "Baixar CSV"}
        </Button>

        {/*
          O aviso é o coração disto. Sem ele a pessoa baixa achando que leva os
          12 da tela, ou olha os 12 achando que são todos — os dois
          mal-entendidos custam a prova.
        */}
        {total > hits.length ? (
          <span className="text-xs text-[var(--text-muted)]">
            o arquivo traz os {total}; a lista acima mostra {hits.length}
          </span>
        ) : null}

        {estado.fase === "erro" ? (
          <span className="text-xs text-[var(--color-pulse-600)]">{estado.mensagem}</span>
        ) : null}
      </div>
    </div>
  );
}
