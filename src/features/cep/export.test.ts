import * as api from "@/lib/api";
import * as baixar from "@/lib/baixar";
import { afterEach, describe, expect, it, vi } from "vitest";
import { baixarCsvDeCeps, estadoDoExport, limparExports, ouvirExport } from "./export";

vi.mock("@/lib/api", async () => {
  const real = await vi.importActual<typeof api>("@/lib/api");
  return { ...real, apiFetchArquivo: vi.fn() };
});
vi.mock("@/lib/baixar", () => ({ baixarArquivo: vi.fn(() => true) }));

const pedirArquivo = vi.mocked(api.apiFetchArquivo);
const salvar = vi.mocked(baixar.baixarArquivo);

describe("baixarCsvDeCeps", () => {
  afterEach(() => {
    limparExports();
    vi.clearAllMocks();
    salvar.mockReturnValue(true);
  });

  it("pede o padrão ao servidor e salva com o nome que ele devolveu", async () => {
    pedirArquivo.mockResolvedValue({ blob: new Blob(["x"]), nome: "ceps-88xxx500.csv" });

    await baixarCsvDeCeps("88xxx500");

    expect(pedirArquivo).toHaveBeenCalledWith("/cep/export?pattern=88xxx500", "ceps.csv");
    expect(salvar).toHaveBeenCalledWith(expect.any(Blob), "ceps-88xxx500.csv");
    expect(estadoDoExport("88xxx500")).toEqual({ fase: "parado" });
  });

  /**
   * O motivo de este módulo existir: o card morre quando a pessoa continua
   * digitando, e o estado não pode morrer junto.
   */
  it("guarda o estado no padrão, e não em quem pediu", async () => {
    let resolver!: (v: api.ApiArquivo) => void;
    pedirArquivo.mockReturnValue(
      new Promise((r) => {
        resolver = r;
      }),
    );

    const p = baixarCsvDeCeps("88xxx500");
    expect(estadoDoExport("88xxx500")).toEqual({ fase: "baixando" });
    // Outro padrão não herda o estado deste.
    expect(estadoDoExport("88xxx501")).toEqual({ fase: "parado" });

    resolver({ blob: new Blob(["x"]), nome: "ceps-88xxx500.csv" });
    await p;
    expect(estadoDoExport("88xxx500")).toEqual({ fase: "parado" });
  });

  it("avisa quem está ouvindo a cada virada de estado", async () => {
    pedirArquivo.mockResolvedValue({ blob: new Blob(["x"]), nome: "c.csv" });
    const cb = vi.fn();
    const parar = ouvirExport("88xxx500", cb);

    await baixarCsvDeCeps("88xxx500");

    expect(cb).toHaveBeenCalledTimes(2); // baixando, depois parado
    parar();
    await baixarCsvDeCeps("88xxx500");
    expect(cb).toHaveBeenCalledTimes(2); // não avisa mais depois de desinscrever
  });

  it("não dispara duas requisições para dois cliques no mesmo padrão", async () => {
    pedirArquivo.mockReturnValue(new Promise(() => {}));

    void baixarCsvDeCeps("88xxx500");
    void baixarCsvDeCeps("88xxx500");

    expect(pedirArquivo).toHaveBeenCalledTimes(1);
  });

  /** O 429 é o erro que a bancada realmente vê — o balde por IP é compartilhado. */
  it("mostra a mensagem do servidor quando a exportação falha", async () => {
    pedirArquivo.mockRejectedValue(
      new api.ApiError(429, "Muitas consultas. Aguarde alguns segundos."),
    );

    await baixarCsvDeCeps("88xxx500");

    expect(estadoDoExport("88xxx500")).toEqual({
      fase: "erro",
      mensagem: "Muitas consultas. Aguarde alguns segundos.",
    });
  });

  /**
   * O 401 já derruba a sessão dentro do clique e a tela troca embaixo da
   * pessoa; uma mensagem nossa competiria com a tela de login.
   */
  it("não inventa mensagem quando o 401 derruba a sessão", async () => {
    pedirArquivo.mockRejectedValue(new api.ApiError(401, "Sessão expirada. Entre de novo."));

    await baixarCsvDeCeps("88xxx500");

    expect(estadoDoExport("88xxx500")).toEqual({ fase: "parado" });
  });

  /**
   * A queda de rede não é `ApiError`: ela rejeita o próprio `fetch` (e o
   * `blob()`, que é onde os MB trafegam) com um `TypeError` do navegador. Sem
   * o guard, o card mostraria "Failed to fetch" em inglês — o mesmo defeito
   * que o `brasilapi.ts` já consertou uma vez.
   */
  it("não mostra o texto do navegador quando a conexão cai", async () => {
    pedirArquivo.mockRejectedValue(new TypeError("Failed to fetch"));

    await baixarCsvDeCeps("88xxx500");

    expect(estadoDoExport("88xxx500")).toEqual({
      fase: "erro",
      mensagem: "Não consegui baixar o arquivo — a conexão caiu no meio.",
    });
  });

  it("avisa quando o navegador recusa salvar", async () => {
    pedirArquivo.mockResolvedValue({ blob: new Blob(["x"]), nome: "c.csv" });
    salvar.mockReturnValue(false);

    await baixarCsvDeCeps("88xxx500");

    expect(estadoDoExport("88xxx500")).toEqual({
      fase: "erro",
      mensagem: "O navegador não deixou salvar o arquivo.",
    });
  });
});
