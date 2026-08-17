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
  FileSearch,
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
const ArquivoPanel = lazy(() =>
  import("@/features/arquivo/components/arquivo-panel").then((m) => ({ default: m.ArquivoPanel })),
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
  | "arquivo"
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
  // Logo depois do Decodificador: é a segunda porta de entrada mais provável
  // quando a prova chega, porque a primeira pergunta sobre um arquivo é "o que
  // é isto de verdade" — e essa se responde nos bytes, antes de saber o tipo.
  { id: "arquivo", label: "Arquivo", icon: FileSearch },
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
        /**
         * Duas navegações, uma por largura — e a razão é aritmética.
         *
         * São 13 abas. Numa barra horizontal elas não cabem nem em 2000 px: o
         * print do dono mostrava "Cola" cortado no meio, e o resto atrás de
         * rolagem lateral que ninguém descobre. Ao mesmo tempo, o conteúdo
         * estava preso em `max-w-5xl` (1024 px) — num monitor largo, metade da
         * tela era margem.
         *
         * A partir de `lg` (1024 px) a navegação vira COLUNA fixa e o conteúdo
         * ocupa o resto, até 1600 px. Abaixo disso, continua exatamente a barra
         * horizontal de antes — é regra do projeto que nada regrida no celular,
         * e a 375 px uma coluna lateral comeria metade da largura útil.
         */
        <main className="mx-auto max-w-[1600px] px-4 py-6 lg:flex lg:gap-6">
          {/* Barra horizontal: só abaixo de lg. */}
          <nav
            className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)] lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

          {/* Coluna lateral: só a partir de lg. `sticky` para a navegação
              acompanhar a rolagem de um painel longo, como o de Arquivo. */}
          <nav className="hidden w-52 shrink-0 lg:block" role="tablist" aria-label="Ferramentas">
            <div className="sticky top-4 flex flex-col gap-0.5">
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
                      "flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* `min-w-0` é obrigatório: sem ele um filho largo (hexdump,
              espectrograma) estica o flex e empurra a coluna para fora. */}
          <div className="min-w-0 flex-1">
            {tab === "decoder" && <DecoderWorkbench entradaInicial={semente} />}
            {tab === "text" && <TextExtractPanel />}
            {tab === "positions" && <PositionsPanel />}
            {tab === "matrix" && <MatrixPanel onDecodificador={mandarParaDecodificador} />}
            {tab === "diff" && <DiffPanel />}
            {tab === "fonts" && <FontsPanel />}
            {tab === "anagram" && <AnagramPanel />}
            {tab === "reference" && <ReferencePanel />}
            <Suspense fallback={<PainelCarregando />}>
              {tab === "arquivo" && <ArquivoPanel onDecodificador={mandarParaDecodificador} />}
              {tab === "triangulate" && <TriangulatePanel />}
              {tab === "postes" && <PostesPanel />}
              {tab === "library" && <LibraryPanel aoAbrirPostes={() => setTab("postes")} />}
              {tab === "fleet" && <FleetPanel />}
            </Suspense>
          </div>
        </main>
      )}

      <footer className="mx-auto max-w-[1600px] px-4 pb-10 pt-4 text-xs text-[var(--text-muted)]">
        The Decrypter · oficina de cifras · dados: Blumenau (Rol de Ruas) + CEPs de Santa Catarina
      </footer>
    </div>
  );
}
