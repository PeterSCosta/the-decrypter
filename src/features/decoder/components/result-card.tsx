import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfidenceBar } from "@/components/ui/confidence-bar";
import { CopyButton } from "@/components/ui/copy-button";
import { CepCard } from "@/features/cep/components/cep-card";
import type { CepHit } from "@/features/cep/types";
import type { CodeHit } from "@/features/reference/phone-codes";
import { StreetCard } from "@/features/street-guide/components/street-card";
import type { StreetRow } from "@/features/street-guide/types";
import type { BarcodeHint } from "../engine/decoders/barcode";
import type { CaesarShiftRow } from "../engine/decoders/caesar-bruteforce";
import type { DocResult } from "../engine/decoders/documents";
import type { IsbnHint } from "../engine/decoders/isbn";
import type { LocationData } from "../engine/decoders/location";
import type { NcmHint } from "../engine/decoders/ncm";
import type { ElementInfo } from "../engine/decoders/periodic-table";
import type { RegistroBrHint } from "../engine/decoders/registrobr";
import type { DecoderCategory, ScoredCandidate } from "../engine/types";
import { BarcodeCard } from "./barcode-card";
import { CaesarTable } from "./caesar-table";
import { CodeListCard } from "./code-list-card";
import { DocumentCard } from "./document-card";
import { ElementsCard } from "./elements-card";
import { IsbnCard } from "./isbn-card";
import { MapCard } from "./map-card";
import { NcmCard } from "./ncm-card";
import { RegistroBrCard } from "./registrobr-card";

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

export function ResultCard({ c, rank }: { c: ScoredCandidate; rank: number }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 px-4 py-2.5">
        <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">#{rank}</span>
        <span className="font-display text-sm text-[var(--text-primary)]">{c.decoderName}</span>
        {c.label ? (
          <span className="font-mono text-xs text-[var(--text-secondary)]">{c.label}</span>
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
        ) : (
          <div className="flex items-start gap-2">
            <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-sm text-[var(--text-primary)]">
              {c.output}
            </pre>
            <CopyButton value={c.output} />
          </div>
        )}
        {c.notes ? <p className="mt-2 text-xs text-[var(--text-muted)]">{c.notes}</p> : null}
      </div>
    </Card>
  );
}
