import { Topbar } from "@/components/layout/topbar";
import { AdminPage } from "@/features/admin/components/admin-page";
import { AnagramPanel } from "@/features/anagram/components/anagram-panel";
import { LoginScreen } from "@/features/auth/components/login-screen";
import { useAuth } from "@/features/auth/use-auth";
import { DecoderWorkbench } from "@/features/decoder/components/decoder-workbench";
import { DiffPanel } from "@/features/diff/components/diff-panel";
import { FontsPanel } from "@/features/fonts/components/fonts-panel";
import { HelpPage } from "@/features/help/components/help-page";
import { RoadmapPage } from "@/features/help/components/roadmap-page";
import { MatrixPanel } from "@/features/matrix/components/matrix-panel";
import { PositionsPanel } from "@/features/positions/components/positions-panel";
import { ReferencePanel } from "@/features/reference/components/reference-panel";
import { TextExtractPanel } from "@/features/text-extract/components/text-extract-panel";
import { cn } from "@/lib/cn";
import {
  BookOpen,
  Eye,
  GitCompare,
  Grid3x3,
  Hash,
  Library,
  Lightbulb,
  MapPinned,
  Shuffle,
  Triangle,
  Type,
  Wand2,
} from "lucide-react";
import { type ComponentType, Suspense, lazy, useCallback, useState } from "react";

/**
 * As duas abas com mapa entram sob demanda: juntas elas arrastam Leaflet +
 * react-leaflet, e estavam no chunk de entrada de toda sessão — inclusive a de
 * quem só abre o Decodificador, que é a aba padrão.
 */
const FleetPanel = lazy(() =>
  import("@/features/fleet/components/fleet-panel").then((m) => ({ default: m.FleetPanel })),
);
const LibraryPanel = lazy(() =>
  import("@/features/library/components/library-panel").then((m) => ({ default: m.LibraryPanel })),
);
const PostesPanel = lazy(() =>
  import("@/features/poste/components/postes-panel").then((m) => ({ default: m.PostesPanel })),
);
const TriangulatePanel = lazy(() =>
  import("@/features/triangulate/components/triangulate-panel").then((m) => ({
    default: m.TriangulatePanel,
  })),
);

/** Enquanto o chunk da aba chega. Altura fixa para a página não pular. */
function PainelCarregando() {
  return (
    <div
      className="h-[420px] w-full animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]"
      aria-label="Carregando"
    />
  );
}

type TabId =
  | "decoder"
  | "text"
  | "positions"
  | "matrix"
  | "diff"
  | "anagram"
  | "fonts"
  | "reference"
  | "triangulate"
  | "postes"
  | "library"
  | "fleet";

const TABS: { id: TabId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "decoder", label: "Decodificador", icon: Wand2 },
  { id: "text", label: "Texto", icon: Type },
  { id: "positions", label: "Posições", icon: Hash },
  { id: "matrix", label: "Matriz", icon: Grid3x3 },
  { id: "diff", label: "Diferenças", icon: GitCompare },
  { id: "anagram", label: "Anagramas", icon: Shuffle },
  { id: "fonts", label: "Fontes", icon: Eye },
  { id: "reference", label: "Cola", icon: BookOpen },
  { id: "triangulate", label: "Triangulação", icon: Triangle },
  { id: "postes", label: "Postes", icon: Lightbulb },
  { id: "library", label: "Biblioteca", icon: Library },
  { id: "fleet", label: "Frota", icon: MapPinned },
];

// O painel de admin entra aqui, e não como aba: a lista de abas é visível para
// todo mundo, e anunciar "Usuários" a quem não é admin só gera clique em porta
// trancada. Pelo botão da topbar, ele nem existe para quem não pode entrar.
type View = "app" | "help" | "roadmap" | "admin";

export function App() {
  const { usuario, carregando, sair } = useAuth();
  const [tab, setTab] = useState<TabId>("decoder");
  const [view, setView] = useState<View>("app");
  const toggle = (v: Exclude<View, "app">) => setView((cur) => (cur === v ? "app" : v));

  // A grade pintada quase nunca é a resposta: ela produz uma string (os dígitos
  // de uma fonte 3×5, as células verdadeiras em ordem) que ainda precisa passar
  // por outra camada. Este é o mesmo encadeamento do botão "usar como entrada".
  const [semente, setSemente] = useState("");
  const mandarParaDecodificador = useCallback((texto: string) => {
    setSemente(texto);
    setTab("decoder");
  }, []);

  // Enquanto o token guardado não é validado contra a API, não dá para escolher
  // entre a bancada e o login sem piscar uma das duas na cara de quem recarregou.
  if (carregando) return <div className="min-h-screen bg-[var(--surface-page)]" />;
  if (!usuario) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <Topbar
        onHelp={() => toggle("help")}
        onRoadmap={() => toggle("roadmap")}
        onAdmin={usuario.papel === "admin" ? () => toggle("admin") : undefined}
        onSair={sair}
      />
      {view === "help" ? (
        <HelpPage onClose={() => setView("app")} />
      ) : view === "roadmap" ? (
        <RoadmapPage onClose={() => setView("app")} />
      ) : view === "admin" ? (
        <AdminPage onClose={() => setView("app")} />
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

          {tab === "decoder" && <DecoderWorkbench entradaInicial={semente} />}
          {tab === "text" && <TextExtractPanel />}
          {tab === "positions" && <PositionsPanel />}
          {tab === "matrix" && <MatrixPanel onDecodificador={mandarParaDecodificador} />}
          {tab === "diff" && <DiffPanel />}
          {tab === "fonts" && <FontsPanel />}
          {tab === "anagram" && <AnagramPanel />}
          {tab === "reference" && <ReferencePanel />}
          <Suspense fallback={<PainelCarregando />}>
            {tab === "triangulate" && <TriangulatePanel />}
            {tab === "postes" && <PostesPanel />}
            {tab === "library" && <LibraryPanel aoAbrirPostes={() => setTab("postes")} />}
            {tab === "fleet" && <FleetPanel />}
          </Suspense>
        </main>
      )}

      <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-xs text-[var(--text-muted)]">
        The Decrypter · oficina de cifras · dados: Blumenau (Rol de Ruas) + CEPs de Santa Catarina
      </footer>
    </div>
  );
}
