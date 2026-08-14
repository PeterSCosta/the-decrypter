import { CopyButton } from "@/components/ui/copy-button";
import type { CipherDiskWheel } from "../engine/decoders/cipher-disk";

/**
 * Roda alfabética de 26 setores — a "cifra de disco" das provas.
 *
 * O desenho não é enfeite: a prova entrega um disco físico com uma linha
 * vermelha marcando a origem, e a única forma de conferir a leitura é ver a
 * roda montada. Sem este card, o decoder viraria três candidatos numéricos
 * redundantes e indistinguíveis do `a1z26`.
 */
const SIZE = 200;
const R_OUT = 92;
const R_IN = 66;
const CX = SIZE / 2;
const CY = SIZE / 2;

/** Ângulo do centro do setor `slot`, em radianos, com 0 no topo (linha vermelha). */
function angleOf(slot: number, count: number, direction: "cw" | "ccw"): number {
  const step = (2 * Math.PI) / count;
  const a = (slot + 0.5) * step;
  return direction === "cw" ? a - Math.PI / 2 : -a - Math.PI / 2;
}

export function WheelCard({
  wheel,
  onChain,
}: {
  wheel: CipherDiskWheel;
  onChain?: (value: string, via: string) => void;
}) {
  const hit = new Set(wheel.reading.map((r) => r.slot));
  const answer = wheel.reading.map((r) => r.letter).join("");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-44 w-44 shrink-0 sm:mx-0"
        role="img"
        aria-label={`Roda de ${wheel.sectorCount} setores, origem ${wheel.origin}, sentido ${
          wheel.direction === "cw" ? "horário" : "anti-horário"
        }`}
      >
        <title>
          Roda de {wheel.sectorCount} setores — origem {wheel.origin}
        </title>
        <circle
          cx={CX}
          cy={CY}
          r={R_OUT}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="1"
        />
        <circle
          cx={CX}
          cy={CY}
          r={R_IN}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="1"
        />

        {/* A linha vermelha é a marca de origem do disco físico. */}
        <line
          x1={CX}
          y1={CY - R_OUT - 6}
          x2={CX}
          y2={CY - R_IN + 4}
          stroke="var(--color-pulse-500, #ff5436)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {wheel.sectors.map((s) => {
          const a = angleOf(s.slot, wheel.sectorCount, wheel.direction);
          const r = (R_OUT + R_IN) / 2;
          const marked = hit.has(s.slot);
          return (
            <g key={s.slot}>
              {marked ? (
                <circle
                  cx={CX + r * Math.cos(a)}
                  cy={CY + r * Math.sin(a)}
                  r="9"
                  fill="var(--brand)"
                />
              ) : null}
              <text
                x={CX + r * Math.cos(a)}
                y={CY + r * Math.sin(a)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fontFamily="var(--font-mono, monospace)"
                fill={marked ? "var(--brand-ink)" : "var(--text-muted)"}
                fontWeight={marked ? 700 : 400}
              >
                {s.letter}
              </text>
            </g>
          );
        })}

        <text
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="20"
          fontFamily="var(--font-mono, monospace)"
          fontWeight="700"
          fill="var(--text-primary)"
        >
          {answer.slice(0, 12)}
        </text>
      </svg>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-sm text-[var(--text-primary)]">
            {answer}
          </pre>
          <CopyButton value={answer} />
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          origem <span className="font-mono text-[var(--text-secondary)]">{wheel.origin}</span> ·
          sentido {wheel.direction === "cw" ? "horário" : "anti-horário"} · primeira casa ={" "}
          <span className="font-mono text-[var(--text-secondary)]">{wheel.base}</span>
        </p>

        <div className="flex flex-wrap gap-1">
          {wheel.reading.map((r, i) => (
            <span
              key={`${r.value}-${i}`}
              className="inline-flex items-baseline gap-1 rounded-md bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-xs"
            >
              <span className="text-[var(--text-muted)]">{r.value}</span>
              <span className="text-[var(--text-primary)]">{r.letter}</span>
            </span>
          ))}
        </div>

        {onChain && answer ? (
          <button
            type="button"
            onClick={() => onChain(answer, "Roda alfabética")}
            className="self-start text-xs text-[var(--text-secondary)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-primary)]"
          >
            usar como entrada
          </button>
        ) : null}
      </div>
    </div>
  );
}
