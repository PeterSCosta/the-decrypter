import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Lightbox } from "./lightbox";

/**
 * O diálogo é escrito à mão, então as três coisas que um diálogo pronto daria
 * de graça são exatamente as que precisam de teste: Esc, clique no fundo e o
 * foco — que tem de VOLTAR para quem abriu, senão a tecla Tab recomeça do topo
 * da página e a pessoa perde o lugar na tabela.
 */
describe("Lightbox", () => {
  it("mostra a imagem com a legenda e nomeia o diálogo", () => {
    render(<Lightbox src="/fichas/zaz.jpg" alt="ZAZ" legenda="ZAZ — Carlos" aoFechar={() => {}} />);
    const d = screen.getByRole("dialog", { name: "ZAZ" });
    expect(d).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/fichas/zaz.jpg");
    expect(screen.getByText("ZAZ — Carlos")).toBeInTheDocument();
  });

  it("fecha no Esc", async () => {
    const u = userEvent.setup();
    const fechar = vi.fn();
    render(<Lightbox src="/a.jpg" alt="a" aoFechar={fechar} />);
    await u.keyboard("{Escape}");
    expect(fechar).toHaveBeenCalledOnce();
  });

  it("fecha no clique do fundo e no botão", async () => {
    const u = userEvent.setup();
    const fechar = vi.fn();
    render(<Lightbox src="/a.jpg" alt="a" aoFechar={fechar} />);
    const [fundo, botao] = screen.getAllByRole("button", { name: "Fechar" });
    await u.click(fundo);
    await u.click(botao);
    expect(fechar).toHaveBeenCalledTimes(2);
  });

  /**
   * A imagem NÃO fecha o diálogo. Parece detalhe, mas é o gesto mais comum no
   * celular: quem arrasta para enxergar melhor não quis fechar.
   */
  it("o clique na imagem não fecha", async () => {
    const u = userEvent.setup();
    const fechar = vi.fn();
    render(<Lightbox src="/a.jpg" alt="a" aoFechar={fechar} />);
    await u.click(screen.getByRole("img"));
    expect(fechar).not.toHaveBeenCalled();
  });

  it("trava a rolagem do corpo enquanto está aberto, e devolve ao fechar", () => {
    document.body.style.overflow = "auto";
    const { unmount } = render(<Lightbox src="/a.jpg" alt="a" aoFechar={() => {}} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("devolve o foco para quem abriu", async () => {
    function Tela() {
      const [aberto, setAberto] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setAberto(true)}>
            abrir
          </button>
          {aberto ? <Lightbox src="/a.jpg" alt="a" aoFechar={() => setAberto(false)} /> : null}
        </>
      );
    }
    const u = userEvent.setup();
    render(<Tela />);
    const abrir = screen.getByRole("button", { name: "abrir" });
    await u.click(abrir);
    await u.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(abrir));
  });
});
