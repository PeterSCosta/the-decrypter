import { CopyButton } from "@/components/ui/copy-button";
import { Lightbox } from "@/components/ui/lightbox";
import { CornerDownRight, ExternalLink, IdCard } from "lucide-react";
import { useState } from "react";
import type { FichaHint } from "../engine/decoders/ficha-cp";

/**
 * Quem é aquele codinome na Comissão de Provas.
 *
 * A miniatura é o polaroide do personagem, e clicar abre o dossiê inteiro —
 * porque a arte É o registro aqui: a piada, a fobia e o prognóstico estão
 * escritos naquela folha datilografada, e resumi-los em três linhas de texto
 * jogaria fora justamente o que se foi buscar.
 *
 * Dois avisos que não são enfeite. O do ARQUIVO N, porque um número que se
 * repete nas 17 fichas parece identificador e NÃO é — quem o tratar como chave
 * vai atrás de uma pessoa que não existe. E o do personagem, porque aquela
 * leitura é NOSSA: não está escrita em lugar nenhum da ficha.
 */
export function FichaCard({
  hint,
  onChain,
}: {
  hint: FichaHint;
  onChain?: (valor: string, via: string) => void;
}) {
  const [aberta, setAberta] = useState<{ src: string; titulo: string } | null>(null);
  const campo = hint.acertos[0]?.campo;
  const doArquivo = campo === "arquivo";

  return (
    <div className="flex items-start gap-2.5">
      <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs text-[var(--text-muted)]">
          {doArquivo ? `arquivo ${hint.consulta}` : `ficha da CP · ${hint.consulta}`}
        </p>

        {doArquivo ? (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Este é o número de arquivo das <strong>{hint.acertos.length}</strong> fichas — o mesmo
            em todas. É número da arte, não identificador de pessoa.
          </p>
        ) : null}

        <div className={doArquivo ? "mt-2 flex flex-wrap gap-1.5" : "mt-1.5 space-y-2.5"}>
          {hint.acertos.map(({ ficha, campo: c }) => {
            const titulo = `${ficha.codinome} — ${ficha.nomeCivil}`;
            const mini = (
              <button
                type="button"
                onClick={() => setAberta({ src: ficha.imagem, titulo })}
                title={`Ver a ficha de ${titulo}`}
                aria-label={`Ver a ficha de ${titulo}`}
                className="block shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-strong)]"
              >
                <img
                  src={ficha.mini}
                  alt=""
                  loading="lazy"
                  className={doArquivo ? "h-14 w-10 object-cover" : "h-20 w-14 object-cover"}
                />
              </button>
            );

            if (doArquivo) return <span key={ficha.slug}>{mini}</span>;

            return (
              <div key={ficha.slug} className="flex gap-2.5">
                {mini}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm text-[var(--text-primary)]">
                      {ficha.codinome}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">{ficha.nomeCivil}</span>
                    <CopyButton value={ficha.nomeCivil} />
                    {onChain ? (
                      <button
                        type="button"
                        onClick={() =>
                          onChain(
                            c === "codinome" ? ficha.nomeCivil : ficha.codinome,
                            "Ficha da CP",
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs text-[var(--brand-strong)] hover:underline"
                      >
                        <CornerDownRight className="h-3 w-3" />{" "}
                        {c === "codinome" ? "usar o nome civil" : "usar o codinome"}
                      </button>
                    ) : null}
                  </div>

                  <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
                    fobia: {ficha.fobia} · alvo: {ficha.alvo}
                  </p>
                  <p className="mt-1 text-xs italic text-[var(--text-secondary)]">
                    “{ficha.frase}”
                  </p>

                  {c === "personagem" ? (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      “{ficha.personagem}” é leitura nossa da foto — não está escrito na ficha.
                    </p>
                  ) : null}

                  <a
                    href={ficha.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--brand-strong)] hover:underline"
                  >
                    no Instagram <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {aberta ? (
        <Lightbox
          src={aberta.src}
          alt={aberta.titulo}
          legenda={aberta.titulo}
          aoFechar={() => setAberta(null)}
        />
      ) : null}
    </div>
  );
}
