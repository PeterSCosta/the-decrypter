import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ArrowRight, Wifi } from "lucide-react";
import { useState } from "react";
import type { HelpEntry } from "../help-content";
import { encurtar, useExemploVivo } from "../use-exemplo-vivo";

/**
 * Um exemplo, com a resposta que o MOTOR dá — não a que alguém escreveu.
 *
 * Decodifica sob demanda (`ativo`), e não ao montar a página: são 136 exemplos
 * a 1,5 ms cada, 202 ms medidos — num celular médio isso vira meio segundo de
 * tela travada logo ao abrir a Ajuda, e a Ajuda é justamente onde alguém
 * chega com pressa.
 */
function Exemplo({
  entrada,
  esperado,
  aoTestar,
}: {
  entrada: string;
  esperado?: string;
  aoTestar?: (texto: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const leituras = useExemploVivo(entrada, aberto);
  const curto = encurtar(entrada);

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          title={curto === entrada ? "Decodificar este exemplo" : entrada}
          className="rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--brand)] hover:text-[var(--text-primary)]"
        >
          {curto}
        </button>
        {/* O valor do copiar é SEMPRE o inteiro: o encurtamento é de exibição.
            Publicar o valor cortado foi o defeito que o CAR carregou. */}
        <CopyButton value={entrada} />
        {aoTestar ? (
          <button
            type="button"
            onClick={() => aoTestar(entrada)}
            className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--brand-strong)]"
          >
            na bancada <ArrowRight className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {aberto ? (
        <div className="mt-1.5 flex flex-col gap-1 border-l-2 border-[var(--brand)] pl-2.5">
          {leituras === null ? (
            <span className="text-xs text-[var(--text-muted)]">decodificando…</span>
          ) : leituras.length > 0 ? (
            leituras.map((l) => (
              <div key={l.decoder} className="flex flex-wrap items-baseline gap-1.5 text-xs">
                <span className="text-[var(--text-muted)]">{l.decoder}</span>
                <span className="font-mono text-[var(--brand-strong)]">{l.saida}</span>
              </div>
            ))
          ) : (
            <span className="text-xs text-[var(--text-muted)]">
              nada offline — esta leitura depende de consulta
            </span>
          )}
          {esperado ? (
            <div className="flex flex-wrap items-baseline gap-1.5 text-xs">
              <Badge tone="neutral">
                <Wifi className="h-3 w-3" /> com consulta
              </Badge>
              <span className="text-[var(--text-secondary)]">{esperado}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Verbete({
  entrada: e,
  aoTestar,
}: {
  entrada: HelpEntry;
  aoTestar?: (texto: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 sm:flex-row sm:gap-4">
      <div className="font-display text-sm text-[var(--text-primary)] sm:w-64 sm:shrink-0">
        {e.name}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--text-secondary)]">{e.desc}</p>

        {e.examples?.map((ex) => (
          <Exemplo key={ex} entrada={ex} esperado={e.esperado} aoTestar={aoTestar} />
        ))}

        {/* Verbete de aba ou de API: o `in` descreve um arquivo ou uma URL, não
            passa pela bancada, e não há motor para consultar. */}
        {e.example ? (
          <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
            <span className="text-[var(--text-secondary)]">{e.example.in}</span>
            {" → "}
            <span className="text-[var(--brand-strong)]">{e.example.out}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
