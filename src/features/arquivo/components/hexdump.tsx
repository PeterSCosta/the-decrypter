import { cn } from "@/lib/cn";
import { useEffect, useMemo, useRef, useState } from "react";

const POR_LINHA = 16;
/** Quantas linhas ficam no DOM. Um arquivo de 50 MB tem 3,3 milhões delas. */
const JANELA = 40;

const hex = (b: number) => b.toString(16).padStart(2, "0").toUpperCase();
const imprimivel = (b: number) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "·");

/**
 * Hexdump ancorado.
 *
 * Existe por uma razão que não é estética: **sem ele nenhum detector desta aba
 * é conferível**. Toda a análise afirma coisas sobre offsets — "o JPEG começa
 * em 176.444", "a sobra vai daqui até o fim" — e a única forma de a pessoa
 * checar em vez de acreditar é ver os bytes.
 *
 * Só a janela visível vai ao DOM. Com 16 bytes por linha, um arquivo de 50 MB
 * daria 3,3 milhões de linhas, e montá-las todas trava o navegador.
 */
export function Hexdump({
  bytes,
  ancora,
  className,
}: {
  bytes: Uint8Array;
  /** Byte que deve aparecer — mudar isto rola até lá e destaca. */
  ancora?: number;
  className?: string;
}) {
  const totalLinhas = Math.ceil(bytes.length / POR_LINHA);
  const [primeiraLinha, setPrimeiraLinha] = useState(0);
  const refCampo = useRef<HTMLInputElement>(null);

  // A âncora manda: quando um achado é clicado, a janela salta para ele.
  useEffect(() => {
    if (ancora === undefined) return;
    const linha = Math.floor(ancora / POR_LINHA);
    setPrimeiraLinha(Math.max(0, Math.min(linha - 4, Math.max(0, totalLinhas - JANELA))));
  }, [ancora, totalLinhas]);

  const linhas = useMemo(() => {
    const out: { offset: number; bytes: number[] }[] = [];
    for (let l = primeiraLinha; l < Math.min(primeiraLinha + JANELA, totalLinhas); l++) {
      const off = l * POR_LINHA;
      out.push({ offset: off, bytes: Array.from(bytes.subarray(off, off + POR_LINHA)) });
    }
    return out;
  }, [bytes, primeiraLinha, totalLinhas]);

  const irPara = (valor: string) => {
    const t = valor.trim();
    // Aceita decimal e hexadecimal: os achados falam em decimal, as ferramentas
    // de fora quase sempre em hex.
    const n = /^0x/i.test(t) ? Number.parseInt(t.slice(2), 16) : Number.parseInt(t, 10);
    if (!Number.isFinite(n) || n < 0) return;
    setPrimeiraLinha(
      Math.max(0, Math.min(Math.floor(n / POR_LINHA), Math.max(0, totalLinhas - JANELA))),
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={refCampo}
          type="text"
          inputMode="numeric"
          placeholder="ir para o byte (ou 0x…)"
          className="h-8 w-44 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 font-mono text-xs text-[var(--text-primary)]"
          onKeyDown={(e) => {
            if (e.key === "Enter") irPara((e.target as HTMLInputElement).value);
          }}
        />
        <span className="font-mono text-xs text-[var(--text-muted)]">
          byte {(primeiraLinha * POR_LINHA).toLocaleString("pt-BR")} de{" "}
          {bytes.length.toLocaleString("pt-BR")}
        </span>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            className="rounded-[var(--radius-sm)] px-2 py-1 font-mono text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
            onClick={() => setPrimeiraLinha((l) => Math.max(0, l - JANELA))}
          >
            ↑
          </button>
          <button
            type="button"
            className="rounded-[var(--radius-sm)] px-2 py-1 font-mono text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
            onClick={() =>
              setPrimeiraLinha((l) => Math.min(Math.max(0, totalLinhas - JANELA), l + JANELA))
            }
          >
            ↓
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-2">
        <table className="font-mono text-[0.6875rem] leading-5">
          <tbody>
            {linhas.map((l) => (
              <tr key={l.offset}>
                <td className="pr-3 text-[var(--text-muted)] tabular-nums">
                  {l.offset.toString(16).padStart(8, "0")}
                </td>
                {l.bytes.map((b, i) => {
                  const pos = l.offset + i;
                  const destaque = ancora !== undefined && pos >= ancora && pos < ancora + 16;
                  return (
                    <td
                      key={pos}
                      className={cn(
                        "px-[3px] tabular-nums",
                        destaque
                          ? "rounded-sm bg-[var(--brand)] text-[var(--brand-ink)]"
                          : "text-[var(--text-secondary)]",
                      )}
                    >
                      {hex(b)}
                    </td>
                  );
                })}
                <td className="pl-3 whitespace-pre text-[var(--text-primary)]">
                  {l.bytes.map(imprimivel).join("")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
