import { CopyButton } from "@/components/ui/copy-button";
import { CornerDownRight, Store } from "lucide-react";
import type { LojaHint } from "../engine/decoders/loja";

/**
 * Que loja é aquela unidade.
 *
 * Mostra TODAS as que dividem o identificador — `A13` serve Americanas **e**
 * Pittol no Park Europeu —, pelo mesmo motivo do card de votação: escolher uma
 * seria inventar a resposta da prova.
 *
 * E carrega dois avisos que não são enfeite. O primeiro, quando o acerto veio
 * pelo número solto: aquele mesmo número quase sempre também é código de rua, e
 * a resposta de rua está logo acima na lista, correta. O segundo é a cobertura —
 * Neumarkt e Norte entram sem número porque a fonte usada não o traz, o que não
 * é o mesmo que eles não numerarem.
 */
export function LojaCard({
  hint,
  onChain,
}: {
  hint: LojaHint;
  onChain?: (valor: string, via: string) => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Store className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs text-[var(--text-muted)]">unidade {hint.consulta}</p>

        <div className="mt-1 space-y-1.5">
          {hint.achados.map((l) => (
            <div key={`${l.shopping.id}-${l.identificador}-${l.nome}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[var(--text-primary)]">{l.nome}</span>
                {l.quiosque ? (
                  <span className="rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-muted)]">
                    quiosque
                  </span>
                ) : null}
                <CopyButton value={l.nome} />
                {onChain ? (
                  <button
                    type="button"
                    onClick={() => onChain(l.nome, "Loja")}
                    className="inline-flex items-center gap-1 text-xs text-[var(--brand-strong)] hover:underline"
                  >
                    <CornerDownRight className="h-3 w-3" /> usar o nome
                  </button>
                ) : null}
              </div>
              <p className="font-mono text-xs text-[var(--text-muted)]">
                {l.shopping.nome}
                {[l.piso, l.ala].filter(Boolean).length
                  ? ` · ${[l.piso, l.ala].filter(Boolean).join(" · ")}`
                  : ""}
                {l.ramo.length ? ` · ${l.ramo.join(" · ")}` : ""}
              </p>
            </div>
          ))}
        </div>

        {hint.achados.length > 1 ? (
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            {hint.achados.length} lojas dividem esta unidade. A prova decide qual.
          </p>
        ) : null}

        {hint.porNumeroSolto ? (
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Casou pelo número sem o prefixo do shopping — este mesmo número quase sempre também é
            código de rua, e essa leitura está acima.
          </p>
        ) : null}

        {hint.aviso ? (
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint.aviso}</p>
        ) : null}
      </div>
    </div>
  );
}
