import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PAPEL_LABEL,
  SITUACAO_LABEL,
  type SituacaoUsuario,
  type Usuario,
} from "@/features/auth/types";
import { mensagemDeErro, useAuth } from "@/features/auth/use-auth";
import { apiFetch } from "@/lib/api";
import { AlertTriangle, ArrowLeft, Ban, Check, Loader2, Trash2, UserPlus } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

const TOM: Record<SituacaoUsuario, "success" | "pulse" | "neutral"> = {
  aprovado: "success",
  // Coral é o tom de urgência do design system: pendente é o que pede ação.
  pendente: "pulse",
  bloqueado: "neutral",
};

/**
 * Painel do admin: aprovar quem se cadastrou, criar conta direto, bloquear e
 * remover. Entra pela união `View` do `App.tsx`, ao lado de Ajuda e Roadmap —
 * e não como aba, para não anunciar a própria existência a quem não é admin.
 */
export function AdminPage({ onClose }: { onClose: () => void }) {
  const { usuario: eu } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await apiFetch<{ hits: Usuario[] }>("/admin/users");
      setUsuarios(r.hits);
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function agir(id: string, corpo: Record<string, string>) {
    setOcupado(id);
    setErro(null);
    try {
      await apiFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(corpo) });
      await carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  }

  async function remover(u: Usuario) {
    if (!confirm(`Remover ${u.email}? A conta some e a pessoa perde o acesso.`)) return;
    setOcupado(u.id);
    setErro(null);
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: "DELETE" });
      await carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  }

  const pendentes = usuarios?.filter((u) => u.situacao === "pendente") ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <button
        type="button"
        onClick={onClose}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h2 className="font-display text-xl text-[var(--text-primary)]">Usuários</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Quem se cadastra entra como <strong>aguardando aprovação</strong> e só acessa a bancada
        depois que você liberar.
        {pendentes.length > 0 ? ` Há ${pendentes.length} esperando.` : ""}
      </p>

      {erro ? (
        <Card className="mt-4 border-[var(--color-pulse-600)] p-3">
          <p className="flex items-start gap-2 text-sm text-[var(--color-pulse-600)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {erro}
          </p>
        </Card>
      ) : null}

      <NovoUsuario aoCriar={carregar} />

      <Card className="mt-4 overflow-hidden">
        {usuarios === null ? (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)]">Carregando…</p>
        ) : usuarios.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)]">Nenhum usuário ainda.</p>
        ) : (
          usuarios.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--text-primary)]">
                  {u.nome ? `${u.nome} · ` : ""}
                  <span className="font-mono">{u.email}</span>
                  {u.id === eu?.id ? (
                    <span className="ml-1 text-xs text-[var(--text-muted)]">(você)</span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{PAPEL_LABEL[u.papel]}</p>
              </div>

              <Badge tone={TOM[u.situacao]}>{SITUACAO_LABEL[u.situacao]}</Badge>

              <div className="flex items-center gap-1">
                {ocupado === u.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                ) : (
                  <>
                    {u.situacao !== "aprovado" ? (
                      <Button
                        size="sm"
                        onClick={() => agir(u.id, { situacao: "aprovado" })}
                        title="Liberar acesso"
                      >
                        <Check className="h-3.5 w-3.5" /> Aprovar
                      </Button>
                    ) : null}
                    {/* A API recusa auto-bloqueio e auto-remoção; o botão some
                        aqui para o admin não descobrir isso por uma mensagem de
                        erro. */}
                    {u.situacao !== "bloqueado" && u.id !== eu?.id ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => agir(u.id, { situacao: "bloqueado" })}
                        title="Bloquear acesso"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {u.id !== eu?.id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remover(u)}
                        title="Remover conta"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </Card>
    </main>
  );
}

/** Criação direta: nasce já aprovada, porque é o admin que está criando. */
function NovoUsuario({ aoCriar }: { aoCriar: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({ email, senha, nome: null, admin: false }),
      });
      setEmail("");
      setSenha("");
      setAberto(false);
      await aoCriar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <Button variant="secondary" size="sm" className="mt-4" onClick={() => setAberto(true)}>
        <UserPlus className="h-4 w-4" /> Criar usuário
      </Button>
    );
  }

  return (
    <Card className="mt-4 p-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={enviar}>
        <label htmlFor="novo-email" className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
          <span className="text-xs text-[var(--text-secondary)]">E-mail</span>
          <Input
            id="novo-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </label>
        <label htmlFor="novo-senha" className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Senha (8+)</span>
          <Input
            id="novo-senha"
            type="password"
            required
            minLength={8}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={enviando}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Criar
        </Button>
        <Button variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </form>
      {erro ? <p className="mt-2 text-sm text-[var(--color-pulse-600)]">{erro}</p> : null}
    </Card>
  );
}
