import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { zerar } from "../estado";
import { LotePanel } from "./lote-panel";

/**
 * A aba montada de verdade. O que estes casos prendem é a promessa central:
 * **N linhas entram, N linhas saem, e nenhuma sai muda.**
 */

const respostas = new Map<string, unknown>();
const chamadas: string[] = [];

vi.mock("@/lib/lookup-cache", async (original) => {
  const real = await original<typeof import("@/lib/lookup-cache")>();
  return {
    ...real,
    consultar: (q: string) => {
      chamadas.push(q);
      const r = respostas.get(q) as { __rejeitar?: Error } | undefined;
      if (r?.__rejeitar) return Promise.reject(r.__rejeitar);
      return r ? Promise.resolve(r) : Promise.resolve({ q, consultou: [] });
    },
    cancelarDono: () => {},
    permissoesNaJanela: () => 0,
  };
});

beforeEach(() => {
  zerar();
  respostas.clear();
  chamadas.length = 0;
});
afterEach(() => {
  zerar();
});

const digitar = async (texto: string) => {
  const user = userEvent.setup();
  const campo = screen.getByLabelText("Uma entrada por linha");
  await user.clear(campo);
  await user.paste(texto);
  return user;
};

describe("LotePanel", () => {
  it("não consulta nada antes do clique", async () => {
    render(<LotePanel />);
    await digitar("89010000\n89020000");
    expect(chamadas).toHaveLength(0);
    expect(screen.getByRole("button", { name: /Consultar 2/ })).toBeInTheDocument();
  });

  /**
   * OS DESFECHOS COM TEXTOS DISTINTOS. Se dois deles convergirem para a mesma
   * frase, a aba perdeu a razão de existir — "não achei", "não sei procurar" e
   * "não sei se perguntei" viram o mesmo silêncio.
   */
  it("cada silêncio tem a sua frase", async () => {
    respostas.set("89010000", {
      q: "89010000",
      consultou: ["CepExato"],
      cep: {
        code: "89010000",
        logradouro: "Rua XV",
        bairro: "Centro",
        localidade: "Blumenau",
        uf: "SC",
      },
    });
    respostas.set("Bacurau", { q: "Bacurau", consultou: ["RuaOuBairro", "CidNome"] });
    respostas.set("MR-103", { q: "MR-103", consultou: [] });
    respostas.set("zzz9", { q: "zzz9" }); // API velha: sem o campo

    render(<LotePanel />);
    const user = await digitar("89010000\nBacurau\nMR-103\nzzz9\n...");
    await user.click(screen.getByRole("button", { name: /Consultar/ }));

    expect(await screen.findByText(/CEP: Rua XV/)).toBeInTheDocument();
    expect(
      await screen.findByText(/perguntei em rua ou bairro e em nome de doença/),
    ).toBeInTheDocument();
    expect(await screen.findByText(/não sei procurar isto/)).toBeInTheDocument();
    expect(
      await screen.findByText(/não sei dizer se alguma base foi consultada/),
    ).toBeInTheDocument();
  });

  it("a palavra “não existe” não aparece na tela", async () => {
    respostas.set("zzzz", { q: "zzzz", consultou: ["RuaOuBairro"] });
    render(<LotePanel />);
    const user = await digitar("zzzz");
    await user.click(screen.getByRole("button", { name: /Consultar/ }));
    await screen.findByText(/nenhuma tinha/);
    expect(document.body.textContent ?? "").not.toMatch(/não existe/i);
  });

  /**
   * O ALINHAMENTO DA COLUNA é a promessa que vai para a folha da prova: linha i
   * da saída = linha i da entrada. Duplicata NÃO colapsa; sem resposta vira `?`.
   */
  it("a coluna tem uma linha por linha de entrada, com ? no que não resolveu", async () => {
    respostas.set("89010000", {
      q: "89010000",
      consultou: ["CepExato"],
      cep: {
        code: "89010000",
        logradouro: "Rua XV",
        bairro: "Centro",
        localidade: "Blumenau",
        uf: "SC",
      },
    });
    render(<LotePanel />);
    const user = await digitar("89010000\nnada1\n89010000");
    await user.click(screen.getByRole("button", { name: /Consultar/ }));
    // Duas linhas iguais resolvem: espero as DUAS antes de ler a coluna.
    await screen.findAllByText(/CEP: Rua XV/);
    await vi.waitFor(() => {
      expect(document.querySelector("pre")?.textContent).toContain("?");
    });

    const bloco = document.querySelector("pre");
    const linhas = (bloco?.textContent ?? "").split("\n");
    expect(linhas).toHaveLength(3);
    expect(linhas[1]).toBe("?");
    // A duplicata desenha duas linhas e custa UMA consulta.
    expect(linhas[0]).toBe(linhas[2]);
    expect(chamadas.filter((c) => c === "89010000")).toHaveLength(1);
  });

  /**
   * O cabeçalho de integridade não pode dizer que está tudo certo quando não
   * está — é a defesa contra entregar meia lista achando que é a lista inteira.
   */
  it("com item não resolvido por falta de resposta, avisa que não está completo", async () => {
    respostas.set("zzz9", { q: "zzz9" });
    render(<LotePanel />);
    const user = await digitar("zzz9");
    await user.click(screen.getByRole("button", { name: /Consultar/ }));
    expect(await screen.findByText(/Este resultado NÃO está completo/)).toBeInTheDocument();
  });

  /**
   * Editar o campo depois da rodada NÃO pode re-indexar a coluna: ela sai do
   * instantâneo, não do texto vivo. Só aparece a faixa.
   */
  it("editar o texto depois avisa, e não mexe na coluna", async () => {
    respostas.set("89010000", {
      q: "89010000",
      consultou: ["CepExato"],
      cep: {
        code: "89010000",
        logradouro: "Rua XV",
        bairro: "Centro",
        localidade: "Blumenau",
        uf: "SC",
      },
    });
    render(<LotePanel />);
    const user = await digitar("89010000\nnada1");
    await user.click(screen.getByRole("button", { name: /Consultar/ }));
    await screen.findByText(/CEP: Rua XV/);
    const antes = document.querySelector("pre")?.textContent;

    await user.clear(screen.getByLabelText("Uma entrada por linha"));
    await user.paste("outra coisa");

    expect(await screen.findByText(/Estes resultados são do texto anterior/)).toBeInTheDocument();
    expect(document.querySelector("pre")?.textContent).toBe(antes);
  });

  /**
   * A colagem de PDF vem numa linha só. A bancada OFERECE dividir; nunca faz
   * sozinha — uma coordenada é um item e tem vírgula.
   */
  it("oferece dividir lista por vírgula, e só quando pedem", async () => {
    render(<LotePanel />);
    const user = await digitar("89010000, 89012000, 89015000");
    expect(screen.getByRole("button", { name: /Consultar 1/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /separada por vírgula/ }));
    expect(await screen.findByRole("button", { name: /Consultar 3/ })).toBeInTheDocument();
  });

  it("coordenada com vírgula não dispara a oferta de dividir", async () => {
    render(<LotePanel />);
    await digitar("-26.9194, -49.0661");
    expect(screen.queryByRole("button", { name: /separada por vírgula/ })).toBeNull();
  });

  it("linha longa demais não some — vira item com o motivo dito", async () => {
    render(<LotePanel />);
    const user = await digitar(`89010000\n${"x".repeat(80)}`);
    await user.click(screen.getByRole("button", { name: /Consultar 1/ }));
    expect(await screen.findByText(/80 caracteres, acima do limite de 64/)).toBeInTheDocument();
    expect(chamadas).toEqual(["89010000"]);
  });
});

