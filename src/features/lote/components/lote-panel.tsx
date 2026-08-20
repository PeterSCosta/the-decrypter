import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { TETO_POR_LOTE } from "@/lib/linhas";
import type { ItemLinha } from "@/lib/linhas";
import { Play, Square, Wand2 } from "lucide-react";
import type { EstadoItem } from "../tipos";
import { useLote } from "../use-lote";
import { ColunaCopiavel } from "./coluna-copiavel";

/**
 * A aba Lote — a metade ONLINE da bancada, no plural.
 *
 * ── O QUE ELA RESOLVE ──────────────────────────────────────────────────────
 * Colar uma lista no campo do Decodificador **desliga** todas as consultas
 * online: o portão recusa entrada com quebra de linha ou acima de 64
 * caracteres, e com razão — aquilo não é identificador. Aqui a lista passa a ser
 * a unidade de trabalho, e o mesmo portão roda por ITEM.
 *
 * ── O QUE ELA NÃO FAZ, DE PROPÓSITO ────────────────────────────────────────
 * Não roda as cifras. Sessenta palpites ranqueados de uma vez, numa coluna que
 * vai para a folha da prova, é a forma industrial do pior defeito desta casa —
 * e o vocabulário do realce de palavra real é alimentado pela bancada, então o
 * lote pontuaria com régua diferente: duas telas, duas respostas, nenhuma pista
 * de qual vale. Quem quer palpite tem, em toda linha, o botão que manda aquele
 * item para o Decodificador.
 */

const ROTULO: Record<EstadoItem["tipo"], string> = {
  fila: "na fila",
  consultando: "consultando…",
  resolvido: "",
  "sem-acerto": "",
  "sem-forma": "não sei procurar isto",
  indeterminado: "não sei dizer se alguma base foi consultada",
  recusado: "",
  falhou: "",
  interrompido: "a consulta foi interrompida",
  "nao-perguntado": "",
};

/** A frase de cada linha. Uma por desfecho — nenhuma linha fica muda. */
function frase(e: EstadoItem): string {
  switch (e.tipo) {
    case "resolvido":
      return e.acertos.map((a) => `${a.base}: ${a.texto}`).join(" · ");
    case "sem-acerto":
      return e.bases.length
        ? `perguntei em ${e.bases.join(" e em ")} — nenhuma tinha`
        : "perguntei e nenhuma base tinha";
    case "recusado":
      return e.motivo === "longo"
        ? `não perguntei: ${e.tamanho} caracteres, acima do limite de 64`
        : "não perguntei: isto não tem letra nem número";
    case "falhou":
      return e.mensagem;
    case "nao-perguntado":
      return e.razao === "teto"
        ? `não perguntei: passou do limite de ${TETO_POR_LOTE} itens por rodada`
        : e.razao === "429"
          ? "não perguntei: o limite de requisições do servidor foi atingido"
          : e.razao === "sessao"
            ? "não perguntei: a sessão caiu no meio da rodada"
            : "não perguntei: a rodada foi parada";
    default:
      return ROTULO[e.tipo];
  }
}

const TOM: Partial<Record<EstadoItem["tipo"], string>> = {
  resolvido: "text-[var(--text-primary)]",
  falhou: "text-[var(--pulse)]",
  interrompido: "text-[var(--pulse)]",
  indeterminado: "text-[var(--pulse)]",
  "nao-perguntado": "text-[var(--pulse)]",
};

