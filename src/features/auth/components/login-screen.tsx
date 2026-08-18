import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle, AtSign, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";
import { mensagemDeErro, useAuth } from "../use-auth";

/**
 * Porta de entrada. Duas abas — entrar e criar conta — porque o cadastro é
 * aberto, mas quem entra depende de aprovação do admin: a tela precisa dizer
 * isso com todas as letras, senão a pessoa se cadastra e fica achando que a
 * senha está errada.
 *
 * ── UM CAMPO SÓ PARA ENTRAR ─────────────────────────────────────────────────
 * "Apelido ou e-mail" é um campo, não dois nem duas abas: quem já tinha conta
 * digita o e-mail de sempre, quem se cadastrou depois digita o apelido, e
 * ninguém precisa lembrar em qual grupo caiu. O servidor decide pela presença do
 * `@` — e é por isso que o apelido proíbe `@`.
 *
 * O `type` deste campo é `text` de propósito: com `type="email"` o navegador
 * BLOQUEIA o envio de qualquer coisa sem arroba, e o apelido não sairia da tela.
 */
export function LoginScreen() {
  const { entrar, cadastrar } = useAuth();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [identificador, setIdentificador] = useState("");
  const [apelido, setApelido] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const trocarModo = (m: typeof modo) => {
    setModo(m);
    setErro(null);
    setAviso(null);
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      if (modo === "entrar") {
        await entrar(identificador, senha);
      } else {
        setAviso(await cadastrar(apelido, senha, email));
        // O apelido vai junto para o campo de entrar: quem acabou de escolher
        // não deveria digitá-lo de novo para descobrir que ainda falta aprovar.
        setIdentificador(apelido);
        setModo("entrar");
        setSenha("");
      }
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-page)] px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-display text-2xl text-[var(--text-primary)]">
          The Decrypter
        </h1>
        <p className="mt-1 text-center text-sm text-[var(--text-secondary)]">oficina de cifras</p>

        <Card className="mt-6 overflow-hidden">
          <div
            className="flex border-b border-[var(--border-subtle)]"
            role="tablist"
            aria-label="Entrar ou criar conta"
          >
            {(["entrar", "criar"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={modo === m}
                onClick={() => trocarModo(m)}
                className={
                  modo === m
                    ? "flex-1 border-b-2 border-[var(--brand)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]"
                    : "flex-1 border-b-2 border-transparent px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }
              >
                {m === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form className="flex flex-col gap-3 p-4" onSubmit={enviar}>
            {modo === "entrar" ? (
              <label htmlFor="login-identificador" className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <AtSign className="h-3.5 w-3.5" /> Apelido ou e-mail
                </span>
                <Input
                  id="login-identificador"
                  type="text"
                  required
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="peter ou peter@exemplo.com"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                />
              </label>
            ) : (
              <>
                <label htmlFor="login-apelido" className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <AtSign className="h-3.5 w-3.5" /> Apelido
                  </span>
                  <Input
                    id="login-apelido"
                    type="text"
                    required
                    value={apelido}
                    onChange={(e) => setApelido(e.target.value)}
                    placeholder="como você vai entrar"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                  />
                </label>

                <label htmlFor="login-email" className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <Mail className="h-3.5 w-3.5" /> E-mail (opcional)
                  </span>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    autoComplete="email"
                  />
                  <span className="text-[0.6875rem] text-[var(--text-muted)]">
                    Não enviamos nada — nem confirmação, nem recuperação de senha. Serve só para o
                    administrador te reconhecer.
                  </span>
                </label>
              </>
            )}

            <label htmlFor="login-senha" className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <KeyRound className="h-3.5 w-3.5" /> Senha
              </span>
              <Input
                id="login-senha"
                type="password"
                required
                minLength={8}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={modo === "criar" ? "Ao menos 8 caracteres" : "Sua senha"}
                autoComplete={modo === "criar" ? "new-password" : "current-password"}
              />
              {modo === "criar" ? (
                <span className="text-[0.6875rem] text-[var(--text-muted)]">
                  Guarde a senha: não há recuperação automática. Esquecendo, só o administrador
                  redefine.
                </span>
              ) : null}
            </label>

            {erro ? (
              <p className="flex items-start gap-2 text-sm text-[var(--color-pulse-600)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {erro}
              </p>
            ) : null}
            {aviso ? (
              <p className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
                {aviso}
              </p>
            ) : null}

            <Button type="submit" disabled={enviando} className="mt-1 w-full">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {modo === "entrar" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
        </Card>

        {modo === "criar" ? (
          <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
            O acesso é liberado manualmente por um administrador. Você recebe a conta agora e entra
            quando ela for aprovada.
          </p>
        ) : null}
      </div>
    </div>
  );
}
