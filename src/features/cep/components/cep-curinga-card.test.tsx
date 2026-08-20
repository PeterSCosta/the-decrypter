import type { ApiArquivo } from "@/lib/api";
import * as api from "@/lib/api";
import * as baixar from "@/lib/baixar";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { limparExports } from "../export";
import type { CepCuringaData } from "../types";
import { CepCuringaCard } from "./cep-curinga-card";

// Mocamos só a FRONTEIRA (rede e salvar-arquivo). O `export.ts` fica real: é
// justamente a conversa entre ele e o card que estes testes precisam provar.
vi.mock("@/lib/api", async () => {
  const real = await vi.importActual<typeof api>("@/lib/api");
  return { ...real, apiFetchArquivo: vi.fn() };
});
vi.mock("@/lib/baixar", () => ({ baixarArquivo: vi.fn(() => true) }));

const pedirArquivo = vi.mocked(api.apiFetchArquivo);
const salvar = vi.mocked(baixar.baixarArquivo);

const botao = () => screen.getByRole("button", { name: /Baixar CSV|Baixando/ });

function dados(over: Partial<CepCuringaData> = {}): CepCuringaData {
  return {
    padrao: "88xxx500",
    total: 213,
    hits: Array.from({ length: 12 }, (_, i) => ({
      cep: String(88010500 + i),
      logradouro: `Rua ${i}`,
      localidade: "Centro",
      municipio: "Florianópolis",
      lat: null,
      lng: null,
    })),
    ...over,
  };
}

describe("CepCuringaCard", () => {
  afterEach(() => {
    limparExports();
    vi.clearAllMocks();
    salvar.mockReturnValue(true);
  });

  it("lista os acertos que couberam no card", () => {
    render(<CepCuringaCard data={dados()} />);
    expect(screen.getAllByText(/^88010-5\d\d$/)).toHaveLength(12);
  });

  it("avisa que o arquivo traz mais CEPs do que a lista mostra", () => {
    render(<CepCuringaCard data={dados()} />);
    expect(screen.getByText("o arquivo traz os 213; a lista acima mostra 12")).toBeInTheDocument();
  });

  it("cala o aviso quando a lista já é tudo", () => {
    render(<CepCuringaCard data={dados({ total: 12 })} />);
    expect(screen.queryByText(/o arquivo traz/)).not.toBeInTheDocument();
  });

  it("pede o CSV do padrão que o card está mostrando e salva o que voltou", async () => {
    pedirArquivo.mockResolvedValue({ blob: new Blob(["x"]), nome: "ceps-88xxx500.csv" });
    render(<CepCuringaCard data={dados()} />);

    await userEvent.click(botao());

    expect(pedirArquivo).toHaveBeenCalledWith("/cep/export?pattern=88xxx500", "ceps.csv");
    await waitFor(() => expect(salvar).toHaveBeenCalledWith(expect.any(Blob), "ceps-88xxx500.csv"));
  });

  it("desabilita o botão enquanto o arquivo não chega", async () => {
    pedirArquivo.mockReturnValue(new Promise(() => {}));
    render(<CepCuringaCard data={dados()} />);

    await userEvent.click(botao());

    expect(botao()).toBeDisabled();
    expect(botao()).toHaveTextContent("Baixando…");
  });

  /**
   * O TESTE QUE PRENDE O DESENHO. O card é remontado a cada tecla — a chave
   * dele inclui o `output`, que muda com o padrão. Se o estado do download
   * morasse num `useState` daqui, o remonte apagaria o "Baixando…" e, pior, a
   * mensagem de erro que chegasse depois: nem arquivo, nem aviso, e a pessoa
   * concluindo que o botão não funciona.
   */
  it("reencontra o download em voo depois de o card ser remontado", async () => {
    pedirArquivo.mockReturnValue(new Promise(() => {}));
    const tela = render(<CepCuringaCard data={dados()} />);
    await userEvent.click(botao());
    expect(botao()).toHaveTextContent("Baixando…");

    tela.unmount();
    render(<CepCuringaCard data={dados()} />);

    expect(botao()).toHaveTextContent("Baixando…");
    expect(botao()).toBeDisabled();
    // E não virou uma segunda requisição.
    expect(pedirArquivo).toHaveBeenCalledTimes(1);
  });

  it("mostra a mensagem do servidor quando a exportação falha", async () => {
    pedirArquivo.mockRejectedValue(
      new api.ApiError(429, "Muitas consultas. Aguarde alguns segundos."),
    );
    render(<CepCuringaCard data={dados()} />);

    await userEvent.click(botao());

    await waitFor(() =>
      expect(screen.getByText("Muitas consultas. Aguarde alguns segundos.")).toBeInTheDocument(),
    );
    expect(botao()).toBeEnabled();
  });

  it("o erro sobrevive ao remonte do card", async () => {
    pedirArquivo.mockRejectedValue(
      new api.ApiError(429, "Muitas consultas. Aguarde alguns segundos."),
    );
    const tela = render(<CepCuringaCard data={dados()} />);
    await userEvent.click(botao());
    await waitFor(() => screen.getByText(/Muitas consultas/));

    tela.unmount();
    render(<CepCuringaCard data={dados()} />);

    expect(screen.getByText("Muitas consultas. Aguarde alguns segundos.")).toBeInTheDocument();
  });

  /** Cada padrão tem o seu estado: o erro de um não suja o card do outro. */
  it("não vaza o erro de um padrão para outro", async () => {
    pedirArquivo.mockRejectedValue(new api.ApiError(429, "Muitas consultas."));
    const tela = render(<CepCuringaCard data={dados()} />);
    await userEvent.click(botao());
    await waitFor(() => screen.getByText(/Muitas consultas/));

    tela.unmount();
    render(<CepCuringaCard data={dados({ padrao: "88xxx501" })} />);

    expect(screen.queryByText(/Muitas consultas/)).not.toBeInTheDocument();
  });

  it("avisa quando o navegador recusa salvar o arquivo", async () => {
    pedirArquivo.mockResolvedValue({ blob: new Blob(["x"]), nome: "c.csv" } as ApiArquivo);
    salvar.mockReturnValue(false);
    render(<CepCuringaCard data={dados()} />);

    await userEvent.click(botao());

    await waitFor(() =>
      expect(screen.getByText("O navegador não deixou salvar o arquivo.")).toBeInTheDocument(),
    );
  });
});
