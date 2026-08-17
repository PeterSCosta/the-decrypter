import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfidenceBar } from "@/components/ui/confidence-bar";
import { CopyButton } from "@/components/ui/copy-button";
import { PonteCard } from "@/features/bridge/components/ponte-card";
import type { BridgeRow } from "@/features/bridge/types";
import { CepCard } from "@/features/cep/components/cep-card";
import type { CepHit } from "@/features/cep/types";
import type { MathReport } from "@/features/math/arith";
import { PosteCard } from "@/features/poste/components/poste-card";
import type { Poste } from "@/features/poste/types";
import type { CodeHit } from "@/features/reference/phone-codes";
import { StreetCard } from "@/features/street-guide/components/street-card";
import type { StreetRow } from "@/features/street-guide/types";
import { CornerDownRight } from "lucide-react";
import type { BarcodeHint } from "../engine/decoders/barcode";
import type { CaesarShiftRow } from "../engine/decoders/caesar-bruteforce";
import type { CipherDiskWheel } from "../engine/decoders/cipher-disk";
import type { DocResult } from "../engine/decoders/documents";
import type { IsbnHint } from "../engine/decoders/isbn";
import type { LocationData } from "../engine/decoders/location";
import type { NcmHint } from "../engine/decoders/ncm";
import type { ElementInfo } from "../engine/decoders/periodic-table";
import type { RegistroBrHint } from "../engine/decoders/registrobr";
import { realWords } from "../engine/score";
import type { DecoderCategory, ScoredCandidate } from "../engine/types";
import { chainValueOf } from "../trail";
import { BarcodeCard } from "./barcode-card";
import { CaesarTable } from "./caesar-table";
import { CodeListCard } from "./code-list-card";
import { DocumentCard } from "./document-card";
import { ElementsCard } from "./elements-card";
import { IsbnCard } from "./isbn-card";
import { MapCard } from "./map-card";
import { MathCard } from "./math-card";
import { NcmCard } from "./ncm-card";
import { RegistroBrCard } from "./registrobr-card";
import { WheelCard } from "./wheel-card";

const TONE: Record<DecoderCategory, BadgeProps["tone"]> = {
  encoding: "info",
  classical: "brand",
  transform: "neutral",
  lookup: "pulse",
};
const CAT_LABEL: Record<DecoderCategory, string> = {
  encoding: "codificação",
  classical: "cifra",
  transform: "transformação",
  lookup: "base de dados",
};

export function ResultCard({
  c,
  rank,
  onChain,
}: {
  c: ScoredCandidate;
  rank: number;
  /** Encadeia este resultado como a próxima entrada. */
  onChain?: (value: string, via: string) => void;
}) {
  // O selo responde à pergunta que trava as equipes: "acertei o meio do caminho?".
  // Vazio enquanto a wordlist não carregou — a bancada degrada em silêncio.
  // Só em saída TEXTUAL: num lookup o `output` é prosa ("… CNPJ inválido") e o
  // selo acenderia pela palavra do rótulo, não por uma camada resolvida.
  const isText = c.render == null || c.render === "text";
  const hits = isText ? realWords(c.output) : [];
  const chain = chainValueOf(c);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 px-4 py-2.5">
        <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">#{rank}</span>
        <span className="font-display text-sm text-[var(--text-primary)]">{c.decoderName}</span>
        {c.label ? (
          <span className="font-mono text-xs text-[var(--text-secondary)]">{c.label}</span>
        ) : null}
        {hits.length > 0 ? (
          <Badge tone="success" title={`Palavra(s) reconhecida(s): ${hits.join(", ")}`}>
            palavra real: {hits.slice(0, 2).join(" ")}
          </Badge>
        ) : null}
        <div className="ml-auto flex items-center gap-3">
          <Badge tone={TONE[c.category]}>{CAT_LABEL[c.category]}</Badge>
          <ConfidenceBar score={c.score} />
        </div>
      </div>

      <div className="p-3">
        {c.render === "street" ? (
          <div className="flex flex-col gap-2">
            {(c.data as StreetRow[]).map((row, i) => (
              <StreetCard key={`${row.codigo}-${row.bairro}-${i}`} row={row} />
            ))}
          </div>
        ) : c.render === "cep" ? (
          <div className="flex flex-col gap-2">
            {(c.data as CepHit[]).map((hit, i) => (
              <CepCard key={`${hit.cep}-${i}`} hit={hit} />
            ))}
          </div>
        ) : c.render === "caesar-table" ? (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <CaesarTable rows={c.data as CaesarShiftRow[]} />
            </div>
            <CopyButton value={c.output} />
          </div>
        ) : c.render === "documento" ? (
          <DocumentCard doc={c.data as DocResult} />
        ) : c.render === "poste" ? (
          <PosteCard poste={c.data as Poste} />
        ) : c.render === "ponte" ? (
          <PonteCard ponte={c.data as BridgeRow} />
        ) : c.render === "map" ? (
          <MapCard data={c.data as LocationData} />
        ) : c.render === "isbn" ? (
          <IsbnCard hint={c.data as IsbnHint} />
        ) : c.render === "ncm" ? (
          <NcmCard hint={c.data as NcmHint} />
        ) : c.render === "elements" ? (
          <ElementsCard elements={c.data as ElementInfo[]} />
        ) : c.render === "code-list" ? (
          <CodeListCard items={c.data as CodeHit[]} />
        ) : c.render === "barcode" ? (
          <BarcodeCard hint={c.data as BarcodeHint} />
        ) : c.render === "registrobr" ? (
          <RegistroBrCard hint={c.data as RegistroBrHint} />
        ) : c.render === "math" ? (
          <MathCard report={c.data as MathReport} onChain={onChain} />
        ) : c.render === "wheel" ? (
          <WheelCard wheel={c.data as CipherDiskWheel} onChain={onChain} />
        ) : (
          <div className="flex items-start gap-2">
            <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-sm text-[var(--text-primary)]">
              {c.output}
            </pre>
            <CopyButton value={c.output} />
          </div>
        )}
        {c.notes ? <p className="mt-2 text-xs text-[var(--text-muted)]">{c.notes}</p> : null}
        {onChain && chain ? (
          <button
            type="button"
            onClick={() => onChain(chain, c.decoderName)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--brand)] hover:text-[var(--text-primary)]"
          >
            <CornerDownRight className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
            usar como entrada
          </button>
        ) : null}
      </div>
    </Card>
  );
}
