import { ORDEM, TABS } from "@/app-tabs";
import { Topbar } from "@/components/layout/topbar";
import { AdminPage } from "@/features/admin/components/admin-page";
import { AnagramPanel } from "@/features/anagram/components/anagram-panel";
import { LoginScreen } from "@/features/auth/components/login-screen";
import { useAuth } from "@/features/auth/use-auth";
import { DecoderWorkbench } from "@/features/decoder/components/decoder-workbench";
import { decoders } from "@/features/decoder/engine/registry";
import { DiffPanel } from "@/features/diff/components/diff-panel";
import { FontsPanel } from "@/features/fonts/components/fonts-panel";
import { HelpPage } from "@/features/help/components/help-page";
import { LotePanel } from "@/features/lote/components/lote-panel";
import { useLoteEmAndamento } from "@/features/lote/use-lote";
import { MatrixPanel } from "@/features/matrix/components/matrix-panel";
import { PositionsPanel } from "@/features/positions/components/positions-panel";
import { ReferencePanel } from "@/features/reference/components/reference-panel";
import { RetratoPanel } from "@/features/retrato/components/retrato-panel";
import { TextExtractPanel } from "@/features/text-extract/components/text-extract-panel";
import { cn } from "@/lib/cn";
import { lerCaminho } from "@/lib/rota";
import { useRota } from "@/lib/use-rota";
import { KeyRound, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Suspense, lazy, useCallback, useState } from "react";

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
const GeoPanel = lazy(() =>
  import("@/features/geo/components/geo-panel").then((m) => ({ default: m.GeoPanel })),
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

// O painel de admin entra aqui, e não como aba: a lista de abas é visível para
// todo mundo, e anunciar "Usuários" a quem não é admin só gera clique em porta
// trancada. Pelo botão da topbar, ele nem existe para quem não pode entrar.
// O tipo da rota (aba e painel) mora em `lib/rota.ts`, junto dos apelidos
// públicos: quem muda um tem de mudar o outro, e um teste prende os dois.

export function App() {
  const { usuario, carregando, sair } = useAuth();
  /**
   * Aba e painel moram na URL, não em `useState`.
   *
   * O hook precisa vir ANTES dos `return` de carregando/login: hook não pode
   * ficar atrás de condição, e há uma razão de produto junto — quem recebe
   * `/usuarios` sem estar logado tem de cair no login e, depois de entrar,
   * chegar onde o link mandava. Se a rota só nascesse depois do login, o
   * endereço compartilhado se perderia exatamente na hora que mais importa.
   */
  /**
   * A cifra do endereço existe mesmo?
   *
   * Quem tem o registro é este arquivo (o `lib/rota.ts` fica puro de propósito),
   * então a conferência é aqui e o resultado desce para o hook. `/cifra/xpto`
   * sem esta linha deixava a bancada rodando "só" um decoder inexistente: zero
   * resultado, sem dizer por quê.
   */
  const caminhoInicial = typeof window === "undefined" ? "/" : window.location.pathname;
  const cifraDoCaminho = lerCaminho(caminhoInicial).cifra ?? null;
  const cifraExiste = cifraDoCaminho ? decoders.some((d) => d.id === cifraDoCaminho) : null;

  const {
    aba: tab,
    painel: view,
    cifra,
    irParaAba: setTab,
    irParaPainel,
    irParaCifra,
    alternarPainel,
  } = useRota(carregando ? null : usuario?.papel === "admin", cifraExiste);
  /**
   * Menu recolhido vira coluna de ÍCONES, não some.
   *
   * Sumir por completo devolveria o problema que a coluna resolveu: sem uma
   * âncora visível, quem recolheu não acha de volta. Com 14 ícones e o rótulo
   * no `title`, a navegação continua inteira em 3,5 rem.
   */
  const [menuAberto, setMenuAberto] = useState(true);

  /**
   * A rodada do Lote sobrevive à troca de aba — e é isso que o botão "na
   * bancada" de cada linha faz. O preço é uma rodada correndo com o "Parar"
   * fora de alcance; o ponto é o que devolve o alcance a quem saiu.
   */
  const loteRodando = useLoteEmAndamento();

  // A grade pintada quase nunca é a resposta: ela produz uma string (os dígitos
  // de uma fonte 3×5, as células verdadeiras em ordem) que ainda precisa passar
  // por outra camada. Este é o mesmo encadeamento do botão "usar como entrada".
  const [semente, setSemente] = useState("");
  const mandarParaDecodificador = useCallback(
    (texto: string) => {
      setSemente(texto);
      setTab("decoder");
    },
    // `setTab` agora é o `irParaAba` da rota, e não o setter estável de um
    // `useState`: ele muda quando a rota muda, e omiti-lo aqui congelaria a
    // navegação numa versão velha. É a mesma pegadinha que a casa já registrou
    // com `onSuccess`/`onError` em dependências de hook.
    [setTab],
  );

  // Enquanto o token guardado não é validado contra a API, não dá para escolher
  // entre a bancada e o login sem piscar uma das duas na cara de quem recarregou.
  if (carregando) return <div className="min-h-screen bg-[var(--surface-page)]" />;
  if (!usuario) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <Topbar
        onHelp={() => alternarPainel("help")}
        onAdmin={usuario.papel === "admin" ? () => alternarPainel("admin") : undefined}
        onSair={sair}
      />
      {view === "help" ? (
        <HelpPage
          onClose={() => irParaPainel("app")}
          /* "na bancada" fecha a Ajuda e planta o exemplo no Decodificador: o
             guia mostra as três primeiras leituras offline, e o card completo
             — com mapa, consulta e cadeia — só existe lá. */
          aoTestar={(texto) => {
            mandarParaDecodificador(texto);
            irParaPainel("app");
          }}
        />
      ) : view === "admin" ? (
        <AdminPage onClose={() => irParaPainel("app")} />
      ) : (
        /**
         * Duas navegações, uma por largura — e a razão é aritmética.
         *
         * São 14 abas. Numa barra horizontal elas não cabem nem em 2000 px: o
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
            {ORDEM.map((id) => {
              const t = { id, ...TABS[id] };
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
                  {t.id === "lote" && loteRodando ? (
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--pulse)]"
                      aria-label="rodada em andamento"
                    />
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Coluna lateral: só a partir de lg. `sticky` para a navegação
              acompanhar a rolagem de um painel longo, como o de Arquivo. */}
          <nav
            className={cn("hidden shrink-0 lg:block", menuAberto ? "w-52" : "w-14")}
            role="tablist"
            aria-label="Ferramentas"
          >
            <div className="sticky top-4 flex flex-col gap-0.5">
              {/* A marca mora AQUI no desktop: a topbar ficou com os botões, e
                  repetir o logo nos dois lugares gastaria o topo da coluna com
                  algo que a pessoa já viu ao entrar. */}
              <div
                className={cn(
                  "mb-2 flex items-center gap-2.5",
                  menuAberto ? "px-3" : "justify-center",
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand)] text-[var(--brand-ink)]">
                  <KeyRound className="h-4 w-4" />
                </span>
                {menuAberto ? (
                  <span className="font-display text-base text-[var(--text-primary)]">
                    The<span className="text-[var(--brand)]">Decrypter</span>
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setMenuAberto((v) => !v)}
                aria-label={menuAberto ? "Recolher o menu" : "Expandir o menu"}
                title={menuAberto ? "Recolher o menu" : "Expandir o menu"}
                className={cn(
                  "mb-1 flex items-center rounded-[var(--radius-md)] py-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
                  menuAberto ? "justify-end px-3" : "justify-center",
                )}
              >
                {menuAberto ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </button>

              {ORDEM.map((id) => {
                const t = { id, ...TABS[id] };
                const active = tab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    // O rótulo vira `title` quando recolhido: sem ele, treze
                    // ícones viram adivinhação.
                    title={menuAberto ? undefined : t.label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[var(--radius-md)] py-2 text-left text-sm font-medium transition-colors",
                      menuAberto ? "px-3" : "justify-center px-0",
                      active
                        ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {menuAberto ? t.label : null}
                    {t.id === "lote" && loteRodando ? (
                      <span
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--pulse)]"
                        aria-label="rodada em andamento"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* `min-w-0` é obrigatório: sem ele um filho largo (hexdump,
              espectrograma) estica o flex e empurra a coluna para fora. */}
          <div className="min-w-0 flex-1">
            {tab === "decoder" && (
              <DecoderWorkbench
                entradaInicial={semente}
                cifra={cifra}
                aoTrocarCifra={irParaCifra}
              />
            )}
            {tab === "lote" && <LotePanel onDecodificador={mandarParaDecodificador} />}
            {tab === "text" && <TextExtractPanel />}
            {tab === "positions" && <PositionsPanel />}
            {tab === "matrix" && <MatrixPanel onDecodificador={mandarParaDecodificador} />}
            {tab === "diff" && <DiffPanel />}
            {tab === "fonts" && <FontsPanel />}
            {tab === "anagram" && <AnagramPanel />}
            {tab === "reference" && <ReferencePanel />}
            {tab === "retrato" && <RetratoPanel />}
            <Suspense fallback={<PainelCarregando />}>
              {tab === "arquivo" && <ArquivoPanel onDecodificador={mandarParaDecodificador} />}
              {tab === "geo" && (
                <GeoPanel aoDecodificar={mandarParaDecodificador} aoAbrirAba={setTab} />
              )}
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