/**
 * OS CONSERTOS DA REVISÃO ADVERSARIAL — cada um destes já foi um defeito real.
 */
describe("LotePanel — o que a revisão pegou", () => {
  const cepOk = (q: string, logradouro: string, bairro: string) => ({
    q,
    consultou: ["CepExato"],
    cep: { code: q, logradouro, bairro, localidade: "Blumenau", uf: "SC", lat: null, lng: null },
  });

  /**
   * A COLUNA NÃO ELEGE ENTRE CANDIDATOS. `41101634` é lote de Blumenau sem
   * hífens e admite mais de um agrupamento real — a resposta traz dois
   * endereços. A linha mostrava os dois; a coluna, que vai para a folha da
   * prova, saía com um só, sem marca nenhuma.
   */
  it("com dois candidatos, a coluna marca em vez de escolher", async () => {
    respostas.set("41101634", {
      q: "41101634",
      consultou: ["LoteBlumenau"],
      lotes: [
        { logradouro: "Rua Sao Paulo", numero: "100", bairro: "Itoupava", lat: null, lng: null },
        { logradouro: "Rua Amazonas", numero: "7", bairro: "Garcia", lat: null, lng: null },
      ],
    });
    render(<LotePanel />);
    const user = await digitar("41101634");
    await user.click(screen.getByRole("button", { name: /Consultar/ }));
    await screen.findByText(/Rua Sao Paulo/);

    const col = document.querySelector("pre")?.textContent ?? "";
    expect(col).toContain("2 candidatos");
    expect(col).not.toContain("Rua Sao Paulo");
    expect(col).not.toContain("Rua Amazonas");
  });

  /**
   * LINHA EM BRANCO NO MEIO NÃO DESLOCA A COLUNA. Quem cola de volta numa
   * planilha precisa das respostas nas mesmas linhas de onde tirou as
   * perguntas.
   */
  it("linha em branco vira célula vazia, e o alinhamento se mantém", async () => {
    respostas.set("bbb2", cepOk("bbb2", "Rua XV", "Centro"));
    render(<LotePanel />);
    const user = await digitar("aaa1\n\nbbb2");
    await user.click(screen.getByRole("button", { name: /Consultar/ }));
    await screen.findByText(/CEP: Rua XV/);

    const linhas = (document.querySelector("pre")?.textContent ?? "").split("\n");
    expect(linhas).toHaveLength(3);
    expect(linhas[0]).toBe("?");
    expect(linhas[1]).toBe("");
    expect(linhas[2]).toContain("Rua XV");
  });

  /**
   * O CAMPO ESCOLHIDO NÃO PODE SOBREVIVER A UMA RODADA QUE NÃO O TEM. Quem
   * escolheu "bairro" numa lista de CEPs e rodou uma lista de filmes ficava com
   * a coluna inteira em `?` — e sem o segmentado na tela para voltar.
   */
  it("campo que a rodada nova não tem volta para a resposta", async () => {
    respostas.set("89010000", cepOk("89010000", "Rua XV", "Centro"));
    respostas.set("tt0111161", {
      q: "tt0111161",
      consultou: ["Filme"],
      filme: { imdbId: "tt0111161", tituloBr: "Um Sonho de Liberdade", ano: 1994 },
    });
    render(<LotePanel />);
    const user = await digitar("89010000");
    await user.click(screen.getByRole("button", { name: /Consultar/ }));
    await screen.findByText(/CEP: Rua XV/);
    await user.click(screen.getByRole("button", { name: "bairro" }));
    expect(document.querySelector("pre")?.textContent).toBe("Centro");

    await user.clear(screen.getByLabelText("Uma entrada por linha"));
    await user.paste("tt0111161");
    await user.click(screen.getByRole("button", { name: /Consultar/ }));
    // O título aparece na linha E na coluna — as duas ocorrências são o ponto.
    await screen.findAllByText(/Um Sonho de Liberdade/);
    // Não pode ficar em `?` com o seletor sumido: cai para a resposta.
    expect(document.querySelector("pre")?.textContent).toContain("Um Sonho de Liberdade");
  });

  /**
   * DEPOIS DO 429 A RODADA ACABOU. O botão ficava vermelho escrito "Parar" logo
   * acima de uma frase mandando rodar de novo — e "Parar" não parava nada.
   */
  it("no 429 o botão volta a ser Consultar", async () => {
    const { ApiError } = await import("@/lib/api");
    respostas.set("__erro__", null);
    render(<LotePanel />);
    const user = await digitar("aaa1");
    const original = respostas.get("aaa1");
    respostas.set("aaa1", null);
    // Faz o mock rejeitar com 429.
    const erro = new ApiError(429, "muitas requisições");
    respostas.set("aaa1", { __rejeitar: erro } as never);
    await user.click(screen.getByRole("button", { name: /Consultar/ }));
    await screen.findByText(/limite de requisições/);
    expect(screen.getByRole("button", { name: /Consultar/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Parar" })).toBeNull();
    respostas.set("aaa1", original as never);
  });

  /**
   * VOLTAR PARA A ABA NÃO PODE ACENDER "resultados do texto anterior" sem
   * ninguém ter digitado: o texto é parte da rodada, não do componente.
   */
  it("o texto sobrevive à troca de aba", async () => {
    respostas.set("89010000", cepOk("89010000", "Rua XV", "Centro"));
    const { unmount } = render(<LotePanel />);
    const user = await digitar("89010000");
    await user.click(screen.getByRole("button", { name: /Consultar/ }));
    await screen.findByText(/CEP: Rua XV/);
    unmount();

    render(<LotePanel />);
    expect(screen.getByLabelText("Uma entrada por linha")).toHaveValue("89010000");
    expect(screen.queryByText(/resultados são do texto anterior/)).toBeNull();
  });
});
