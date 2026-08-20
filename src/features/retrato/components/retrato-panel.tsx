import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useMemo, useState } from "react";
import {
  COLUNAS_TESTADAS,
  ENCAIXE_ALTO,
  IC_INGLES,
  IC_PORTUGUES,
  type Veredito,
  lerRetrato,
  perfilDeColuna,
  retratoDoTexto,
} from "../leitura";

/**
 * A aba Retrato — o motor de criptanálise que estava pago e sem tela.
 *
 * `engine/criptanalise.ts` são 879 linhas medidas e testadas, com **zero
 * consumidores de produção** fora do `vigenere-crack`: índice de coincidência,
 * IC por coluna, Kasiski, frequências, qui-quadrado contra dois idiomas. Tudo
 * calculado, nada visível. Esta aba não acrescenta análise — publica a que já
 * existia.
 *
 * ── O QUE ELA RESPONDE, E É O QUE FALTAVA ──────────────────────────────────
 * "Que cifra é esta?" — antes de decifrar. O Decodificador tenta as 119 e
 * ordena por evidência; aqui a pergunta é anterior: **que FAMÍLIA é**, para a
 * pessoa saber onde gastar a madrugada.
 *
 * ── E O QUE ELA SE RECUSA A DIZER ──────────────────────────────────────────
 * Abaixo de 150 letras não há veredito. Não é conservadorismo: foi medido que
 * em 60 letras um texto cifrado às vezes casa com o perfil do idioma melhor que
 * um texto real. Os números continuam na tela, com um aviso de que a amostra
 * não os sustenta.
 */

const TOM: Record<Veredito, "success" | "info" | "pulse" | "neutral"> = {
  claro: "success",
  monoalfabetica: "info",
  polialfabetica: "info",
  "nao-e-texto": "neutral",
  curto: "pulse",
};

/** Barra horizontal de proporção — usada pela frequência e pelo perfil de coluna. */
function Barra({ v, max, destaque }: { v: number; max: number; destaque?: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, v / max)) * 100 : 0;
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
      <span
        className={cn(
          "block h-full rounded-full",
          destaque ? "bg-[var(--brand)]" : "bg-[var(--border-strong)]",
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

export function RetratoPanel() {
  const [texto, setTexto] = useState("");
  const deb = useDebouncedValue(texto, 200);

  const dados = useMemo(() => {
    const limpo = deb.trim();
    if (!limpo) return null;
    const retrato = retratoDoTexto(limpo);
    if (retrato.letras === 0) return null;
    return {
      retrato,
      leitura: lerRetrato(retrato, limpo),
      colunas: perfilDeColuna(limpo, COLUNAS_TESTADAS),
    };
  }, [deb]);

  const maxLetra = dados?.retrato.letra[0]?.contagem ?? 1;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">
          Retrato — que cifra é esta?
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Cole o texto cifrado e a bancada diz de que <strong>família</strong> ele é, antes de
          tentar decifrar. Substituição e transposição preservam o índice de coincidência do idioma;
          polialfabética o derruba, mas ele volta quando o texto é fatiado no comprimento da chave.
          É o que separa César de Vigenère sem chutar nenhuma.
        </p>
      </div>

      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={5}
        aria-label="Texto para o retrato estatístico"
        placeholder="Cole aqui o texto cifrado. Quanto mais longo, mais a estatística tem a dizer — abaixo de 150 letras ela não afirma nada."
      />

      {!dados ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          Sem texto, sem retrato. A análise precisa de letras — números e pontuação são ignorados.
        </p>
      ) : (
        <>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TOM[dados.leitura.veredito]}>{dados.leitura.titulo}</Badge>
              {!dados.leitura.confiavel && (
                <span className="text-xs text-[var(--text-tertiary)]">
                  a amostra não sustenta um veredito
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{dados.leitura.porque}</p>
            <p className="mt-2 text-sm text-[var(--text-primary)]">{dados.leitura.sugestao}</p>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-3">
              <span className="text-xs text-[var(--text-tertiary)]">Letras</span>
              <p className="font-mono text-lg text-[var(--text-primary)]">{dados.retrato.letras}</p>
            </Card>
            <Card className="p-3">
              <span className="text-xs text-[var(--text-tertiary)]">Índice de coincidência</span>
              <p className="font-mono text-lg text-[var(--text-primary)]">
                {dados.retrato.ic.toFixed(4)}
              </p>
              <span className="text-xs text-[var(--text-tertiary)]">
                pt {IC_PORTUGUES.toFixed(4)} · en {IC_INGLES.toFixed(4)}
              </span>
            </Card>
            <Card className="p-3">
              <span className="text-xs text-[var(--text-tertiary)]">Encaixe no natural</span>
              <p className="font-mono text-lg text-[var(--text-primary)]">
                {(dados.retrato.encaixeIc * 100).toFixed(0)}%
              </p>
              <span className="text-xs text-[var(--text-tertiary)]">0 = aleatório · 100 = pt</span>
            </Card>
          </div>

          {/*
            O IC por coluna é a metade que decide, e por isso ele fica ANTES das
            frequências: é ele que separa polialfabética de "não é texto", coisa
            que o IC global não faz (Vigenère de chave 12 fica em 7% de encaixe,
            e o ruído em 3%).
          */}
          <Card className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Índice de coincidência por coluna
              </h3>
              <span className="text-xs text-[var(--text-tertiary)]">
                a coluna que sobe é o comprimento da chave
              </span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {dados.colunas.map((c) => (
                <li key={c.n} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-right font-mono text-xs text-[var(--text-tertiary)]">
                    {c.n}
                  </span>
                  <Barra v={c.encaixe} max={1.4} destaque={c.n > 1 && c.encaixe >= ENCAIXE_ALTO} />
                  <span className="w-12 shrink-0 text-right font-mono text-xs text-[var(--text-secondary)]">
                    {c.ic.toFixed(4)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  Frequência de letras
                </h3>
                <CopyButton
                  value={dados.retrato.letra
                    .map((f) => `${f.gram}\t${f.contagem}\t${f.pct.toFixed(2)}%`)
                    .join("\n")}
                />
              </div>
              <ul className="mt-3 flex flex-col gap-1">
                {dados.retrato.letra.slice(0, 12).map((f) => (
                  <li key={f.gram} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 font-mono text-xs text-[var(--text-primary)]">
                      {f.gram}
                    </span>
                    <Barra v={f.contagem} max={maxLetra} />
                    <span className="w-10 shrink-0 text-right font-mono text-xs text-[var(--text-secondary)]">
                      {f.contagem}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Bigramas e trigramas mais comuns
              </h3>
              <p className="mt-2 font-mono text-xs leading-relaxed text-[var(--text-secondary)]">
                {dados.retrato.bigrama
                  .slice(0, 10)
                  .map((f) => `${f.gram} ${f.contagem}`)
                  .join("  ·  ")}
              </p>
              <p className="mt-2 font-mono text-xs leading-relaxed text-[var(--text-secondary)]">
                {dados.retrato.trigrama
                  .slice(0, 8)
                  .map((f) => `${f.gram} ${f.contagem}`)
                  .join("  ·  ")}
              </p>
              <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                <span className="text-xs text-[var(--text-tertiary)]">
                  χ² do perfil de letras — quanto menor, melhor encaixa
                </span>
                <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
                  pt {dados.retrato.qui.letras.pt.qui.toFixed(2)} · en{" "}
                  {dados.retrato.qui.letras.en.qui.toFixed(2)}
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
