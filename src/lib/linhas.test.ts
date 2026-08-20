import { describe, expect, it } from "vitest";
import { TETO_POR_LOTE, dividirEmItens, dividirPorVirgula } from "./linhas";

describe("dividir texto colado em itens", () => {
  it("uma linha vira um item, com índice contado a partir de 1", () => {
    const d = dividirEmItens("89010000\n89020000");
    expect(d.linhas.map((l) => [l.indice, l.termo])).toEqual([
      [1, "89010000"],
      [2, "89020000"],
    ]);
    expect(d.termos).toEqual(["89010000", "89020000"]);
  });

  /** Texto colado do Windows ou de PDF traz `\r`. Um `\r` pendurado no fim do
   * termo é uma chave de cache diferente da mesma entrada digitada à mão. */
  it("CRLF não vira caractere no termo", () => {
    const d = dividirEmItens("89010000\r\n89020000\r");
    expect(d.termos).toEqual(["89010000", "89020000"]);
  });

  it("linha em branco é contada, não vira item", () => {
    const d = dividirEmItens("a1\n\n   \nb2");
    expect(d.linhas).toHaveLength(2);
    expect(d.vaziasIgnoradas).toBe(2);
  });

  it("marcador de lista sai do termo, e o bruto guarda o que a pessoa colou", () => {
    const d = dividirEmItens("1. 89010000\n- 89020000\n• 89030000\n2) 89040000");
    expect(d.termos).toEqual(["89010000", "89020000", "89030000", "89040000"]);
    expect(d.linhas[0].bruto).toBe("1. 89010000");
  });

  /**
   * A UNIDADE DA TELA É A LINHA; A DA REDE É O TERMO. Trinta linhas iguais
   * desenham trinta linhas e custam UMA permissão.
   */
  it("repetido dá N linhas e 1 termo", () => {
    const d = dividirEmItens("89010000\n89010000\n89010000");
    expect(d.linhas).toHaveLength(3);
    expect(d.termos).toEqual(["89010000"]);
  });

  /**
   * A linha longa NÃO SOME: ela vira item com motivo. Sumir seria a lista da
   * saída ficar mais curta que a da entrada, calada — e o alinhamento da coluna
   * copiável quebrado sem aviso.
   */
  it("linha acima de 64 caracteres vira item com motivo, e não desaparece", () => {
    const d = dividirEmItens(`a1\n${"x".repeat(80)}\nb2`);
    expect(d.linhas).toHaveLength(3);
    expect(d.linhas[1].motivo).toBe("longo");
    expect(d.termos).toEqual(["a1", "b2"]);
  });

  /**
   * INVARIANTE POR CONSTRUÇÃO: `lista` e `vazio` são motivos do portão da
   * BANCADA sobre o texto inteiro. Dentro do lote eles são impossíveis — cada
   * item já é uma linha, e vazia não vira item. Se um deles aparecer, é porque
   * a divisão parou de dividir.
   */
  it("nenhum item pode nascer com motivo 'lista' ou 'vazio'", () => {
    const d = dividirEmItens(`a1\n\nb2\n   \n89010000\n${"y".repeat(70)}`);
    for (const l of d.linhas) expect(["lista", "vazio"]).not.toContain(l.motivo);
  });

  it("o excedente do teto sai nomeado, não sumido", () => {
    const texto = Array.from({ length: 65 }, (_, i) => `item${i}`).join("\n");
    const d = dividirEmItens(texto);
    expect(d.linhas).toHaveLength(65);
    expect(d.termos).toHaveLength(TETO_POR_LOTE);
    expect(d.excedentes).toHaveLength(65 - TETO_POR_LOTE);
    expect(d.excedentes[0]).toBe("item60");
  });

  it("o teto conta termo DISTINTO, não linha", () => {
    const texto = Array.from({ length: 200 }, () => "igual").join("\n");
    const d = dividirEmItens(texto);
    expect(d.termos).toEqual(["igual"]);
    expect(d.excedentes).toHaveLength(0);
  });
});

/**
 * A COLAGEM DE PDF. `89010000, 89012000, 89015000` não tem quebra de linha,
 * passa no portão de 64 caracteres e seria consultado como termo único —
 * voltando "perguntei e não achei", que é resposta errada com cara de resposta.
 * A bancada OFERECE a divisão; nunca a aplica sozinha.
 */
describe("lista numa linha só, separada por vírgula", () => {
  it("reconhece a forma", () => {
    expect(dividirEmItens("89010000, 89012000, 89015000").pareceListaPorVirgula).toBe(true);
  });

  /**
   * O caso que proíbe dividir sozinho: uma coordenada é UM item e tem vírgula.
   */
  it("uma vírgula só não é lista — coordenada e endereço têm vírgula", () => {
    expect(dividirEmItens("-26.9194, -49.0661").pareceListaPorVirgula).toBe(false);
    expect(dividirEmItens("Rua XV, 100").pareceListaPorVirgula).toBe(false);
  });

  it("com quebra de linha, a vírgula é parte do item", () => {
    expect(dividirEmItens("-26.9, -49.0\n-27.1, -48.6").pareceListaPorVirgula).toBe(false);
  });

  it("quando aplicada, vira uma entrada por linha", () => {
    expect(dividirPorVirgula("89010000, 89012000 , 89015000")).toBe("89010000\n89012000\n89015000");
  });
});
