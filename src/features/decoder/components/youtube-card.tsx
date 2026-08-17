import { CopyButton } from "@/components/ui/copy-button";
import {
  type VideoDoYoutube,
  consultarOembed,
  formatoDoVideo,
  urlDoQuadro,
} from "@/features/arquivo/youtube/youtube";
import { ExternalLink, Loader2, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import type { YoutubeHint } from "../engine/decoders/youtube";

/**
 * Confirma o ID no oEmbed do YouTube e mostra a ficha.
 *
 * A confirmação é o ponto: onze caracteres em base64url também é a forma de
 * meio pedaço de base64, e sem esta chamada o card diria "pode ser um vídeo"
 * para qualquer coisa. Com ela, ou aparece o título — e aí não há dúvida — ou
 * aparece "não existe vídeo com esse ID", que também é resposta.
 *
 * O oEmbed é público, sem chave e com CORS liberado; nada é baixado do vídeo.
 */
export function YoutubeCard({ hint }: { hint: YoutubeHint }) {
  const [video, setVideo] = useState<VideoDoYoutube | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "nao-existe" | "erro">("carregando");

  useEffect(() => {
    let vivo = true;
    setEstado("carregando");
    setVideo(null);
    consultarOembed(hint.id)
      .then((v) => {
        if (!vivo) return;
        setVideo(v);
        setEstado(v ? "ok" : "nao-existe");
      })
      .catch(() => vivo && setEstado("erro"));
    return () => {
      vivo = false;
    };
  }, [hint.id]);

  if (estado === "carregando") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin" /> Confirmando o vídeo {hint.id}…
      </p>
    );
  }
  if (estado === "nao-existe") {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        Tem a forma de um ID do YouTube, mas não existe vídeo público com <code>{hint.id}</code> —
        pode ser privado, removido, ou não ser um ID.
      </p>
    );
  }
  if (estado === "erro" || !video) {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        Não consegui falar com o YouTube para confirmar <code>{hint.id}</code>.
      </p>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <img
        src={urlDoQuadro(video.id, "mqdefault")}
        alt={video.titulo}
        className="h-14 w-24 shrink-0 rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--text-primary)]">{video.titulo}</p>
        <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
          {video.canal} · {formatoDoVideo(video.largura, video.altura)} · {video.id}
          <CopyButton value={video.id} />
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <a
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--brand-strong)] hover:underline"
          >
            abrir no YouTube <ExternalLink className="h-3 w-3" />
          </a>
          {/* A aba Arquivo é onde este vídeo rende: quadros publicados, player
              com marcas de segundo e a ficha inteira. */}
          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Youtube className="h-3 w-3" /> a aba Arquivo tem os quadros e o player
          </span>
        </div>
      </div>
    </div>
  );
}
