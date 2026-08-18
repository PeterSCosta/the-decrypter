import { CopyButton } from "@/components/ui/copy-button";
import { CornerDownRight, Vote } from "lucide-react";
import type { VotacaoHint } from "../engine/decoders/votacao";

/**
 * Quem teve aquela votação.
 *
 * Mostra TODOS os empatados — 17 das 171 votações desta base têm mais de um
 * candidato, e escolher um seria inventar a resposta da prova. E carrega a
 * COBERTURA no rodapé, porque "não achei" aqui não significa "não existe":
 * a base é só de 2024, e a prova do acervo atravessa sete eleições.
 */
export function VotacaoCard({
  hint,
  onChain,
}: {
  hint: VotacaoHint;
  onChain?: (valor: string, via: string) => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Vote className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs text-[var(--text-muted)]">
          {hint.votos.toLocaleString("pt-BR")} votos
        </p>
        <div className="mt-1 space-y-1.5">
          {hint.achados.map((a) => (
            <div
              key={`${a.nome}-${a.ano}-${a.cargo}`}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-sm text-[var(--text-primary)]">{a.nome}</span>
              <span className="font-mono text-xs text-[var(--text-muted)]">
                {a.cargo} · {a.ano}
                {a.numero ? ` · nº ${a.numero}` : ""}
              </span>
              <CopyButton value={a.nome} />
              {onChain ? (
                <button
                  type="button"
                  onClick={() => onChain(a.nome, "Votação")}
                  className="inline-flex items-center gap-1 text-xs text-[var(--brand-strong)] hover:underline"
                >
                  <CornerDownRight className="h-3 w-3" /> usar o nome
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {hint.achados.length > 1 ? (
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Empate de votação: {hint.achados.length} candidatos com este número. A prova decide
            qual.
          </p>
        ) : null}
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          {hint.cobertura} — anos anteriores não estão na base.
        </p>
      </div>
    </div>
  );
}
