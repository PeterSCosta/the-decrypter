import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MatrixPanel } from "./matrix-panel";

/**
 * Fumaça de ponta a ponta: a aba montada de verdade, com o motor de regras real.
 * Os dois casos abaixo são os que justificam a aba existir — se um deles parar
 * de fechar, a aba deixou de servir para o que foi feita, mesmo compilando.
 */
describe("MatrixPanel", () => {
  it("monta com as quatro seções do fluxo", () => {
    render(<MatrixPanel />);
    expect(screen.getByText("Matriz — pintar a grade por regra")).toBeInTheDocument();
    expect(screen.getByText("Origem — o conteúdo")).toBeInTheDocument();
    expect(screen.getByText("Regras")).toBeInTheDocument();
    expect(screen.getByText("Destino — a pintura")).toBeInTheDocument();
    expect(screen.getByText("Saída")).toBeInTheDocument();
  });

  it("a runa de ITC 2019 colada como lista fecha no dígito 8", async () => {
    const user = userEvent.setup();
    render(<MatrixPanel />);

    await user.click(screen.getByRole("button", { name: /Runas 3×5/ }));
    await user.click(screen.getByRole("button", { name: "Pintar a lista" }));

    const leitura = screen.getByText("Leitura por blocos").closest("div")?.parentElement;
    expect(leitura).not.toBeNull();
    // Duas vezes de propósito: a tira copiável e o cartão do bloco reconhecido.
    expect(within(leitura as HTMLElement).getAllByText("8")).toHaveLength(2);
  });

  it("a regra por elemento diz quantas células pegou — 18 pares em 1..36", async () => {
    const user = userEvent.setup();
    render(<MatrixPanel />);

    await user.click(screen.getByRole("button", { name: /Pintar os pares/ }));

    expect(screen.getByText("18 células")).toBeInTheDocument();
  });
});
