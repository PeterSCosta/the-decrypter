import { useCallback, useEffect, useState } from "react";
import { type Rota, type RotaAba, type RotaPainel, escreverCaminho, lerCaminho } from "./rota";

/**
 * Mantém a rota e a barra de endereço em sincronia — nos DOIS sentidos.
 *
 * ── AS TRÊS COISAS QUE ISTO PRECISA ACERTAR ─────────────────────────────────
 * 1. **Link fundo**: abrir `/usuarios` direto já entra no painel de usuários.
 * 2. **Voltar do navegador**: `popstate` devolve o estado anterior em vez de
 *    sair do app. Antes disso o Voltar era destrutivo — para o navegador nunca
 *    tinha havido navegação nenhuma dentro da bancada.
 * 3. **F5**: recarregar mantém onde a pessoa estava.
 *
 * ── PUSH OU REPLACE, E POR QUE IMPORTA ──────────────────────────────────────
 * Trocar de aba faz `pushState`: são navegações de verdade, e a pessoa espera
 * poder voltar. Mas a CORREÇÃO de uma rota inválida faz `replaceState` — se
 * empurrasse, o Voltar levaria de volta ao endereço quebrado, e de lá a
 * correção empurraria de novo: a pessoa ficaria presa num laço sem entender por
 * quê. Rota inválida acontece com link velho, com apelido digitado errado e com
 * `/usuarios` aberto por quem não é admin.
 */
/**
 * `null` = ainda não se sabe (sessão carregando). A distinção não é preciosismo:
 * ver a nota da guarda de admin abaixo.
 */
export function useRota(podeAdmin: boolean | null): {
  aba: RotaAba;
  painel: RotaPainel;
  irParaAba: (a: RotaAba) => void;
  irParaPainel: (p: RotaPainel) => void;
  alternarPainel: (p: Exclude<RotaPainel, "app">) => void;
} {
  const [rota, setRota] = useState<Rota>(() =>
    lerCaminho(typeof window === "undefined" ? "/" : window.location.pathname),
  );

  const navegar = useCallback((nova: Rota, modo: "push" | "replace") => {
    setRota(nova);
    const caminho = escreverCaminho(nova);
    if (caminho === window.location.pathname) return;
    // `state` guarda a própria rota para o `popstate` não ter de reinterpretar
    // o caminho — e para o histórico continuar certo se os apelidos mudarem.
    if (modo === "push") window.history.pushState(nova, "", caminho);
    else window.history.replaceState(nova, "", caminho);
  }, []);

  /**
   * O painel de usuários não é para todo mundo.
   *
   * Ele nem aparece na barra para quem não é admin — mas a URL é pública, e
   * alguém vai mandar `/usuarios` para a equipe inteira. Sem esta guarda, quem
   * não pode entrar veria o painel montar e falhar por 403 da API, o que é pior
   * que não abrir: parece defeito. Aqui a rota volta para a bancada e o endereço
   * se corrige junto, com `replace`.
   */
  useEffect(() => {
    /**
     * `podeAdmin === null` é "ainda carregando", e tratar isso como "não pode"
     * FOI UM BUG — medido no navegador: abrir `/usuarios` direto reescrevia a
     * URL para `/` antes de a sessão resolver, mesmo sendo admin. O endereço
     * compartilhado morria no meio segundo entre montar e saber quem é a
     * pessoa, que é exatamente quando ele mais precisa sobreviver.
     */
    if (rota.painel === "admin" && podeAdmin === false) {
      navegar({ painel: "app", aba: rota.aba }, "replace");
      return;
    }
    // Normaliza a barra de endereço na primeira carga: `/GEOLOCALIZACAO/` e
    // `/nao-existe` viram o caminho canônico sem empurrar histórico.
    const canonico = escreverCaminho(rota);
    if (window.location.pathname !== canonico) {
      window.history.replaceState(rota, "", canonico);
    }
  }, [rota, podeAdmin, navegar]);

  useEffect(() => {
    const aoVoltar = (e: PopStateEvent) => {
      // O `state` é a fonte quando existe; o caminho é o socorro para quem
      // chegou por link colado, onde o `state` é nulo.
      const alvo = (e.state as Rota | null) ?? lerCaminho(window.location.pathname);
      setRota(alvo);
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  const irParaAba = useCallback(
    (a: RotaAba) => navegar({ painel: "app", aba: a }, "push"),
    [navegar],
  );
  const irParaPainel = useCallback(
    (p: RotaPainel) => navegar({ painel: p, aba: rota.aba }, "push"),
    [navegar, rota.aba],
  );
  /** O botão da topbar liga e desliga o mesmo painel. */
  const alternarPainel = useCallback(
    (p: Exclude<RotaPainel, "app">) =>
      navegar({ painel: rota.painel === p ? "app" : p, aba: rota.aba }, "push"),
    [navegar, rota],
  );

  return { aba: rota.aba, painel: rota.painel, irParaAba, irParaPainel, alternarPainel };
}
