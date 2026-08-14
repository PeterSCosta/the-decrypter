import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";
import { CircleAlert, CircleCheck, Download, QrCode, Wand2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A aba Matriz é um ELO, nunca o fim da cadeia: em 2019 o resultado vira CEP, em
 * GIA-39 vira vetor de contagens, em GIA-15 vira caminho de leitura. Por isso
 * tudo aqui é copiável e a grade sai também nos dois formatos que o `lerGrade`
 * do Decodificador aceita (tabela markdown e contígua).
 *
 * Os tipos abaixo são a forma de que a TELA precisa. Quem chama traduz o que o
 * motor devolve para cá — assim uma mudança no motor não vira uma reescrita de
 * componente.
 */

export interface SaidaFormato {
  id: string;
  label: string;
  hint: string;
  value: string;
}

export interface BlocoLido {
  /** O desenho do bloco em `█`/`·`, para a pessoa ver o que foi lido. */
  desenho: string;
  /** Caractere reconhecido, ou vazio quando nenhum glifo bateu. */
  char: string;
  /** Quando não bateu: os mais próximos por distância de Hamming. */
  candidatos: { char: string; distancia: number }[];
}

export interface LeituraAlfabeto {
  texto: string;
  blocos: BlocoLido[];
  aviso?: string;
}

import type { Diagnostico, ResultadoQr } from "../qr";

function Bloco({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.6875rem] uppercase tracking-wide text-[var(--text-muted)]">
          {titulo}
        </span>
        <span className="ml-auto flex items-center gap-1">{acao}</span>
      </div>
      {children}
    </Card>
  );
}

/** Saída em texto, com o formato escolhido por um segmentado que rola no estreito. */
export function SaidaTexto({
  formatos,
  atual,
  onAtual,
  onDecodificador,
}: {
  formatos: SaidaFormato[];
  atual: string;
  onAtual: (id: string) => void;
  onDecodificador?: (texto: string) => void;
}) {
  const escolhido = formatos.find((f) => f.id === atual) ?? formatos[0];
  if (!escolhido) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {formatos.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onAtual(f.id)}
            aria-pressed={f.id === escolhido.id}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition-colors",
              f.id === escolhido.id
                ? "border-transparent bg-[var(--brand)] text-[var(--brand-ink)]"
                : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Bloco
        titulo={escolhido.label}
        acao={
          <>
            {onDecodificador ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onDecodificador(escolhido.value)}
                disabled={escolhido.value.trim() === ""}
                title="Abre o Decodificador com esta grade — é lá que moram espiral, quatro braços e serpentina"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Decodificador
              </Button>
            ) : null}
            <CopyButton value={escolhido.value} />
          </>
        }
      >
        <pre className="max-h-56 overflow-auto whitespace-pre rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] p-2 font-mono text-xs leading-tight text-[var(--text-primary)]">
          {escolhido.value || "—"}
        </pre>
        <p className="text-xs text-[var(--text-secondary)]">{escolhido.hint}</p>
      </Bloco>
    </div>
  );
}

/**
 * O fecho da cadeia: a grade pintada virando caractere. Quando um bloco não bate
 * com glifo nenhum, mostrar os vizinhos por Hamming é o serviço — em prova,
 * quase-acerto quer dizer "você errou uma célula", não "não deu".
 */
