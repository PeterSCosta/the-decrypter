import { Topbar } from "@/components/layout/topbar";
import { AnagramPanel } from "@/features/anagram/components/anagram-panel";
import { DecoderWorkbench } from "@/features/decoder/components/decoder-workbench";
import { DiffPanel } from "@/features/diff/components/diff-panel";
import { FleetPanel } from "@/features/fleet/components/fleet-panel";
import { HelpPage } from "@/features/help/components/help-page";
import { RoadmapPage } from "@/features/help/components/roadmap-page";
import { PositionsPanel } from "@/features/positions/components/positions-panel";
import { ReferencePanel } from "@/features/reference/components/reference-panel";
import { TextExtractPanel } from "@/features/text-extract/components/text-extract-panel";
import { cn } from "@/lib/cn";
import { BookOpen, GitCompare, Hash, MapPinned, Shuffle, Type, Wand2 } from "lucide-react";
import { type ComponentType, useState } from "react";

type TabId = "decoder" | "text" | "positions" | "diff" | "anagram" | "reference" | "fleet";

const TABS: { id: TabId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "decoder", label: "Decodificador", icon: Wand2 },
  { id: "text", label: "Texto", icon: Type },
  { id: "positions", label: "Posições", icon: Hash },
  { id: "diff", label: "Diferenças", icon: GitCompare },
  { id: "anagram", label: "Anagramas", icon: Shuffle },
  { id: "reference", label: "Cola", icon: BookOpen },
  { id: "fleet", label: "Frota", icon: MapPinned },
];

type View = "app" | "help" | "roadmap";

export function App() {
  const [tab, setTab] = useState<TabId>("decoder");
  const [view, setView] = useState<View>("app");
  const toggle = (v: Exclude<View, "app">) => setView((cur) => (cur === v ? "app" : v));

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <Topbar onHelp={() => toggle("help")} onRoadmap={() => toggle("roadmap")} />
      {view === "help" ? (
        <HelpPage onClose={() => setView("app")} />
      ) : view === "roadmap" ? (
        <RoadmapPage onClose={() => setView("app")} />
      ) : (
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
          {tab === "text" && <TextExtractPanel />}
          {tab === "positions" && <PositionsPanel />}
          {tab === "diff" && <DiffPanel />}
          {tab === "anagram" && <AnagramPanel />}
          {tab === "reference" && <ReferencePanel />}
          {tab === "fleet" && <FleetPanel />}
        </main>
      )}

      <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-xs text-[var(--text-muted)]">
        The Decrypter · oficina de cifras · dados: Blumenau (Rol de Ruas) + CEPs de Santa Catarina
      </footer>
    </div>
  );
}
