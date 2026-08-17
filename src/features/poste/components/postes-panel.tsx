import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Lightbulb, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buscarPostes } from "../api";
import { type Poste, enderecoDoPoste } from "../types";
import { PosteCard } from "./poste-card";
import { PostesMap } from "./postes-map";

/**
 * Aba dos postes: busca por plaqueta, rua ou bairro, com o mapa carregando pelo
 * viewport. A base tem 45.285 pontos e mora na API — nada disso desce para o
 * navegador de uma vez.
 */
export function PostesPanel() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Poste[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<Poste | null>(null);
  /**
   * A ficha fica abaixo do mapa; sem rolar até ela, clicar num marcador parecia
   * não fazer nada em tela pequena — o popup abria e a ficha ficava fora de vista.
   */
  const fichaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selecionado) fichaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selecionado]);
  const debQ = useDebouncedValue(q, 300);

  useEffect(() => {
    const termo = debQ.trim();
    if (termo.length < 2) {
      setHits(null);
      return;
    }
    let vivo = true;
    setBuscando(true);
    buscarPostes(termo)
      .then((r) => {
        if (!vivo) return;
        setHits(r.hits);
        setErro(null);
      })
      .catch((e) => vivo && setErro((e as Error).message))
      .finally(() => vivo && setBuscando(false));
    return () => {
      vivo = false;
    };
  }, [debQ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">
          Postes — iluminação pública
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          45.285 pontos de Blumenau, com <strong>plaqueta</strong>, coordenada, rua, bairro e
          luminária. Busque pelo número da plaqueta, por rua ou por bairro — ou navegue no mapa.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="65299 · Rua XV de Novembro · Itoupava Central"
          aria-label="Buscar poste"
          className="pl-9"
        />
        {buscando ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--text-muted)]" />
        ) : null}
      </div>

      {erro ? (
        <Card className="border-[var(--color-pulse-600)] p-3">
          <p className="text-sm text-[var(--color-pulse-600)]">{erro}</p>
        </Card>
      ) : null}

      <PostesMap selecionado={selecionado} aoSelecionar={setSelecionado} />

      {selecionado ? (
        <div ref={fichaRef}>
          <PosteCard poste={selecionado} mapa={false} />
        </div>
      ) : null}

      {hits !== null ? (
        <Card className="overflow-hidden">
          <p className="border-b border-[var(--border-subtle)] px-4 py-2.5 font-display text-sm text-[var(--text-primary)]">
            {hits.length === 0
              ? "Nada encontrado"
              : `${hits.length} resultado${hits.length > 1 ? "s" : ""}`}
          </p>
          {hits.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelecionado(p)}
              className="flex w-full items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 text-left last:border-0 hover:bg-[var(--surface-sunken)]"
            >
              <Lightbulb className="h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
              <span className="w-16 shrink-0 font-mono text-sm text-[var(--text-primary)]">
                {p.plaqueta ?? `#${p.id}`}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]">
                {enderecoDoPoste(p)}
              </span>
              <span className="hidden shrink-0 text-xs text-[var(--text-muted)] sm:inline">
                {p.bairro ?? ""}
              </span>
            </button>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
