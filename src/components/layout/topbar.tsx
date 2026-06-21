import { HelpCircle, KeyRound } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ onHelp }: { onHelp: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/20 bg-[var(--surface-chrome)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand)] text-[var(--brand-ink)]">
            <KeyRound className="h-4 w-4" />
          </span>
          <span className="font-display text-lg text-[var(--text-on-chrome)]">
            The<span className="text-[var(--brand)]">Decrypter</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
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
        </div>
      </div>
    </header>
  );
}
