import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { ArrowDown, ArrowUp, CircleAlert, Plus, Power, Trash2 } from "lucide-react";
import { STATE_STYLES } from "./matrix-grid";

/**
 * O editor de regras é onde a hipótese vive. Três coisas mandam no desenho:
 *
 *  1. LIGAR/DESLIGAR sem apagar — sob pressão a pessoa testa A, desliga, testa B
 *     e volta para A. Apagar para testar é perder o trabalho.
 *  2. A CONTAGEM de células que a regra pegou, visível sempre: é o que diz que a
 *     hipótese está viva antes de olhar o desenho. Zero célula é resposta.
 *  3. A ORDEM importa (uma regra pinta, a seguinte lê o que a anterior pintou),
 *     então subir e descer regra é operação de primeira classe, não enfeite.
 *
 * No estreito cada regra é um cartão empilhado — nunca colunas lado a lado.
 */

export interface OpcaoRegra {
  id: string;
  label: string;
  hint?: string;
}

export interface AtalhoExpr {
  rotulo: string;
  expr: string;
  hint?: string;
}

export interface RegraView {
  id: string;
  ativa: boolean;
  escopo: string;
  condicao: string;
  acao: string;
  /** Estado que a ação aplica (índice na paleta). */
  estado: number;
  /** Texto da ação "substituir por". */
  texto: string;
  /** Quantas células a última passada pegou; `null` quando não rodou. */
  atingidas: number | null;
  /** Erro de expressão, legível — aparece na regra e não derruba as outras. */
  erro: string | null;
}

export interface RuleEditorProps {
  regras: RegraView[];
  escopos: OpcaoRegra[];
  acoes: OpcaoRegra[];
  /** Atalhos de expressão por escopo: o que se pode escrever ali. */
  atalhos: Record<string, AtalhoExpr[]>;
  estados: number;
  rotulosEstado: string[];
  onAdicionar: () => void;
  onRemover: (id: string) => void;
  onMover: (id: string, direcao: -1 | 1) => void;
  onAlterar: (id: string, patch: Partial<RegraView>) => void;
}

const campo =
  "h-9 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

function Rotulo({ children }: { children: string }) {
  return (
    <span className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </span>
  );
}

function Contagem({ regra }: { regra: RegraView }) {
  if (regra.erro) return <Badge tone="pulse">erro</Badge>;
  if (!regra.ativa) return <Badge tone="neutral">desligada</Badge>;
  if (regra.atingidas === null) return <Badge tone="neutral">—</Badge>;
  return (
    <Badge tone={regra.atingidas > 0 ? "brand" : "neutral"}>
      {regra.atingidas} {regra.atingidas === 1 ? "célula" : "células"}
    </Badge>
  );
}

/** A ação precisa de um estado quando pinta, e de um texto quando escreve. */
function precisaEstado(acao: string) {
  return acao === "pintar" || acao === "alternar" || acao === "marcar";
}

function precisaTexto(acao: string) {
  return acao === "substituir" || acao === "marcar";
}

const ROTULO_TEXTO: Record<string, string> = {
  marcar: "Caractere",
  substituir: "Escrever",
};

