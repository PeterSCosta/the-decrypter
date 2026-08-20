import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";
import type { Campo, CampoId } from "../tipos";

/**
 * A coluna que sai da tela e vai para a folha da prova.
 *
 * ── POR QUE UM SELETOR DE CAMPO, E NÃO SÓ "A RESPOSTA" ─────────────────────
 * Porque a prova quase nunca pede "a resposta": pede o bairro, ou a cidade, ou
 * a coordenada. Uma coluna rotulada só "resposta" pode entregar o logradouro
 * para quem precisava do bairro — e o engano só aparece na correção. As opções
 * mostradas são as que ALGUMA base preencheu de fato; oferecer "bairro" numa
 * rodada de aeroportos seria uma coluna de interrogações com cara de dado
 * faltando.
 *
 * ── POR QUE `?` É O PADRÃO ─────────────────────────────────────────────────
 * Uma linha vazia no meio de um bloco colado é a não-resposta viajando
 * disfarçada: no destino, vazio não distingue "não achei" de "não consegui
 * perguntar", e some no meio das outras. O `?` grita.
 */
export function ColunaCopiavel({
  coluna,
  linhas,
  campo,
  setCampo,
  campos,
  marcarVazias,
  setMarcarVazias,
  desatualizado,
}: {
  coluna: string;
  linhas: number;
  campo: CampoId;
  setCampo: (c: CampoId) => void;
  campos: Campo[];
  marcarVazias: boolean;
  setMarcarVazias: (v: boolean) => void;
  desatualizado: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-[var(--text-primary)]">Coluna para copiar</span>

        {campos.length > 1 ? (
          <div className="inline-flex flex-wrap rounded-[var(--radius-md)] border border-[var(--border-strong)] p-0.5">
            {campos.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCampo(c.id)}
                className={cn(
                  "rounded-[calc(var(--radius-md)-2px)] px-2.5 py-1 text-xs font-medium transition-colors",
                  campo === c.id
                    ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {c.rotulo}
              </button>
            ))}
          </div>
        ) : null}

        <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={marcarVazias}
            onChange={(e) => setMarcarVazias(e.target.checked)}
          />
          marcar sem resposta com <code className="font-mono">?</code>
        </label>

        <CopyButton value={coluna} />
        <span className="text-xs text-[var(--text-muted)]">{linhas} linha(s)</span>
      </div>

      {!marcarVazias ? (
        <p className="text-xs text-[var(--pulse)]">
          Com as vazias em branco, no destino não dá para distinguir “não achei” de “não consegui
          perguntar” — e a linha some no meio das outras.
        </p>
      ) : null}

      {desatualizado ? (
        <p className="text-xs text-[var(--pulse)]">
          Estes resultados são do texto anterior — o campo mudou depois da rodada. A coluna continua
          alinhada com o que foi consultado, não com o que está escrito agora.
        </p>
      ) : null}

      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 font-mono text-sm text-[var(--text-primary)]">
        {coluna}
      </pre>
    </div>
  );
}
