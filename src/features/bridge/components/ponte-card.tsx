import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { FleetLocationView } from "@/features/fleet/components/fleet-location-view";
import { ShareLocationButton } from "@/features/location/components/share-location-button";
import { type BridgeRow, TIPO_LABEL } from "../types";

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="truncate font-mono text-sm text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

function Etiquetas({ label, itens }: { label: string; itens: string[] }) {
  if (!itens.length) return null;
  return (
    <div className="col-span-2 min-w-0 sm:col-span-3">
      <dt className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {itens.map((i) => (
          <span
            key={i}
            className="rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]"
          >
            {i}
          </span>
        ))}
      </dd>
    </div>
  );
}

/**
 * Ficha de uma ponte, passarela ou viaduto.
 *
 * Molde do `PosteCard`, com uma diferença que o dado impõe: **metade das linhas
 * não tem geometria**. Uma ponte que só existe na lei (denominada, em obra, ou
 * que o OSM não mapeou) é resposta legítima — o card mostra o que sabe e
 * simplesmente omite o mapa, em vez de esconder a estrutura inteira.
 */
export function PonteCard({ ponte, mapa = true }: { ponte: BridgeRow; mapa?: boolean }) {
  const tipo = TIPO_LABEL[ponte.tipo] ?? "Estrutura";
  const temGeo = ponte.lat != null && ponte.lng != null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base text-[var(--text-primary)]">{ponte.nome}</h3>
          {ponte.nomeOsm && ponte.nomeOsm !== ponte.nome ? (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              No OpenStreetMap: {ponte.nomeOsm}
            </p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center rounded-md bg-[var(--surface-sunken)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
          {tipo}
        </span>
      </div>

      {ponte.situacao ? (
        <p className="mb-3 rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-2 py-1 text-xs text-[var(--text-secondary)]">
          {ponte.situacao}
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {ponte.lei ? <Campo label="Lei" value={ponte.lei} /> : null}
        {ponte.dataLei ? <Campo label="Data da lei" value={ponte.dataLei} /> : null}
        {ponte.via ? <Campo label="Via" value={ponte.via} /> : null}
        {ponte.comprimento != null ? (
          <Campo label="Comprimento" value={`${Math.round(ponte.comprimento)} m`} />
        ) : null}
        {ponte.material ? <Campo label="Material" value={ponte.material} /> : null}
        {ponte.pistas != null ? <Campo label="Pistas" value={String(ponte.pistas)} /> : null}
        <Etiquetas label="Transpõe" itens={ponte.transpoe} />
        <Etiquetas label="Bairro" itens={ponte.bairros} />
        <Etiquetas label="Apelidos" itens={ponte.apelidos} />
      </dl>

      {ponte.ementa ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{ponte.ementa}</p>
      ) : null}

      {ponte.nota ? (
        <p className="mt-2 text-xs text-[var(--text-muted)] italic">{ponte.nota}</p>
      ) : null}

      {temGeo ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ShareLocationButton
            lat={ponte.lat as number}
            lng={ponte.lng as number}
            label={ponte.nome}
          />
          <code className="font-mono text-xs text-[var(--text-muted)]">
            {(ponte.lat as number).toFixed(6)}, {(ponte.lng as number).toFixed(6)}
          </code>
          <CopyButton value={`${ponte.lat}, ${ponte.lng}`} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Sem geometria mapeada — esta estrutura vem da lei de denominação.
        </p>
      )}

      {ponte.urlLei ? (
        <a
          href={ponte.urlLei}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-[var(--brand)] underline underline-offset-2"
        >
          Texto da lei
        </a>
      ) : null}

      {mapa && temGeo ? (
        <div className="mt-3">
          <FleetLocationView
            point={{ lat: ponte.lat as number, lng: ponte.lng as number }}
            label={ponte.nome}
          />
        </div>
      ) : null}
    </Card>
  );
}
