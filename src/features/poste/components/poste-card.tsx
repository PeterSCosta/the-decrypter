import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { FleetLocationView } from "@/features/fleet/components/fleet-location-view";
import { ShareLocationButton } from "@/features/location/components/share-location-button";
import { type Poste, enderecoDoPoste, partesDaEstrutura } from "../types";

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="truncate font-mono text-sm text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

/** "01/09/2022 13:18" a partir do ISO que a API devolve. */
function data(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

/**
 * Ficha de um poste.
 *
 * Molde do `StreetCard` — grade de campos + mapa — mas sem o botão "ver no
 * mapa" nem o estado de carregando que ele precisa: o poste já traz `lat`/`lng`
 * no próprio dado, então o mapa renderiza direto.
 */
export function PosteCard({
  poste,
  /**
   * O mapa embutido é opcional porque o contexto decide: no card do
   * decodificador ele é a única forma de ver onde o poste está; na aba de
   * Postes o mapa principal está logo acima, e um segundo Leaflet na mesma tela
   * é peso e confusão.
   */
  mapa = true,
}: { poste: Poste; mapa?: boolean }) {
  const partes = partesDaEstrutura(poste.estrutura);
  const rotulo = poste.plaqueta ? `Poste ${poste.plaqueta}` : `Poste #${poste.id}`;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-base text-[var(--text-primary)]">
          {enderecoDoPoste(poste) || rotulo}
        </h3>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--surface-sunken)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
          {poste.plaqueta ?? `#${poste.id}`}
          {poste.plaqueta ? <CopyButton value={poste.plaqueta} /> : null}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Campo label="Bairro" value={poste.bairro ?? "—"} />
        <Campo label="Situação" value={poste.status ?? "—"} />
        <Campo
          label="Pontos de luz"
          value={poste.pontosLuminosos != null ? String(poste.pontosLuminosos) : "—"}
        />
        <Campo label="Instalação" value={data(poste.instalacao)} />
        {poste.distanciaMetros != null ? (
          <Campo label="Distância" value={`${Math.round(poste.distanciaMetros)} m`} />
        ) : null}
        {partes.length ? (
          <div className="col-span-2 min-w-0 sm:col-span-3">
            <dt className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
              Luminária
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {partes.map((parte) => (
                <span
                  key={parte}
                  className="rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]"
                >
                  {parte}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ShareLocationButton lat={poste.lat} lng={poste.lng} label={rotulo} />
        <code className="font-mono text-xs text-[var(--text-muted)]">
          {poste.lat.toFixed(6)}, {poste.lng.toFixed(6)}
        </code>
        <CopyButton value={`${poste.lat}, ${poste.lng}`} />
      </div>

      {mapa ? (
        <div className="mt-3">
          <FleetLocationView point={{ lat: poste.lat, lng: poste.lng }} label={rotulo} />
        </div>
      ) : null}
    </Card>
  );
}