export function LeituraBlocos({
  leitura,
  onDecodificador,
}: {
  leitura: LeituraAlfabeto;
  onDecodificador?: (texto: string) => void;
}) {
  return (
    <Bloco
      titulo="Leitura por blocos"
      acao={
        <>
          {onDecodificador ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDecodificador(leitura.texto)}
              disabled={leitura.texto.trim() === ""}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Decodificador
            </Button>
          ) : null}
          <CopyButton value={leitura.texto} />
        </>
      }
    >
      <p className="break-all font-mono text-2xl text-[var(--text-primary)]">
        {leitura.texto || "—"}
      </p>

      {leitura.aviso ? (
        <p className="flex items-start gap-1.5 text-xs text-[var(--color-pulse-700)]">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {leitura.aviso}
        </p>
      ) : null}

      {leitura.blocos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {leitura.blocos.map((b, i) => (
            <div
              key={`${i}-${b.desenho}`}
              className={cn(
                "flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-1.5",
                b.char
                  ? "border-[var(--border-subtle)]"
                  : "border-[var(--color-pulse-200)] bg-[var(--color-pulse-50)]",
              )}
            >
              <pre className="font-mono text-[0.5rem] leading-[0.65rem] text-[var(--text-secondary)]">
                {b.desenho}
              </pre>
              <span
                className={cn(
                  "font-mono text-sm font-semibold",
                  b.char ? "text-[var(--text-primary)]" : "text-[var(--color-pulse-700)]",
                )}
              >
                {b.char || "?"}
              </span>
              {!b.char && b.candidatos.length > 0 ? (
                <span
                  className="font-mono text-[0.625rem] text-[var(--color-pulse-700)]"
                  title="Candidatos por distância de Hamming — quantas células teriam de mudar"
                >
                  {b.candidatos.map((c) => `${c.char}±${c.distancia}`).join(" ")}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Bloco>
  );
}

/** Contagens na margem: são a resposta em GIA-39 e as pistas de nonograma ao contrário. */
export function Contagens({
  linhas,
  colunas,
  pistasLinhas,
  pistasColunas,
}: {
  linhas: string;
  colunas: string;
  pistasLinhas: string;
  pistasColunas: string;
}) {
  const itens: { rotulo: string; valor: string; hint: string }[] = [
    {
      rotulo: "Marcadas por linha",
      valor: linhas,
      hint: "O comprimento da barra é o índice da letra (GIA-39). Cola direto na aba Posições.",
    },
    { rotulo: "Marcadas por coluna", valor: colunas, hint: "A mesma contagem, na outra direção." },
    {
      rotulo: "Pistas de nonograma — linhas",
      valor: pistasLinhas,
      hint: "Blocos contíguos de cada linha. Serve para conferir a grade contra o enunciado.",
    },
    { rotulo: "Pistas de nonograma — colunas", valor: pistasColunas, hint: "O mesmo por coluna." },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {itens.map((i) => (
        <Bloco key={i.rotulo} titulo={i.rotulo} acao={<CopyButton value={i.valor} />}>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-[var(--text-primary)]">
            {i.valor || "—"}
          </pre>
          <p className="text-xs text-[var(--text-secondary)]">{i.hint}</p>
        </Bloco>
      ))}
    </div>
  );
}

/**
 * QR. O pré-diagnóstico geométrico aparece ANTES de tentar ler — é ele que evita
 * o "falhou e não sei por quê", que custa vinte minutos no relógio da prova.
 */
export function CartaoQr({
  diagnostico,
  resultado,
  carregando,
  onLer,
  onDecodificador,
}: {
  diagnostico: Diagnostico;
  resultado: ResultadoQr | null;
  carregando: boolean;
  onLer: () => void;
  onDecodificador?: (texto: string) => void;
}) {
  const texto = resultado?.texto ?? null;

  return (
    <Bloco
      titulo="QR code"
      acao={
        <Button variant="secondary" size="sm" onClick={onLer} disabled={carregando}>
          <QrCode className="h-3.5 w-3.5" />
          {carregando ? "Lendo…" : "Ler a grade como QR"}
        </Button>
      }
    >
      {/* O pré-diagnóstico vem ANTES da tentativa, e é ele que troca o "não deu"
          mudo do leitor por uma frase que diz o que consertar. */}
      <p className="flex items-start gap-1.5 text-xs">
        {diagnostico.podeTentar ? (
          <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success-600)]" />
        ) : (
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
        )}
        <span className="text-[var(--text-primary)]">{diagnostico.resumo}</span>
      </p>

      {diagnostico.motivos.length > 0 ? (
        <ul className="flex flex-col gap-0.5 pl-5">
          {diagnostico.motivos.map((mo) => (
            <li key={mo} className="text-xs text-[var(--text-secondary)]">
              {mo}
            </li>
          ))}
        </ul>
      ) : null}

      {texto ? (
        <div className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] p-2">
          <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-sm text-[var(--text-primary)]">
            {texto}
          </pre>
          {onDecodificador ? (
            <Button variant="secondary" size="sm" onClick={() => onDecodificador(texto)}>
              <Wand2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <CopyButton value={texto} />
        </div>
      ) : null}

      {resultado && !texto ? (
        <p className="flex items-start gap-1.5 text-xs text-[var(--color-pulse-700)]">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {resultado.motivo}
        </p>
      ) : null}

      {resultado?.invertido ? (
        <p className="text-xs text-[var(--text-secondary)]">
          Só leu com as cores trocadas — a matriz está invertida (claro por escuro).
        </p>
      ) : null}

      {/* Leu aqui e mesmo assim há ressalva: é o caso da quiet zone, que o leitor
          interno perdoa e o celular da equipe não. Calar isso custaria a entrega. */}
      {resultado?.avisos.map((a) => (
        <p key={a} className="flex items-start gap-1.5 text-xs text-[var(--color-warning-600)]">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {a}
        </p>
      ))}
    </Bloco>
  );
}

/** Baixar a imagem: às vezes o resultado é um DESENHO para olhar de longe. */
export function BotaoPng({ onBaixar, aviso }: { onBaixar: () => void; aviso: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" onClick={onBaixar}>
        <Download className="h-3.5 w-3.5" />
        Baixar PNG
      </Button>
      {aviso ? <span className="text-xs text-[var(--color-pulse-700)]">{aviso}</span> : null}
    </div>
  );
}