function LinhaRegra({
  regra,
  indice,
  total,
  escopos,
  acoes,
  atalhos,
  estados,
  rotulosEstado,
  onRemover,
  onMover,
  onAlterar,
}: {
  regra: RegraView;
  indice: number;
  total: number;
} & Pick<
  RuleEditorProps,
  | "escopos"
  | "acoes"
  | "atalhos"
  | "estados"
  | "rotulosEstado"
  | "onRemover"
  | "onMover"
  | "onAlterar"
>) {
  const dicas = atalhos[regra.escopo] ?? [];
  const escopoAtual = escopos.find((e) => e.id === regra.escopo);

  return (
    <Card
      className={cn(
        "flex flex-col gap-2 p-3",
        !regra.ativa && "opacity-60",
        regra.erro && "border-[var(--color-pulse-200)]",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAlterar(regra.id, { ativa: !regra.ativa })}
          aria-pressed={regra.ativa}
          title={regra.ativa ? "Desligar a regra (sem apagar)" : "Ligar a regra"}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-xs font-medium transition-colors",
            regra.ativa
              ? "border-transparent bg-[var(--brand)] text-[var(--brand-ink)]"
              : "border-[var(--border-strong)] text-[var(--text-secondary)]",
          )}
        >
          <Power className="h-3 w-3" />
          {indice + 1}
        </button>

        <Contagem regra={regra} />

        <span className="ml-auto flex items-center">
          <IconButton
            label="Subir a regra"
            onClick={() => onMover(regra.id, -1)}
            disabled={indice === 0}
            className="h-7 w-7 disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label="Descer a regra"
            onClick={() => onMover(regra.id, 1)}
            disabled={indice === total - 1}
            className="h-7 w-7 disabled:opacity-30"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label="Remover a regra"
            onClick={() => onRemover(regra.id)}
            className="h-7 w-7 hover:text-[var(--color-pulse-600)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1">
          <Rotulo>Para cada</Rotulo>
          <select
            className={campo}
            value={regra.escopo}
            onChange={(e) => onAlterar(regra.id, { escopo: e.target.value })}
          >
            {escopos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <Rotulo>Faça</Rotulo>
          <div className="flex gap-1.5">
            <select
              className={campo}
              value={regra.acao}
              onChange={(e) => onAlterar(regra.id, { acao: e.target.value })}
            >
              {acoes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            {precisaEstado(regra.acao) && estados > 2 ? (
              <select
                className={cn(campo, "w-28 shrink-0")}
                value={regra.estado}
                aria-label="Estado aplicado"
                onChange={(e) => onAlterar(regra.id, { estado: Number(e.target.value) })}
              >
                {Array.from({ length: estados }, (_, i) => i)
                  .slice(1)
                  .map((s) => (
                    <option key={s} value={s}>
                      {rotulosEstado[s] ?? STATE_STYLES[s]?.nome ?? `estado ${s}`}
                    </option>
                  ))}
              </select>
            ) : null}
          </div>
        </label>
      </div>

      {precisaTexto(regra.acao) ? (
        <label className="flex flex-col gap-1">
          <Rotulo>{ROTULO_TEXTO[regra.acao] ?? "Texto"}</Rotulo>
          <input
            className={cn(campo, "font-mono")}
            value={regra.texto}
            onChange={(e) => onAlterar(regra.id, { texto: e.target.value })}
            placeholder={
              regra.acao === "marcar" ? "█ ▓ ░ X · #" : "texto que substitui o conteúdo da célula"
            }
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1">
        <Rotulo>Quando</Rotulo>
        <input
          className={cn(campo, "font-mono", regra.erro && "border-[var(--color-pulse-500)]")}
          value={regra.condicao}
          onChange={(e) => onAlterar(regra.id, { condicao: e.target.value })}
          placeholder={escopoAtual?.hint ?? "condição — vazio vale para todas"}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </label>

      {regra.erro ? (
        <p className="flex items-start gap-1.5 text-xs text-[var(--color-pulse-700)]">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {regra.erro}
        </p>
      ) : null}

      {dicas.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {dicas.map((d) => (
            <button
              key={d.expr}
              type="button"
              title={d.hint ?? d.expr}
              onClick={() =>
                onAlterar(regra.id, {
                  condicao: regra.condicao.trim() === "" ? d.expr : `${regra.condicao} e ${d.expr}`,
                })
              }
              className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[0.6875rem] text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-strong)] hover:text-[var(--text-primary)]"
            >
              {d.rotulo}
            </button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function RuleEditor({
  regras,
  escopos,
  acoes,
  atalhos,
  estados,
  rotulosEstado,
  onAdicionar,
  onRemover,
  onMover,
  onAlterar,
}: RuleEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      {regras.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma regra. Sem regra a matriz de destino fica como você pintar à mão — que também é um
          jeito legítimo de resolver.
        </p>
      ) : (
        regras.map((r, i) => (
          <LinhaRegra
            key={r.id}
            regra={r}
            indice={i}
            total={regras.length}
            escopos={escopos}
            acoes={acoes}
            atalhos={atalhos}
            estados={estados}
            rotulosEstado={rotulosEstado}
            onRemover={onRemover}
            onMover={onMover}
            onAlterar={onAlterar}
          />
        ))
      )}

      <div>
        <Button variant="secondary" size="sm" onClick={onAdicionar}>
          <Plus className="h-3.5 w-3.5" />
          Nova regra
        </Button>
      </div>
    </div>
  );
}

/**
 * A referência da mini-linguagem. Sai das listas do próprio motor (`VARIAVEIS_REF`,
 * `FUNCOES_REF`, `OPERADORES_REF`) em vez de ser redigitada aqui — uma função
 * nova no motor aparece na tela sozinha, e nunca há uma tela mentindo sobre o
 * que a condição aceita.
 */
export function ReferenciaExpr({
  grupos,
}: {
  grupos: { titulo: string; itens: { nome: string; assinatura: string; descricao: string }[] }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {grupos.map((g) => (
        <div key={g.titulo} className="flex flex-col gap-1">
          <span className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
            {g.titulo}
          </span>
          <div className="flex flex-col gap-0.5">
            {g.itens.map((i) => (
              <div key={`${g.titulo}-${i.nome}`} className="flex flex-wrap items-baseline gap-x-2">
                <code className="font-mono text-xs text-[var(--text-primary)]">{i.assinatura}</code>
                <span className="min-w-0 text-xs text-[var(--text-secondary)]">{i.descricao}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
