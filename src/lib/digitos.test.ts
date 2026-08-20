import { describe, expect, it } from "vitest";
import { BLOCOS_DE_DIGITO, normalizaDigitos } from "./digitos";

/**
 * O defeito que este módulo existe para consertar:
 * `\d` em JS é só `[0-9]`, então `replace(/\D/g, "")` APAGA o dígito
 * estrangeiro em vez de ignorá-lo, e o decoder numérico cala sem motivo.
 */
describe("normalizaDigitos", () => {
  it("um CEP em arábico-índico deixava de existir", () => {
    const cepArabe = "٨٩٠١٠٠٠٠";
    expect(cepArabe.replace(/\D/g, "")).toBe(""); // o comportamento de hoje
    expect(normalizaDigitos(cepArabe).replace(/\D/g, "")).toBe("89010000");
  });

  it("cobre os blocos que aparecem em material de prova", () => {
    for (const { nome, exemplo } of BLOCOS_DE_DIGITO) {
      expect(normalizaDigitos(exemplo), nome).toBe("0123456789");
    }
  });

  it("entrada em ASCII volta idêntica", () => {
    const t = "CEP 89010-000, rua XV de Novembro nº 1400";
    expect(normalizaDigitos(t)).toBe(t);
  });

  it("não mexe em letra nem em pontuação", () => {
    expect(normalizaDigitos("Blumenau — ٢٠٢٦!")).toBe("Blumenau — 2026!");
  });

  it("é idempotente", () => {
    const uma = normalizaDigitos("٤٧ ۳۳۷۸");
    expect(normalizaDigitos(uma)).toBe(uma);
  });

  it("não converte letra árabe, só dígito", () => {
    // "بلومناو" (Blumenau) não tem dígito e tem de passar inteiro.
    expect(normalizaDigitos("بلومناو")).toBe("بلومناو");
  });

  it("a regex global não guarda estado entre chamadas", () => {
    // `RE` é global; sem zerar o `lastIndex` a segunda chamada pularia o começo.
    expect(normalizaDigitos("٢٠٢٦")).toBe("2026");
    expect(normalizaDigitos("٢٠٢٦")).toBe("2026");
    expect(normalizaDigitos("٢٠٢٦")).toBe("2026");
  });
});

/**
 * A EXCEÇÃO DA LARGURA PLENA — uma regressão que esta normalização causou.
 *
 * Dos sete blocos, a largura plena é o único que o decoder `unicode-styles`
 * também cobre, e ele cobre a linha inteira. Consertar só os dígitos aqui
 * cegava aquele decoder: `１２３ｆ` virava `123ｆ`, a cobertura caía para 1 de 4,
 * e o card que consertaria a string toda sumia.
 */
describe("largura plena: quem conserta é quem conserta melhor", () => {
  it("misturada com letra de largura plena, o texto passa intacto", () => {
    expect(normalizaDigitos("１２３ｆ")).toBe("１２３ｆ");
    expect(normalizaDigitos("ＡＢ８９０１００００")).toBe("ＡＢ８９０１００００");
  });

  it("sozinha, segue sendo convertida", () => {
    expect(normalizaDigitos("８９０１００００")).toBe("89010000");
  });

  it("a exceção é SÓ da largura plena — os outros seis blocos não têm rival", () => {
    // Árabe-índico com letra latina no meio continua sendo convertido: nenhum
    // decoder de estilo cobre esse bloco.
    expect(normalizaDigitos("cep ٨٩٠١٠٠٠٠")).toBe("cep 89010000");
    expect(normalizaDigitos("๘๙๐๑๐๐๐๐")).toBe("89010000");
  });
});
