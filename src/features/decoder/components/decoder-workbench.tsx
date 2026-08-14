import { CopyButton } from "@/components/ui/copy-button";
import { Input, Textarea } from "@/components/ui/input";
import { ArrowDownUp, ChevronDown, KeyRound, ListPlus, Sparkles, Type, X } from "lucide-react";
import { useState } from "react";
import { decoders } from "../engine/registry";
import { useDecoder } from "../use-decoder";
import { DecoderSelector } from "./decoder-selector";
import { HintStrip } from "./hint-strip";
import { ResultCard } from "./result-card";
import { TrailBar } from "./trail-bar";

const EXAMPLES = ["SGVsbG8gbXVuZG8=", "Wklab xli gshi", "3722", "88xxx500", "Nb11458750330"];

export function DecoderWorkbench({ entradaInicial }: { entradaInicial?: string }) {
  const {
    input,
    setInput,
    key,
    setKey,
    aux,
    setAux,
    title,
    setTitle,
    selectedId,
    setSelectedId,
    likely,
    unlikely,
    results,
    canEncode,
    encodeInput,
    setEncodeInput,
    encoded,
    selectedDecoder,
    trail,
    chainTo,
    undoChain,
    goToStep,
    clearTrail,
    hints,
  } = useDecoder(entradaInicial);
  const [showUnlikely, setShowUnlikely] = useState(false);
  const [showAux, setShowAux] = useState(false);

  const selectedName = selectedId
    ? (decoders.find((d) => d.id === selectedId)?.name ?? selectedId)
    : null;

  // O 2º campo aparece quando faz sentido: pedido, já preenchido, ou exigido
  // pela cifra selecionada. Preencher o campo É o gatilho — os decoders que o
  // exigem entram na corrida assim que ele deixa de estar vazio.
  const auxSpec = selectedDecoder?.inputs?.aux;
  const auxVisible = showAux || !!aux || !!auxSpec;

  return (
    <div className="flex flex-col gap-5 md:flex-row md:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-5 md:order-2">
        <TrailBar trail={trail} onGoTo={goToStep} onUndo={undoChain} onClear={clearTrail} />

        <div className="flex flex-col gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Cole aqui o texto cifrado, números, Base64, Morse, um código de rua, um CEP…"
            autoFocus
            aria-label="Entrada para decifrar"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[12rem] flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={
                  selectedDecoder?.inputs?.key?.placeholder ?? "Chave · índices · deslocamentos"
                }
                aria-label="Chave, índices ou deslocamentos"
                className="pl-9 font-mono"
              />
            </div>
            {/* O título é a camada 1 em 11 das 41 provas da GIA — ele nomeia o
                dicionário a consultar. Só levanta chips; nunca muda o ranking. */}
            <div className="relative min-w-[10rem] flex-1">
              <Type className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da prova (é pista)"
                aria-label="Título da prova — interpretado como pista"
                className="pl-9"
              />
            </div>
            {!auxVisible && (
              <button
                type="button"
                onClick={() => setShowAux(true)}
                className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <ListPlus className="h-3.5 w-3.5" /> 2º campo
              </button>
            )}
            {!input && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)]">tente:</span>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setInput(ex)}
                    className="rounded-md bg-[var(--surface-sunken)] px-2 py-1 font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2º campo: a fonte a indexar, o texto original de um diff, a lista. */}
          {auxVisible && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="aux-field"
                className="text-xs font-medium text-[var(--text-secondary)]"
              >
                {auxSpec?.label ?? "2º campo — fonte a indexar, texto original, lista"}
                {auxSpec?.required && !aux.trim() ? (
                  <span className="ml-1.5 text-[var(--color-pulse-600)]">obrigatório</span>
                ) : null}
              </label>
              <Textarea
                id="aux-field"
                value={aux}
                onChange={(e) => setAux(e.target.value)}
                placeholder={
                  auxSpec?.placeholder ??
                  "Ex.: os nomes a indexar (um por linha), ou o texto original para comparar…"
                }
                className="min-h-[4rem]"
              />
            </div>
          )}
        </div>

        <HintStrip hints={hints} onSelect={setSelectedId} onChain={chainTo} />

        {/* Modo "uma cifra só" */}
        {selectedId && (
          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm">
            <span className="text-[var(--text-secondary)]">
              Rodando só: <span className="text-[var(--text-primary)]">{selectedName}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" /> todas
            </button>
          </div>
        )}

        {/* Codificar nessa cifra (inverso) */}
        {selectedId && canEncode && (
          <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
              <ArrowDownUp className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
              Codificar em {selectedName}
            </div>
            <Textarea
              value={encodeInput}
              onChange={(e) => setEncodeInput(e.target.value)}
              placeholder={`Digite o texto para codificar em ${selectedName}…`}
              aria-label={`Texto para codificar em ${selectedName}`}
              className="min-h-[4.5rem]"
            />
            {encoded != null && (
              <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                <p className="min-w-0 flex-1 break-words font-mono text-sm text-[var(--text-primary)]">
                  {encoded}
                </p>
                <CopyButton value={encoded} className="-mr-1 shrink-0" />
              </div>
            )}
          </div>
        )}

        {input.trim() && !selectedId && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
            {results.length > 0 ? (
              <span>
                {results.length} {results.length === 1 ? "ideia" : "ideias"}
                {likely.length > 0 ? ` · ${likely.length} provável(is)` : ""}
              </span>
            ) : (
              <span>Nenhuma interpretação encontrada — tente outra entrada ou uma chave.</span>
            )}
          </div>
        )}

        {/* Resultados */}
        {selectedId ? (
          input.trim() && results.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Sem resultado para essa entrada nessa cifra.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((c, i) => (
                <ResultCard
                  key={`${c.decoderId}-${c.label ?? ""}-${i}`}
                  c={c}
                  rank={i + 1}
                  onChain={chainTo}
                />
              ))}
            </div>
          )
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {likely.map((c, i) => (
                <ResultCard
                  key={`${c.decoderId}-${c.label ?? ""}-${i}`}
                  c={c}
                  rank={i + 1}
                  onChain={chainTo}
                />
              ))}
            </div>

            {unlikely.length > 0 && (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setShowUnlikely((v) => !v)}
                  className="flex items-center gap-1.5 self-start text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showUnlikely ? "rotate-180" : ""}`}
                  />
                  {showUnlikely ? "Ocultar" : "Mostrar"} {unlikely.length} pouco provável(is)
                </button>
                {showUnlikely &&
                  unlikely.map((c, i) => (
                    <ResultCard
                      key={`${c.decoderId}-${c.label ?? ""}-${i}`}
                      c={c}
                      rank={likely.length + i + 1}
                      onChain={chainTo}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      <DecoderSelector selectedId={selectedId} onSelect={setSelectedId} />
    </div>
  );
}
