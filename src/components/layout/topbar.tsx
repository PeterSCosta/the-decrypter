import { HelpCircle, KeyRound, LogOut, Users } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const BOTAO =
  "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-on-chrome)]/70 transition-colors hover:bg-white/10 hover:text-[var(--text-on-chrome)]";

export function Topbar({
  onHelp,
  onAdmin,
  onSair,
}: {
  onHelp: () => void;
  /** Só chega preenchido para admin — o botão nem existe para os demais. */
  onAdmin?: () => void;
  onSair?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/20 bg-[var(--surface-chrome)]">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4">
        {/* No desktop a marca vive na coluna lateral; aqui ela só aparece
            abaixo de lg, onde não há coluna. */}
        <div className="flex items-center gap-2.5 lg:invisible">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand)] text-[var(--brand-ink)]">
            <KeyRound className="h-4 w-4" />
          </span>
          <span className="font-display text-lg text-[var(--text-on-chrome)]">
            The<span className="text-[var(--brand)]">Decrypter</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onAdmin ? (
            <button
              type="button"
              onClick={onAdmin}
              aria-label="Usuários"
              title="Usuários — aprovar e administrar"
              className={BOTAO}
            >
              <Users className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onHelp}
            aria-label="Ajuda"
            title="Ajuda — como funciona"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-on-chrome)]/70 transition-colors hover:bg-white/10 hover:text-[var(--text-on-chrome)]"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <ThemeToggle />
          {onSair ? (
            <button
              type="button"
              onClick={onSair}
              aria-label="Sair"
              title="Sair da conta"
              className={BOTAO}
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
