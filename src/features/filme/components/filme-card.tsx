import { CopyButton } from "@/components/ui/copy-button";
import { Clapperboard } from "lucide-react";
import { type Filme, duracaoLegivel, tituloPrincipal } from "../types";

/**
 * A ficha do filme — desenhada em torno de uma pergunta: **como ele se chama
 * aqui?**
 *
 * Por isso o título principal vem grande e, quando a fonte não tem o título
 * brasileiro, a ressalva vem colada nele e não num rodapé. Um card que
 * mostrasse "The Shawshank Redemption" em destaque e escondesse a ressalva lá
 * embaixo seria pior que não mostrar nada: quem bateu o olho copia e segue.
 */
export function FilmeCard({ filme }: { filme: Filme }) {
  const titulo = tituloPrincipal(filme);
  const duracao = duracaoLegivel(filme.duracaoMin);

  const linhas: [string, string][] = [];
  if (filme.tituloBr && filme.tituloOriginal && filme.tituloOriginal !== filme.tituloBr)
    linhas.push(["Título original", filme.tituloOriginal]);
  // O de Portugal aparece SEMPRE rotulado, e nunca no lugar do brasileiro.
  if (filme.tituloPt) linhas.push(["Em Portugal", filme.tituloPt]);
  if (filme.ano) linhas.push(["Ano", String(filme.ano)]);
  if (duracao) linhas.push(["Duração", duracao]);
  if (filme.direcao?.length) linhas.push(["Direção", filme.direcao.join(", ")]);
  if (filme.generos?.length) linhas.push(["Gênero", filme.generos.join(", ")]);
  if (filme.paises?.length) linhas.push(["País", filme.paises.join(", ")]);

  return (
    <div className="flex items-start gap-2.5">
      <Clapperboard className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{titulo.texto}</span>
          <CopyButton value={titulo.texto} />
          <span className="font-mono text-xs text-[var(--text-muted)]">{filme.imdbId}</span>
        </div>

        {titulo.ressalva ? (
          <p className="mt-1 text-xs text-[var(--pulse)]">{titulo.ressalva}</p>
        ) : null}

        {linhas.length ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {linhas.map(([rotulo, valor]) => (
              <div key={rotulo} className="contents">
                <dt className="text-xs text-[var(--text-muted)]">{rotulo}</dt>
                <dd className="min-w-0 text-xs text-[var(--text-primary)]">{valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {/* A procedência viaja com o dado, como nas outras bases da casa. */}
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Fonte: {filme.fonte}
          {filme.wikidataId ? ` · ${filme.wikidataId}` : ""}
        </p>
      </div>
    </div>
  );
}
