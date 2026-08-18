import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { MapCard } from "@/features/decoder/components/map-card";
import { detectLocation, detectWhat3Words, prepararDeteccao } from "@/features/location/formats";
import { ArrowRight, Compass, Database, ExternalLink, Search } from "lucide-react";
import { useState } from "react";
import { BASES_GEO, GRUPOS_GEO, LINKS_GEO } from "../formatos";

/**
 * Geolocalização: o mapa do assunto, e uma caixa que responde "que formato é
 * este?".
 *
 * ── POR QUE UMA ABA, SE O DECODIFICADOR JÁ RECONHECE TUDO ISTO ──────────────
 * Porque as duas perguntas são diferentes. No Decodificador a pergunta é "o que
 * este texto quer dizer", e a resposta chega junto com mais oitenta hipóteses.
 * Aqui a pergunta é "que sistemas existem, como cada um se parece e o que a
 * bancada faz com um código pela metade" — e essa não se responde numa lista
 * ordenada por nota. A caixa de identificar é a ponte: ela nomeia o formato, e
 * o "abrir no Decodificador" leva ao card completo, com mapa e frota.
 */
export function GeoPanel({
  aoDecodificar,
  aoAbrirAba,
}: {
  /** Manda o texto para a bancada, que é onde ele vira card com mapa. */
  aoDecodificar?: (texto: string) => void;
  /** Abre outra aba (Triangulação, Postes, Frota). */
  aoAbrirAba?: (aba: "triangulate" | "postes" | "fleet" | "decoder") => void;
}) {
  const [texto, setTexto] = useState("");
  const achado = texto.trim() ? detectLocation(texto) : null;
  /**
   * O what3words não sai do `detectLocation` — ele não tem como sair.
   *
   * Três palavras não viram coordenada por conta: quem resolve é a API, e o
   * `detectLocation` é síncrono. A aba listava o formato e devolvia "não
   * reconheci" para o próprio exemplo dela. Aqui a forma é detectada e o
   * `MapCard` resolve, que é exatamente o que ele já faz no Decodificador.
   */
  const w3w = !achado && texto.trim() ? detectWhat3Words(texto) : null;

  /**
   * Clicar no exemplo tem de acordar o H3 igual a digitar.
   *
   * O H3 mora numa lib pesada que entra por `import()`. O campo chama
   * `prepararDeteccao` a cada tecla, mas o botão de exemplo escrevia direto no
   * estado — então clicar no exemplo de H3 mostrava "não reconheci" e CONTINUAVA
   * assim até a pessoa digitar outra tecla.
   */
  const usarExemplo = (entrada: string) => {
    setTexto(entrada);
    void prepararDeteccao(entrada);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">Geolocalização</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Tudo o que a bancada entende de coordenada num lugar só: os formatos, como cada um se
          parece, o que fazer com um código pela metade e onde conferir por fora.
        </p>
      </div>

      {/* Identificar — o único pedaço interativo, e de propósito. */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Compass className="h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
          <h3 className="font-display text-sm text-[var(--text-primary)]">Que formato é este?</h3>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={texto}
            // O H3 mora numa lib pesada que entra por `import()`: sem este
            // aviso, o primeiro código H3 colado não é reconhecido — e a pessoa
            // conclui que a bancada não sabe, quando ela só não tinha chegado.
            onChange={(e) => {
              setTexto(e.target.value);
              void prepararDeteccao(e.target.value);
            }}
            placeholder="cole uma coordenada, um Plus Code, um MGRS, um geohash…"
            aria-label="Texto a identificar"
            className="pl-9 font-mono"
          />
        </div>

        {texto.trim() ? (
          achado ? (
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{achado.format}</Badge>
                <span className="font-mono text-sm text-[var(--text-primary)]">
                  {achado.lat.toFixed(6)}, {achado.lng.toFixed(6)}
                </span>
                <CopyButton value={`${achado.lat.toFixed(6)}, ${achado.lng.toFixed(6)}`} />
                {aoDecodificar ? (
                  <Button size="sm" variant="ghost" onClick={() => aoDecodificar(texto.trim())}>
                    Abrir no Decodificador <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              <div className="mt-3">
                {/* `key` pela ENTRADA, e não é detalhe: o `MapCard` guarda a
                    coordenada em estado interno, e sem remontar ele mostrava o
                    ponto do texto ANTERIOR — medido aqui, um what3words
                    aparecendo com a coordenada do Maidenhead de antes. */}
                <MapCard
                  key={texto}
                  data={{
                    lat: achado.lat,
                    lng: achado.lng,
                    label: achado.format,
                    format: achado.format,
                  }}
                />
              </div>
            </div>
          ) : w3w ? (
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">what3words</Badge>
                <span className="font-mono text-sm text-[var(--text-primary)]">{`///${w3w}`}</span>
              </div>
              <div className="mt-3">
                {/* Quem resolve é o card, com a chave que vive no servidor. */}
                <MapCard
                  data={{ lat: null, lng: null, label: `///${w3w}`, format: "what3words", w3w }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Não reconheci nenhum dos formatos abaixo. Vale conferir se falta o prefixo da cidade —
              os atalhos locais estão marcados em cada formato.
            </p>
          )
        ) : null}
      </Card>

      {GRUPOS_GEO.map((g) => (
        <Card key={g.id} className="overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] px-4 py-2.5">
            <p className="font-display text-sm text-[var(--text-primary)]">{g.titulo}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{g.intro}</p>
          </div>
          {g.formatos.map((f) => (
            <div
              key={f.id}
              className="border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-display text-sm text-[var(--text-primary)]">{f.nome}</span>
                {f.link ? (
                  <a
                    href={f.link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--brand-strong)] hover:underline"
                  >
                    {f.link.rotulo} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{f.oQueE}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Como reconhecer: {f.cara}</p>

              <button
                type="button"
                onClick={() =>
                  f.resolveEm === "decodificador"
                    ? aoDecodificar?.(f.exemplo.entrada)
                    : usarExemplo(f.exemplo.entrada)
                }
                className="mt-2 flex w-full flex-wrap items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-left hover:bg-[var(--surface-sunken)]/70"
                title={
                  f.resolveEm === "decodificador"
                    ? "Abrir este exemplo no Decodificador"
                    : "Usar este exemplo na caixa acima"
                }
              >
                <span className="font-mono text-xs text-[var(--text-primary)]">
                  {f.exemplo.entrada}
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-secondary)]">{f.exemplo.saida}</span>
              </button>

              {f.resolveEm === "decodificador" ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Este não é coordenada disfarçada: é número de cadastro, e quem responde é a
                  consulta do <strong>Decodificador</strong> — a caixa acima não o reconhece.
                </p>
              ) : null}
              {f.atalho ? (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  <span className="text-[var(--brand-strong)]">Atalho local:</span> {f.atalho}
                </p>
              ) : null}
              {f.precisao ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">{f.precisao}</p>
              ) : null}
            </div>
          ))}
        </Card>
      ))}

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] px-4 py-2.5">
          <p className="font-display text-sm text-[var(--text-primary)]">
            Endereço vira ponto: as bases do acervo
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Nem toda coordenada chega como código. Estas respondem a partir de um número ou de um
            nome — e todas plotam no mapa.
          </p>
        </div>
        {BASES_GEO.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
          >
            <Database className="h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--text-primary)]">{b.nome}</p>
              <p className="text-xs text-[var(--text-muted)]">{b.resolve}</p>
            </div>
            {aoAbrirAba ? (
              <Button size="sm" variant="ghost" onClick={() => aoAbrirAba(b.aba)}>
                {b.aba === "decoder" ? "No Decodificador" : "Abrir"}
              </Button>
            ) : null}
          </div>
        ))}
      </Card>

      <Card className="p-4">
        <p className="font-display text-sm text-[var(--text-primary)]">
          As outras ferramentas de mapa
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => aoAbrirAba?.("triangulate")}>
            Triangulação
          </Button>
          <Button size="sm" variant="secondary" onClick={() => aoAbrirAba?.("postes")}>
            Postes
          </Button>
          <Button size="sm" variant="secondary" onClick={() => aoAbrirAba?.("fleet")}>
            Frota
          </Button>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          A Triangulação cruza distâncias a partir de vários pontos (e aceita ponto arrastado no
          mapa); os Postes acham o ponto pela plaqueta; a Frota mostra quem está mais perto de uma
          coordenada — e por isso ela aparece embutida em todo card de localização.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] px-4 py-2.5">
          <p className="font-display text-sm text-[var(--text-primary)]">Onde conferir por fora</p>
        </div>
        {LINKS_GEO.map((l) => (
          <div
            key={l.url}
            className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--text-primary)]">{l.nome}</p>
              <p className="text-xs text-[var(--text-muted)]">{l.oQue}</p>
            </div>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--brand-strong)] hover:underline"
            >
              abrir <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
      </Card>
    </div>
  );
}
