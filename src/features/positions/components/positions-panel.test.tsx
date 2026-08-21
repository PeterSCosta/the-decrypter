import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PositionsPanel } from "./positions-panel";

/**
 * O achatamento silencioso era a pior classe de defeito da bancada: a aba lia
 * `8-4-3` como três índices soltos e entregava o resultado FORMATADO, sem uma
 * linha de aviso — o produto mentindo sobre si mesmo. O teste prova que o aviso
 * aparece antes do resultado, e que ele não aparece no uso normal.
 *
 * Ver `docs/ACERVO-ARROMBA-PROVAS.md` §4.2 (prova 2026/13-E2 RECONHECIMENTO).
 */
describe("PositionsPanel — aviso de chave multinível", () => {
  async function montar(texto: string, chave: string) {
    const user = userEvent.setup();
    render(<PositionsPanel />);
    await user.type(screen.getByLabelText("Texto de origem"), texto);
    await user.click(screen.getByRole("button", { name: "Posições" }));
    await user.type(screen.getByLabelText("Lista de posições"), chave);
    return user;
  }

  it("avisa quando a chave tem trincas e a aba as está achatando", async () => {
    await montar("abcdefghij", "8-4-3");
    expect(screen.getByText(/achatamento, não o endereçamento/i)).toBeInTheDocument();
  });

  it("não avisa numa lista de índices soltos, que é o uso normal", async () => {
    await montar("abcdefghij", "3 7 9");
    expect(screen.queryByText(/achatamento/i)).not.toBeInTheDocument();
  });
});
