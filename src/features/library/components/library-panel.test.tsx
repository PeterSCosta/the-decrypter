import type { FichasData } from "@/features/ficha/types";
import type { LojasData } from "@/features/loja/types";
import * as api from "@/lib/api";
import * as data from "@/lib/data";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LibraryPanel } from "./library-panel";

/**
 * O PRIMEIRO TESTE DA BIBLIOTECA — e ele existe por causa de uma armadilha
 * concreta, não por completude.
 *
 * O botão "Navegar" sempre chamou `/library/{id}`. Uma base que vive no
 * NAVEGADOR não tem id no backend: o switch de lá conhece oito, devolve 404
 * para o resto, e o `catch` do painel apenas zerava os dados. Resultado: uma
 * tabela sem cabeçalho, sem linhas e sem uma palavra dizendo o que houve —
 * exatamente o vazio calado que a casa proíbe.
 *
 * Por isso a base local agora carrega o próprio provedor, e por isso estes
 * casos afirmam as duas metades: que ela navega SEM a API, e que uma falha
 * aparece escrita na tela.
 */

vi.mock("@/lib/api", async () => {
  const real = await vi.importActual<typeof api>("@/lib/api");
  return { ...real, apiFetch: vi.fn() };
});
vi.mock("@/lib/data", async () => {
  const real = await vi.importActual<typeof data>("@/lib/data");
  return { ...real, loadLojas: vi.fn(), loadFichas: vi.fn() };
});

const pedir = vi.mocked(api.apiFetch);
const pedirLojas = vi.mocked(data.loadLojas);
const pedirFichas = vi.mocked(data.loadFichas);

const shopping = (id: string, nome: string) => ({
  id,
  nome,
  apelidos: [],
  endereco: "",
  bairro: "",
  cep: "",
  site: "",
  telefone: "",
  grupo: null,
  numeracaoPublica: true,
  identificadorTipo: "luc",
  formatoIdentificador: null,
  fonte: "",
  url: "",
  consultadoEm: "2026-08-20",
});

const LOJAS: LojasData = {
  source: "Guias de loja dos quatro shoppings",
  generatedAt: "2026-08-20",
  cobertura: "Blumenau/SC",
  aviso: "a fonte usada não traz o número; a página de detalhe traz",
  count: 3,
  comIdentificador: 2,
  identificadoresDistintos: 2,
  shoppings: [shopping("park", "Shopping Park Europeu"), shopping("neu", "Neumarkt Shopping")],
  rows: [
    [0, "L2032", "60 Sabores", "2º Piso", "Praça De Alimentação", ["ALIMENTAÇÃO"], false],
    [0, "2024", "Mistura Brasileira", "2º Piso", "Praça De Alimentação", ["ALIMENTAÇÃO"], false],
    [1, null, "Swarovski", null, null, [], false],
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  pedir.mockRejectedValue(new Error("Consulta indisponível — o serviço não respondeu."));
  pedirLojas.mockResolvedValue(LOJAS);
  pedirFichas.mockRejectedValue(new Error("sem fichas neste caso"));
});

