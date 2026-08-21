import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DiffPanel } from "./diff-panel";

/**
 * A tira (e) — o ordinal de cada palavra trocada — é a chave literal da prova 26
 * do acervo da GCB (PROVINHA MAIS OU MENAS), onde o erro proposital vale pela
 * POSIÇÃO e não pela palavra. O dado já era computado em `changedA`; o que
 * faltava era mostrá-lo. Ver `docs/ACERVO-ARROMBA-PROVAS.md` §2.2.
 */
describe("DiffPanel — tira de posições das palavras trocadas", () => {
  it("mostra o ordinal de cada palavra trocada, pronto para copiar", async () => {
    const user = userEvent.setup();
    render(<DiffPanel />);
    // "mais" é a 3ª palavra; "menas" é a 7ª.
    await user.type(
      screen.getByLabelText("Texto alterado"),
      "um dois mais quatro cinco seis menas oito",
    );
    await user.type(
      screen.getByLabelText("Fonte original"),
      "um dois mas quatro cinco seis menos oito",
    );

    // A comparação é debounced: espera o resultado em vez de assumi-lo pronto.
    expect(await screen.findByText(/posição das palavras trocadas/i)).toBeInTheDocument();
    expect(screen.getByText("3 7")).toBeInTheDocument();
  });
});
