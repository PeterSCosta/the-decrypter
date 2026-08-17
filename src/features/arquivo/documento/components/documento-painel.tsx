import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Wand2 } from "lucide-react";
import { useMemo } from "react";
import { ehOoxml, estranhasNoOoxml, lerZip } from "../zip";

const tamanho = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : n >= 1024
      ? `${Math.round(n / 1024)} KB`
      : `${n} B`;

/**
 * O painel de documento — o CATÁLOGO de um ZIP.
 *
 * Docx, xlsx, pptx, odt, epub e jar são todos ZIP. Descompactar exigiria um
 * deflate; listar o catálogo não exige nada, e é o catálogo que denuncia:
 * comentário do arquivo, comentário por entrada, nome divergente entre o
 * cabeçalho local e o central, e a entrada que não pertence à estrutura.
 */
export function DocumentoPainel({
  bytes,
  onDecodificador,
}: {
  bytes: Uint8Array;
  onDecodificador?: (texto: string) => void;
}) {
  const zip = useMemo(() => lerZip(bytes), [bytes]);
  if (!zip) return null;

  const tipo = ehOoxml(zip);
  const estranhas = tipo ? estranhasNoOoxml(zip) : [];

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-sm text-[var(--text-primary)]">
          Dentro do arquivo compactado
        </h3>
        <Badge tone="neutral">{zip.entradas.length} entradas</Badge>
        {tipo ? <Badge tone="info">documento do {tipo}</Badge> : null}
      </div>

      {zip.observacoes.map((o) => (
        <p key={o} className="mt-2 text-sm text-[var(--text-primary)]">
          {o}
        </p>
      ))}

      {zip.comentario.trim() ? (
        <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--text-primary)]">
            {zip.comentario}
          </code>
          <CopyButton value={zip.comentario} />
          {onDecodificador ? (
            <button
              type="button"
              title="Mandar ao Decodificador"
              onClick={() => onDecodificador(zip.comentario)}
              className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Wand2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      {estranhas.length ? (
        <p className="mt-3 text-sm text-[var(--text-primary)]">
          <strong>{estranhas.length} entrada(s) fora da estrutura padrão</strong> deste documento —
          continua abrindo normalmente e ninguém repara: {estranhas.map((e) => e.nome).join(", ")}
        </p>
      ) : null}

      <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {zip.entradas.map((e) => (
          <li
            key={`${e.nome}-${e.offsetLocal}`}
            className="flex flex-wrap items-baseline gap-2 rounded px-2 py-1 hover:bg-[var(--surface-sunken)]"
          >
            <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--text-primary)]">
              {e.nome}
            </code>
            {e.cifrada ? <Badge tone="pulse">com senha</Badge> : null}
            {e.nomeDivergente ? <Badge tone="pulse">local diz “{e.nomeDivergente}”</Badge> : null}
            {e.comentario.trim() ? <Badge tone="info">tem comentário</Badge> : null}
            <span className="font-mono text-[0.6875rem] text-[var(--text-muted)]">
              {tamanho(e.tamanho)} · {e.metodo}
              {e.modificado ? ` · ${e.modificado}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
