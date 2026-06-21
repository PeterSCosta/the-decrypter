import { ArrowLeft } from "lucide-react";
import { HELP_INTRO, HELP_SECTIONS } from "../help-content";

export function HelpPage({ onClose }: { onClose: () => void }) {
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

      {/* Índice */}
      <nav className="mt-6 flex flex-wrap gap-2">
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

      <div className="mt-8 flex flex-col gap-10">
        {HELP_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="font-display text-lg text-[var(--brand-strong)]">{section.title}</h2>
            {section.intro ? (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{section.intro}</p>
            ) : null}

            <div className="mt-4 flex flex-col divide-y divide-[var(--border-subtle)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
              {section.entries.map((e) => (
                <div key={e.name} className="flex flex-col gap-1 p-3 sm:flex-row sm:gap-4">
                  <div className="font-display text-sm text-[var(--text-primary)] sm:w-64 sm:shrink-0">
                    {e.name}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-secondary)]">{e.desc}</p>
                    {e.example ? (
                      <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                        <span className="text-[var(--text-secondary)]">{e.example.in}</span>
                        {" → "}
                        <span className="text-[var(--brand-strong)]">{e.example.out}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
