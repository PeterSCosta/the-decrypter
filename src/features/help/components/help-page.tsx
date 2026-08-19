import { Input } from "@/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { HELP_INTRO, HELP_SECTIONS } from "../help-content";
import { Verbete } from "./verbete";

/** Sem acento e sem caixa — quem procura "codigo" tem de achar "código". */
const dobrar = (s: string): string => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function HelpPage({
  onClose,
  aoTestar,
}: {
  onClose: () => void;
  /** Manda o exemplo para a bancada — é onde ele vira card completo. */
  aoTestar?: (texto: string) => void;
}) {
  const [busca, setBusca] = useState("");

  /**
   * O filtro casa contra NOME, DESCRIÇÃO e EXEMPLOS.
   *
   * Contra os exemplos porque é assim que a busca é usada de verdade: numa
   * prova a pessoa tem o código na mão e quer saber o que ele é. Colar
   * `SC-4202404` aqui tem de levar ao CAR, e nenhuma palavra do nome ou da
   * descrição daquele verbete contém esse texto.
   */
  const secoes = useMemo(() => {
    const q = dobrar(busca.trim());
    if (!q) return HELP_SECTIONS;
    return HELP_SECTIONS.map((s) => ({
      ...s,
      entries: s.entries.filter((e) =>
        dobrar(
          [e.name, e.desc, ...(e.examples ?? []), e.esperado ?? "", e.example?.in ?? ""].join(" "),
        ).includes(q),
      ),
    })).filter((s) => s.entries.length > 0);
  }, [busca]);

  const total = secoes.reduce((n, s) => n + s.entries.length, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button
        type="button"
        onClick={onClose}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="font-display text-2xl text-[var(--text-primary)]">Ajuda — como funciona</h1>
      <div className="mt-3 flex flex-col gap-2">
        {HELP_INTRO.map((p) => (
          <p key={p.slice(0, 24)} className="text-sm text-[var(--text-secondary)]">
            {p}
          </p>
        ))}
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          value={busca}
          onChange={(ev) => setBusca(ev.target.value)}
          placeholder="filtrar por nome, descrição ou pelo próprio código…"
          aria-label="Filtrar o guia"
          className="pl-9"
        />
      </div>
      <p className="mt-1.5 text-xs text-[var(--text-muted)]">
        Clique num exemplo para o motor decodificar na hora — a resposta abaixo dele é calculada,
        não escrita à mão.{" "}
        {busca.trim() ? (
          <span className="text-[var(--text-secondary)]">
            {total} verbete{total === 1 ? "" : "s"} para “{busca.trim()}”.
          </span>
        ) : null}
      </p>

      {busca.trim() ? null : (
        <nav className="mt-5 flex flex-wrap gap-2">
          {HELP_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {s.title}
            </a>
          ))}
        </nav>
      )}

      {total === 0 ? (
        <p className="mt-8 text-sm text-[var(--text-muted)]">
          Nada com “{busca.trim()}”. O filtro procura no nome, na descrição e nos exemplos — se você
          colou um código e não achou nada, ele pode ser de um formato que a bancada ainda não lê.
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-10">
        {secoes.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="font-display text-lg text-[var(--brand-strong)]">{section.title}</h2>
            {section.intro ? (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{section.intro}</p>
            ) : null}

            <div className="mt-4 flex flex-col divide-y divide-[var(--border-subtle)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
              {section.entries.map((e) => (
                <Verbete key={e.name} entrada={e} aoTestar={aoTestar} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