export function LotePanel({ onDecodificador }: { onDecodificador?: (texto: string) => void }) {
  const {
    texto,
    setTexto,
    previa,
    lote,
    estadosNaOrdem,
    resumo,
    coluna,
    campo,
    setCampo,
    camposDisponiveis,
    marcarVazias,
    setMarcarVazias,
    desatualizado,
    executar,
    parar,
    aplicarDivisaoPorVirgula,
  } = useLote();

  /**
   * "pausado429" NÃO é rodar.
   *
   * No 429 a fila para inteira e nada fica em voo — o executor não re-tenta
   * sozinho, de propósito. O botão ficava vermelho escrito "Parar" logo acima
   * de uma frase mandando rodar de novo o que faltou, e não havia caminho para
   * fazer isso: "Parar" não para nada, e o botão de consultar não existia.
   */
  const rodando = lote.fase === "rodando" || lote.fase === "pausado-orcamento";
  const aConsultar = previa.termos.length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">
          Lote — consultar N de uma vez
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Uma entrada por linha. A bancada consulta cada uma nas mesmas bases do Decodificador (CEP,
          município, aeroporto, poste, CID-10, cadastro de Blumenau, filme por ID da IMDb) e devolve
          uma linha por entrada — <strong>inclusive as que não resolveram</strong>, dizendo por quê.
          Ela não roda as cifras: para isso, cada linha tem o botão da bancada.
        </p>
      </div>

      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={8}
        aria-label="Uma entrada por linha"
        placeholder={"89010000\n89012000\ntt0111161\nGRU"}
      />

      {/* Pré-voo: o número de requisições fica na cara antes do clique. */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={rodando ? parar : executar}
          disabled={!rodando && aConsultar === 0}
          className={cn(
            "inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-semibold transition-colors",
            rodando
              ? "bg-[var(--pulse)] text-white"
              : "bg-[var(--brand)] text-[var(--brand-ink)] disabled:opacity-40",
          )}
        >
          {rodando ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {rodando ? "Parar" : `Consultar ${aConsultar}`}
        </button>

        <span className="text-[var(--text-muted)]">
          {previa.linhas.length} linha(s)
          {previa.vaziasIgnoradas > 0 ? ` · ${previa.vaziasIgnoradas} em branco` : ""}
          {previa.linhas.length - previa.termos.length - previa.excedentes.length > 0
            ? ` · ${previa.linhas.filter((l) => l.motivo).length} fora do portão`
            : ""}
          {previa.excedentes.length > 0
            ? ` · ${previa.excedentes.length} acima do limite de ${TETO_POR_LOTE}`
            : ""}
        </span>
      </div>

      {/* A colagem de PDF vem numa linha só. Oferecemos; nunca aplicamos sozinho
          — uma coordenada é um item e tem vírgula. */}
      {previa.pareceListaPorVirgula ? (
        <button
          type="button"
          onClick={aplicarDivisaoPorVirgula}
          className="self-start rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Parece uma lista separada por vírgula — dividir em uma entrada por linha?
        </button>
      ) : null}

      {lote.fase === "pausado429" ? (
        <p className="text-sm text-[var(--pulse)]">
          O servidor recusou por excesso de requisições. A rodada parou — as que já responderam
          estão abaixo. Espere cerca de um minuto e rode o que faltou.
        </p>
      ) : null}
      {lote.fase === "pausado-orcamento" ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Aguardando o orçamento de rede: o limite é por IP e a equipe inteira o divide. Retomo
          sozinho.
        </p>
      ) : null}
      {lote.fase === "sessao-caiu" ? (
        <p className="text-sm text-[var(--pulse)]">
          A sessão caiu no meio da rodada. O que já resolveu está preservado abaixo.
        </p>
      ) : null}

      {/* Cabeçalho de integridade: todos os baldes, sempre, e a soma é o total. */}
      {lote.itens.length > 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="font-medium text-[var(--text-primary)]">{resumo.total} item(ns)</span>
            {resumo.baldes.map((b) => (
              <span
                key={b.rotulo}
                className={b.alerta ? "text-[var(--pulse)]" : "text-[var(--text-secondary)]"}
              >
                {b.quantos} {b.rotulo}
              </span>
            ))}
          </div>
          {resumo.incompleto ? (
            <p className="mt-1.5 text-xs font-semibold text-[var(--pulse)]">
              Este resultado NÃO está completo.
            </p>
          ) : null}
        </div>
      ) : null}

      {lote.itens.length > 0 ? (
        <>
          <ColunaCopiavel
            coluna={coluna}
            linhas={lote.itens.length}
            campo={campo}
            setCampo={setCampo}
            campos={camposDisponiveis}
            marcarVazias={marcarVazias}
            setMarcarVazias={setMarcarVazias}
            desatualizado={desatualizado}
          />

          <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
            {lote.itens.map((item: ItemLinha, i: number) => {
              const e = estadosNaOrdem[i];
              return (
                <li key={`${item.indice}-${item.termo}`} className="flex items-start gap-3 py-2">
                  <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-xs text-[var(--text-muted)]">
                    {item.indice}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm text-[var(--text-primary)]">{item.termo}</div>
                    <p className={cn("text-xs", TOM[e.tipo] ?? "text-[var(--text-secondary)]")}>
                      {frase(e)}
                    </p>
                  </div>
                  {onDecodificador ? (
                    <button
                      type="button"
                      onClick={() => onDecodificador(item.termo)}
                      title="Abrir esta entrada no Decodificador"
                      className="shrink-0 rounded-[var(--radius-md)] border border-[var(--border-strong)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