describe("a base de lojas na Biblioteca", () => {
  it("aparece com a contagem vinda do artefato, não de um literal", async () => {
    render(<LibraryPanel aoAbrirPostes={() => {}} />);
    await screen.findByText(/Lojas dos shoppings de Blumenau/);
    // 3 registros e a frase de cobertura desigual, ambos derivados do dado.
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/2 das 3 publicam o número/)).toBeInTheDocument();
  });

  /**
   * A metade que motivou o arquivo: com a API FORA (é o que o `beforeEach`
   * monta), a base local continua listada E continua navegável.
   */
  it("navega com a API fora do ar", async () => {
    const u = userEvent.setup();
    render(<LibraryPanel aoAbrirPostes={() => {}} />);
    await screen.findByText(/Lojas dos shoppings de Blumenau/);

    await u.click(screen.getByRole("button", { name: "Navegar" }));

    await screen.findByText("60 Sabores");
    expect(screen.getByText("Mistura Brasileira")).toBeInTheDocument();
    expect(screen.getByText("Swarovski")).toBeInTheDocument();
    // E nenhuma requisição de tabela saiu: a paginação é em memória.
    expect(pedir).not.toHaveBeenCalledWith(expect.stringContaining("/library/loja-blumenau"));
  });

  it("mostra as colunas de piso, ala e ramo", async () => {
    const u = userEvent.setup();
    render(<LibraryPanel aoAbrirPostes={() => {}} />);
    await screen.findByText(/Lojas dos shoppings de Blumenau/);
    await u.click(screen.getByRole("button", { name: "Navegar" }));

    await screen.findByText("60 Sabores");
    for (const c of ["shopping", "identificador", "loja", "piso", "ala", "ramo"]) {
      expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    }
  });

  it("filtra em memória, por nome e por shopping", async () => {
    const u = userEvent.setup();
    render(<LibraryPanel aoAbrirPostes={() => {}} />);
    await screen.findByText(/Lojas dos shoppings de Blumenau/);
    await u.click(screen.getByRole("button", { name: "Navegar" }));
    await screen.findByText("60 Sabores");

    await u.type(screen.getByLabelText(/Filtrar/), "neumarkt");
    await waitFor(() => expect(screen.queryByText("60 Sabores")).not.toBeInTheDocument());
    expect(screen.getByText("Swarovski")).toBeInTheDocument();
  });

  /**
   * A loja sem identificador NÃO some da Biblioteca. Escondê-la faria a tela
   * dizer que o Neumarkt tem menos lojas do que tem — ausência de número lida
   * como ausência de loja.
   */
  it("a loja sem identificador aparece, com a célula vazia marcada", async () => {
    const u = userEvent.setup();
    render(<LibraryPanel aoAbrirPostes={() => {}} />);
    await screen.findByText(/Lojas dos shoppings de Blumenau/);
    await u.click(screen.getByRole("button", { name: "Navegar" }));

    const linha = (await screen.findByText("Swarovski")).closest("tr");
    expect(linha).toBeTruthy();
    expect(within(linha as HTMLElement).getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("o vazio calado", () => {
  /**
   * Uma base do ACERVO que falha tem de dizer por quê. Antes desta mudança a
   * tela ficava com uma tabela sem cabeçalho e sem texto nenhum, e "a base caiu"
   * era indistinguível de "a busca não achou nada".
   */
  it("base do acervo que falha escreve o motivo na tela", async () => {
    const u = userEvent.setup();
    pedir.mockImplementation(async (rota: string) => {
      if (rota === "/library") {
        return {
          hits: [
            {
              id: "cep",
              nome: "CEP",
              indexa: "cep → logradouro",
              origem: "Correios",
              registros: 40445,
              navegavel: true,
            },
          ],
        } as never;
      }
      throw new Error("Consulta indisponível (HTTP 502).");
    });

    render(<LibraryPanel aoAbrirPostes={() => {}} />);
    await screen.findByText("CEP");
    await u.click(screen.getAllByRole("button", { name: "Navegar" })[0]);

    expect(await screen.findByText(/Consulta indisponível \(HTTP 502\)/)).toBeInTheDocument();
  });
});

const ficha = (slug: string, codinome: string, nomeCivil: string) => ({
  slug,
  codinome,
  nomeCivil,
  frase: "uma frase",
  fobia: "Fronemofobia.",
  alvo: "o regulamento",
  diagnostico: "um diagnóstico",
  prognostico: "um prognóstico",
  personagem: "alguém",
  shortcode: "AAA",
  url: `https://www.instagram.com/p/${slug}/`,
  publicadoEm: "2026-08-21T01:52:44Z",
  imagem: `/fichas/${slug}.jpg`,
  mini: `/fichas/mini/${slug}.jpg`,
});

const FICHAS: FichasData = {
  source: "Instagram @comissaodeprovas",
  generatedAt: "2026-08-21",
  coletadoEm: "2026-08-21",
  arquivoN: "R325B4915",
  periculosidade: "100%",
  aviso: "ID e NASC vêm tarjados na arte",
  normalizacao: "aspas normalizadas",
  personagem: "leitura nossa da foto",
  lacuna: "a ficha do ANDY foi removida do perfil",
  count: 2,
  fichas: [ficha("zaz", "ZAZ", "CARLOS EDUARDO HOEPERS"), ficha("tati", "TATI", "TATIANE LUCI")],
};

/**
 * A primeira base do acervo cujo REGISTRO É UMA IMAGEM — e é isso que estes
 * casos travam: que a miniatura aparece, que o caminho do arquivo NÃO vira
 * coluna de tabela, e que o clique abre a arte inteira.
 */
describe("a base de fichas da CP na Biblioteca", () => {
  beforeEach(() => {
    // Só as fichas nesta suíte: com as duas bases locais na tela haveria dois
    // botões "Navegar", e o teste passaria a falar sobre o acaso da ordem.
    pedirLojas.mockRejectedValue(new Error("sem lojas neste caso"));
    pedirFichas.mockResolvedValue(FICHAS);
  });

  it("aparece com a contagem vinda do artefato", async () => {
    render(<LibraryPanel aoAbrirPostes={() => {}} />);
    await screen.findByText(/Fichas da Comissão de Provas/);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("navega sem a API, com a miniatura de cada ficha", async () => {
    const u = userEvent.setup();
    render(<LibraryPanel aoAbrirPostes={() => {}} />);
    await screen.findByText(/Fichas da Comissão de Provas/);
    await u.click(screen.getByRole("button", { name: "Navegar" }));

    await screen.findByText("ZAZ");
    expect(screen.getByRole("columnheader", { name: "ficha" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ver a ficha de ZAZ — CARLOS EDUARDO HOEPERS/ }),
    ).toBeInTheDocument();
  });

  /**
   * Caminho de arquivo não é coluna que alguém leia — e era o que aconteceria
   * sem o filtro das chaves com `_`.
   */
  it("não transforma o caminho da arte em coluna", async () => {
    const u = userEvent.setup();
    render(<LibraryPanel aoAbrirPostes={() => {}} />);
    await screen.findByText(/Fichas da Comissão de Provas/);
    await u.click(screen.getByRole("button", { name: "Navegar" }));

    await screen.findByText("ZAZ");
    expect(screen.queryByRole("columnheader", { name: "_mini" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "_cheia" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "codinome" })).toBeInTheDocument();
  });

  it("o clique na miniatura abre a arte inteira, e o Esc fecha", async () => {
    const u = userEvent.setup();
    render(<LibraryPanel aoAbrirPostes={() => {}} />);
    await screen.findByText(/Fichas da Comissão de Provas/);
    await u.click(screen.getByRole("button", { name: "Navegar" }));
    await screen.findByText("ZAZ");

    await u.click(screen.getByRole("button", { name: /Ver a ficha de ZAZ/ }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByRole("img")).toHaveAttribute("src", "/fichas/zaz.jpg");

    await u.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
