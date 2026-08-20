import { afterEach, describe, expect, it, vi } from "vitest";
import { baixarArquivo } from "./baixar";

/**
 * O jsdom não implementa `URL.createObjectURL` — por isso todo teste que toque
 * um download precisa estubar. Ficam aqui os dois caminhos que a UI depende de
 * distinguir: baixou, e o navegador recusou.
 */
describe("baixarArquivo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function comUrlDeBlob(createObjectURL: () => string) {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: revoke });
    return revoke;
  }

  it("salva o arquivo com o nome que veio do servidor", () => {
    const revoke = comUrlDeBlob(() => "blob:fake");
    const clicadas: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicadas.push(this);
    });

    expect(baixarArquivo(new Blob(["a;b"]), "ceps-88xxx500.csv")).toBe(true);

    expect(clicadas[0]?.download).toBe("ceps-88xxx500.csv");
    expect(clicadas[0]?.href).toBe("blob:fake");
    // Sem o revoke o blob inteiro fica preso na memória da aba.
    expect(revoke).toHaveBeenCalledWith("blob:fake");
  });

  it("devolve false em vez de estourar quando o navegador recusa", () => {
    comUrlDeBlob(() => {
      throw new Error("quota");
    });
    // Se isto lançar, o `onClick` do card sobe exceção crua e a pessoa não vê
    // mensagem nenhuma — que é o desfecho que o booleano existe para evitar.
    expect(baixarArquivo(new Blob(["a"]), "x.csv")).toBe(false);
  });
});
