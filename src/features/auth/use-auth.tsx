import { ApiError, aoExpirarSessao, apiFetch, getToken, setToken } from "@/lib/api";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Sessao, Usuario } from "./types";

/**
 * Sessão do app. É o **único** provider da árvore — antes disto o estado todo
 * morava em `useState` dentro de `App.tsx`, e continua assim para o resto; só a
 * sessão precisa ser lida de qualquer lugar (a bancada, o painel de admin, o
 * `apiFetch` quando o token expira).
 */
interface Auth {
  usuario: Usuario | null;
  /** `true` até sabermos se o token guardado ainda vale. */
  carregando: boolean;
  /** O campo único do login: apelido OU e-mail, o servidor decide pelo `@`. */
  entrar(identificador: string, senha: string): Promise<void>;
  cadastrar(apelido: string, senha: string, email: string): Promise<string>;
  sair(): void;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Restaura a sessão no boot. O token pode ter expirado, ou a conta pode ter
  // sido bloqueada/removida depois de emitido — por isso pergunta à API em vez
  // de confiar no que está no storage.
  useEffect(() => {
    if (!getToken()) {
      setCarregando(false);
      return;
    }
    let vivo = true;
    apiFetch<Usuario>("/auth/me")
      .then((u) => vivo && setUsuario(u))
      .catch(() => vivo && setUsuario(null))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, []);

  // Qualquer 401 em qualquer chamada derruba a sessão: sem isso a pessoa ficaria
  // clicando numa tela logada que não responde mais nada.
  useEffect(() => aoExpirarSessao(() => setUsuario(null)), []);

  const entrar = useCallback(async (identificador: string, senha: string) => {
    const sessao = await apiFetch<Sessao>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identificador, senha }),
    });
    setToken(sessao.token);
    setUsuario(sessao.usuario);
  }, []);

  const cadastrar = useCallback(async (apelido: string, senha: string, email: string) => {
    const r = await apiFetch<{ message: string }>("/auth/register", {
      method: "POST",
      // O e-mail vai só quando foi preenchido: string vazia viraria uma conta
      // com e-mail "" — e a segunda delas colidiria no índice único.
      body: JSON.stringify({ apelido, senha, email: email.trim() || null }),
    });
    return r.message;
  }, []);

  const sair = useCallback(() => {
    setToken(null);
    setUsuario(null);
  }, []);

  const valor = useMemo<Auth>(
    () => ({ usuario, carregando, entrar, cadastrar, sair }),
    [usuario, carregando, entrar, cadastrar, sair],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

/** Mensagem de erro legível para a tela de login. */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Não consegui falar com o servidor. Tente de novo.";
}
