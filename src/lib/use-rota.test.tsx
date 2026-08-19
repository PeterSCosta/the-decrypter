import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useRota } from "./use-rota";

/**
 * As três coisas que a rota precisa acertar, e a quarta que quase passou.
 *
 * A guarda do painel de usuários mora aqui, e ela já nasceu ERRADA uma vez —
 * pego no navegador, não em teste: `podeAdmin` chegava `false` enquanto a
 * sessão ainda carregava, então abrir `/usuarios` direto reescrevia a URL para
 * `/` no meio segundo entre montar e saber quem é a pessoa. Justo o instante em
 * que um endereço compartilhado precisa sobreviver. Por isso o parâmetro é
 * `boolean | null`, e por isso este teste separa "não pode" de "não sei ainda".
 */
const irPara = (caminho: string) => window.history.replaceState(null, "", caminho);

describe("useRota", () => {
  beforeEach(() => irPara("/"));

  it("link fundo: o caminho manda na tela", () => {
    irPara("/geolocalizacao");
    const { result } = renderHook(() => useRota(true));
    expect(result.current.aba).toBe("geo");
    expect(result.current.painel).toBe("app");
  });

  it("trocar de aba escreve na barra de endereço", () => {
    const { result } = renderHook(() => useRota(true));
    act(() => result.current.irParaAba("library"));
    expect(window.location.pathname).toBe("/biblioteca");
    expect(result.current.aba).toBe("library");
  });

  it("o Voltar do navegador devolve a tela anterior", () => {
    // Antes da rota, o Voltar SAÍA do app: para o navegador nunca tinha havido
    // navegação nenhuma dentro da bancada.
    const { result } = renderHook(() => useRota(true));
    act(() => result.current.irParaAba("geo"));
    act(() => result.current.irParaAba("postes"));
    expect(window.location.pathname).toBe("/postes");

    act(() => {
      window.history.back();
      window.dispatchEvent(new PopStateEvent("popstate", { state: { painel: "app", aba: "geo" } }));
    });
    expect(result.current.aba).toBe("geo");
  });

  it("quem NÃO é admin não entra em /usuarios, e a URL se corrige", () => {
    irPara("/usuarios");
    const { result } = renderHook(() => useRota(false));
    expect(result.current.painel).toBe("app");
    expect(window.location.pathname).toBe("/");
  });

  it("enquanto a sessão CARREGA, a rota de admin sobrevive", () => {
    // O bug medido: tratar "ainda não sei" como "não pode" matava o link
    // compartilhado antes de o app saber quem era a pessoa.
    irPara("/usuarios");
    const { result } = renderHook(() => useRota(null));
    expect(result.current.painel).toBe("admin");
    expect(window.location.pathname).toBe("/usuarios");
  });

  it("caminho desconhecido cai na bancada e a barra se corrige sem empurrar histórico", () => {
    irPara("/rota-que-nao-existe");
    const antes = window.history.length;
    const { result } = renderHook(() => useRota(true));
    expect(result.current.aba).toBe("decoder");
    expect(window.location.pathname).toBe("/");
    // `replace`, não `push`: empurrar faria o Voltar levar de volta ao endereço
    // quebrado, e de lá a correção empurraria de novo — laço sem saída.
    expect(window.history.length).toBe(antes);
  });

  it("atalho de cifra: o endereço abre a bancada com ela isolada", () => {
    irPara("/cifra/base64");
    const { result } = renderHook(() => useRota(true, true));
    expect(result.current.aba).toBe("decoder");
    expect(result.current.cifra).toBe("base64");
  });

  it("trocar de cifra escreve na barra; soltar volta para a raiz", () => {
    const { result } = renderHook(() => useRota(true, true));
    act(() => result.current.irParaCifra("atbash"));
    expect(window.location.pathname).toBe("/cifra/atbash");
    act(() => result.current.irParaCifra(null));
    expect(window.location.pathname).toBe("/");
  });

  it("cifra que NÃO existe sai do endereço em vez de virar beco sem saída", () => {
    // Sem isto, a bancada rodava "só" um decoder inexistente: lista filtrada
    // vazia, zero resultado, e nenhuma explicação na tela.
    irPara("/cifra/nao-existe");
    const { result } = renderHook(() => useRota(true, false));
    expect(result.current.cifra).toBeNull();
    expect(window.location.pathname).toBe("/");
  });

  it("enquanto ninguém checou a cifra, o endereço sobrevive", () => {
    // Mesma regra da guarda de admin: "não sei ainda" não é "não existe".
    irPara("/cifra/base64");
    const { result } = renderHook(() => useRota(true, null));
    expect(result.current.cifra).toBe("base64");
    expect(window.location.pathname).toBe("/cifra/base64");
  });
});
