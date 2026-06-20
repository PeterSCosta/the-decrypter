import { Topbar } from "@/components/layout/topbar";
import { CepSearch } from "@/features/cep/components/cep-search";
import { DecoderWorkbench } from "@/features/decoder/components/decoder-workbench";
import { PositionsPanel } from "@/features/positions/components/positions-panel";
import { StreetGuide } from "@/features/street-guide/components/street-guide";
import { cn } from "@/lib/cn";
import { Hash, MapPin, Signpost, Wand2 } from "lucide-react";
import { type ComponentType, useState } from "react";

type TabId = "decoder" | "positions" | "streets" | "ceps";

const TABS: { id: TabId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "decoder", label: "Decodificador", icon: Wand2 },
  { id: "positions", label: "Posições", icon: Hash },
  { id: "streets", label: "Guia de Ruas", icon: Signpost },
  { id: "ceps", label: "CEPs (SC)", icon: MapPin },
];

export function App() {
  const [tab, setTab] = useState<TabId>("decoder");

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <Topbar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <nav
          className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                  active
                    ? "border-[var(--brand)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "decoder" && <DecoderWorkbench />}
        {tab === "positions" && <PositionsPanel />}
        {tab === "streets" && <StreetGuide />}
        {tab === "ceps" && <CepSearch />}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-xs text-[var(--text-muted)]">
        The Decrypter · oficina de cifras · dados: Blumenau (Rol de Ruas) + CEPs de Santa Catarina
      </footer>
    </div>
  );
}
