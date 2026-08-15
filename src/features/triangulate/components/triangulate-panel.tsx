import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import type { GeoPoint } from "@/features/location/formats";
import { cn } from "@/lib/cn";
import { Loader2, MapPin, Plus, Route, Sparkles, Trash2, X } from "lucide-react";
import { formataArea, formataDistancia } from "../geometry";
import { useTriangulate } from "../use-triangulate";
import { PointsMap } from "./points-map";

const dd = (p: GeoPoint) => `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;

const CORES = {
  centroide: "#14161D",
  circuncentro: "#FF5436",
  incentro: "#7BA60B",
  mediana: "#2563eb",
} as const;

const ROTULOS = {
  centroide: "Centroide",
  circuncentro: "Equidistante",
  incentro: "Incentro",
  mediana: "Menor soma",
} as const;

function LinhaCentro({
  chave,
  ponto,
  descricao,
}: {
  chave: keyof typeof ROTULOS;
  ponto: GeoPoint;
  descricao: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0">
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: CORES[chave] }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{ROTULOS[chave]}</p>
        <p className="text-xs text-[var(--text-secondary)]">{descricao}</p>
      </div>
      <div className="flex items-center gap-1">
        <code className="font-mono text-xs text-[var(--text-primary)]">{dd(ponto)}</code>
        <CopyButton value={dd(ponto)} />
      </div>
    </div>
  );
}

export function TriangulatePanel() {
  const {
    entradas,
    troca,
    adiciona,
    remove,
    limpa,
    resolver,
    otimizar,
    carregando,
    pontos,
    falhas,
    centros,
    triangulo,
    rota,
    desenharRota,
    setDesenharRota,
    fechar,
    setFechar,
  } = useTriangulate();

  const preenchidas = entradas.filter((e) => e.trim()).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">
          Triangulação — centro e rota
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Um ponto por campo: <strong>coordenada</strong> em qualquer formato da bancada (DD, DMS,
          Plus Code, MGRS, geohash…), <strong>CEP</strong>, <strong>endereço com número</strong>,{" "}
          <strong>nome de rua</strong> ou <strong>nome de ponte</strong>. Com três pontos sai também
          o equidistante e o triângulo; com qualquer quantidade, a rota na ordem digitada.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {entradas.map((valor, i) => (
          // A posição É a identidade aqui: a lista é ordenada e reordenável, e
          // usar o texto como chave faria dois campos vazios colidirem.
          // biome-ignore lint/suspicious/noArrayIndexKey: a ordem é o dado
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center font-mono text-sm text-[var(--text-muted)]">
              {i + 1}
            </span>
            <Input
              value={valor}
              onChange={(e) => troca(i, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && resolver()}
              placeholder={
                i === 0
                  ? "-26.9194, -49.0661"
                  : i === 1
                    ? "Rua XV de Novembro, 1200"
                    : "Ponte de Ferro"
              }
              aria-label={`Ponto ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={entradas.length <= 2}
              aria-label={`Remover ponto ${i + 1}`}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={resolver} disabled={preenchidas < 2 || carregando}>
          {carregando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          Localizar
        </Button>
        <Button variant="secondary" size="sm" onClick={adiciona}>
          <Plus className="h-4 w-4" /> Ponto
        </Button>
        {pontos.length > 2 ? (
          <Button variant="secondary" size="sm" onClick={otimizar}>
            <Sparkles className="h-4 w-4" /> Ordenar pela rota mais curta
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={limpa}>
          <Trash2 className="h-4 w-4" /> Limpar
        </Button>
      </div>

      {falhas.length ? (
        <Card className="border-[var(--color-pulse-600)] p-4">
          <p className="text-sm text-[var(--color-pulse-600)]">
            Não localizei {falhas.length === 1 ? "esta entrada" : "estas entradas"}:{" "}
            {falhas.map((f) => `"${f.entrada}"`).join(", ")}. Tente com a cidade junto, com número
            de porta, ou cole a coordenada.
          </p>
        </Card>
      ) : null}

      {pontos.length >= 2 ? (
        <>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={desenharRota}
                onChange={(e) => setDesenharRota(e.target.checked)}
                className="accent-[var(--brand)]"
              />
              Desenhar a rota
            </label>
            {pontos.length > 2 ? (
              <label className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={fechar}
                  onChange={(e) => setFechar(e.target.checked)}
                  className="accent-[var(--brand)]"
                />
                Fechar o circuito
              </label>
            ) : null}
          </div>

          <PointsMap
            pontos={pontos}
            centros={(Object.keys(ROTULOS) as (keyof typeof ROTULOS)[]).flatMap((k) => {
              const ponto = centros[k];
              return ponto ? [{ nome: ROTULOS[k] as string, ponto, cor: CORES[k] as string }] : [];
            })}
            rota={desenharRota}
            fechar={fechar}
            triangulo={pontos.length === 3}
          />

          <Card className="overflow-hidden">
            <p className="border-b border-[var(--border-subtle)] px-4 py-2.5 font-display text-sm text-[var(--text-primary)]">
              Centros
            </p>
            {centros.centroide ? (
              <LinhaCentro
                chave="centroide"
                ponto={centros.centroide}
                descricao="Média das posições — o centro de massa dos pontos."
              />
            ) : null}
            {centros.circuncentro ? (
              <LinhaCentro
                chave="circuncentro"
                ponto={centros.circuncentro}
                descricao="À mesma distância dos três — o centro da triangulação."
              />
            ) : null}
            {centros.incentro ? (
              <LinhaCentro
                chave="incentro"
                ponto={centros.incentro}
                descricao="À mesma distância dos três lados do triângulo."
              />
            ) : null}
            {centros.mediana ? (
              <LinhaCentro
                chave="mediana"
                ponto={centros.mediana}
                descricao="Menor soma de distâncias — o encontro mais curto para todos."
              />
            ) : null}
            {pontos.length === 3 && !centros.circuncentro ? (
              <p className="px-4 py-3 text-xs text-[var(--text-muted)]">
                Os três pontos estão praticamente alinhados: não há ponto equidistante entre eles.
              </p>
            ) : null}
          </Card>

          <Card className="overflow-hidden">
            <p className="border-b border-[var(--border-subtle)] px-4 py-2.5 font-display text-sm text-[var(--text-primary)]">
              Pontos
            </p>
            {pontos.map((p, i) => (
              <div
                key={`${p.entrada}-${i}`}
                className="flex items-start gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] font-mono text-[11px] font-semibold text-[var(--brand-ink)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--text-primary)]">{p.rotulo}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {p.origem} · {p.detalhe}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <code className="font-mono text-xs text-[var(--text-secondary)]">{dd(p)}</code>
                  <CopyButton value={dd(p)} />
                </div>
              </div>
            ))}
          </Card>

          {rota?.pernas.length ? (
            <Card className="overflow-hidden">
              <p className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5 font-display text-sm text-[var(--text-primary)]">
                <Route className="h-4 w-4 text-[var(--text-muted)]" /> Rota na ordem digitada
              </p>
              {rota.pernas.map((perna) => (
                <div
                  key={`${perna.de}-${perna.para}`}
                  className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 text-sm last:border-0"
                >
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {perna.de + 1} → {perna.para + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
                    {pontos[perna.de].rotulo} → {pontos[perna.para].rotulo}
                  </span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {perna.direcao} {Math.round(perna.rumo)}°
                  </span>
                  <span className="w-20 text-right font-mono text-[var(--text-primary)]">
                    {formataDistancia(perna.metros)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-[var(--surface-sunken)] px-4 py-2.5 text-sm">
                <span className="text-[var(--text-secondary)]">
                  Total{fechar && pontos.length > 2 ? " (circuito fechado)" : ""}
                </span>
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  {formataDistancia(fechar && pontos.length > 2 ? rota.totalFechado : rota.total)}
                </span>
              </div>
              <p className="px-4 py-2 text-xs text-[var(--text-muted)]">
                Distâncias em linha reta (haversine), não pela malha viária.
              </p>
            </Card>
          ) : null}

          {triangulo ? (
            <Card className="p-4">
              <p className="font-display text-sm text-[var(--text-primary)]">Triângulo</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                {[
                  ["Perímetro", formataDistancia(triangulo.perimetro)],
                  ["Área", formataArea(triangulo.area)],
                  ["Lados", triangulo.lados.map((l) => formataDistancia(l)).join(" · ")],
                  ["Ângulos", triangulo.angulos.map((a) => `${a.toFixed(1)}°`).join(" · ")],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className={cn(rotulo === "Lados" && "col-span-2")}>
                    <dt className="text-xs text-[var(--text-muted)]">{rotulo}</dt>
                    <dd className="font-mono text-[var(--text-primary)]">{valor}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
