import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Search } from "lucide-react";
import { useState } from "react";
import {
  QUADROS_PUBLICADOS,
  type VideoDoYoutube,
  baixarQuadro,
  consultarOembed,
  formatoDoVideo,
  idDoYoutube,
  urlDoPlayer,
  urlDoQuadro,
} from "../youtube";

/**
 * O painel de YouTube.
 *
 * Existe porque prova costuma vir como LINK, não como arquivo — e a bancada não
 * tinha onde colar um. O que ele entrega é o que o YouTube publica de propósito:
 * ficha do vídeo, os quadros que o CDN serve, e o player para pular ao segundo.
 *
 * O que ele NÃO faz está escrito na tela, não escondido: não baixa vídeo nem
 * áudio. É regra dos termos de uso deles, não limitação técnica.
 */
export function YoutubePainel({
  aoAnalisarQuadro,
}: {
  aoAnalisarQuadro?: (bytes: Uint8Array, nome: string) => void;
}) {
  const [entrada, setEntrada] = useState("");
  const [video, setVideo] = useState<VideoDoYoutube | null>(null);
  const [segundo, setSegundo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const buscar = async () => {
    const id = idDoYoutube(entrada);
    if (!id) return setErro("Não reconheci um vídeo do YouTube nesse texto.");
    setErro(null);
    setOcupado(true);
    try {
      const v = await consultarOembed(id);
      if (!v)
        setErro("O YouTube não devolveu ficha para esse vídeo — pode ser privado ou removido.");
      setVideo(v);
    } catch {
      setErro("Não consegui falar com o YouTube.");
    } finally {
      setOcupado(false);
    }
  };

  const analisar = async (chave: string) => {
    if (!video) return;
    const b = await baixarQuadro(video.id, chave);
    if (!b) return setErro(`O quadro "${chave}" não existe para este vídeo.`);
    aoAnalisarQuadro?.(b, `${video.id}-${chave}.jpg`);
  };

  const seg = Number(segundo.replace(",", ".")) || 0;

  return (
    <Card className="p-4">
      <h3 className="font-display text-sm text-[var(--text-primary)]">YouTube</h3>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void buscar()}
          placeholder="cole o link ou o ID do vídeo"
          className="h-9 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 font-mono text-xs text-[var(--text-primary)]"
        />
        <Button size="sm" variant="secondary" disabled={ocupado} onClick={buscar}>
          Consultar
        </Button>
      </div>

      {erro ? <p className="mt-2 text-sm text-[var(--color-pulse-600)]">{erro}</p> : null}

      {video ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="font-display text-sm text-[var(--text-primary)]">{video.titulo}</p>
            <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
              {video.canal} · {formatoDoVideo(video.largura, video.altura)}
              <CopyButton value={video.titulo} />
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
                Player — pular para o segundo
              </h4>
              <input
                type="text"
                value={segundo}
                onChange={(e) => setSegundo(e.target.value)}
                placeholder="0"
                className="h-7 w-20 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 font-mono text-xs text-[var(--text-primary)]"
              />
            </div>
            <iframe
              key={`${video.id}-${seg}`}
              title={video.titulo || "Vídeo do YouTube"}
              src={urlDoPlayer(video.id, seg)}
              allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
              className="mt-2 aspect-video w-full rounded-[var(--radius-md)]"
            />
          </div>

          <div>
            <h4 className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
              Quadros que o YouTube publica
            </h4>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              São QUATRO posições fixas — não dá para pedir um segundo arbitrário. Servem para OLHAR
              (texto na tela, placa, rosto). <strong>Não rode análise de bits neles</strong>: são
              recomprimidos pelo Google a partir de vídeo já com perdas, e qualquer detector de LSB
              devolve ruído com cara de sinal.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUADROS_PUBLICADOS.map((q) => (
                <div key={q.chave} className="space-y-1">
                  <img
                    src={urlDoQuadro(video.id, q.chave)}
                    alt={q.rotulo}
                    className="w-full rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]"
                  />
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[0.625rem] text-[var(--text-muted)]">
                      {q.rotulo}
                    </span>
                    {aoAnalisarQuadro ? (
                      <button
                        type="button"
                        title="Analisar este quadro"
                        onClick={() => void analisar(q.chave)}
                        className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <Search className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-3">
            <Badge tone="neutral">o que não dá</Badge>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Baixar o vídeo ou o áudio está fora — é regra dos termos de uso do YouTube, não
              limitação técnica. Quando os bytes forem necessários, peça o arquivo a quem publicou.
              Transcrição automática também não: o endpoint antigo de legendas foi desligado, e o da
              API oficial exige permissão de edição DO vídeo.
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
