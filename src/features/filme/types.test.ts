import { describe, expect, it } from "vitest";
import { type Filme, duracaoLegivel, tituloPrincipal, titulosDe } from "./types";

const base: Filme = {
  imdbId: "tt0111161",
  tituloBr: null,
  tituloPt: null,
  tituloOriginal: null,
  tituloIngles: null,
  ano: null,
  duracaoMin: null,
  direcao: null,
  generos: null,
  paises: null,
  wikidataId: null,
  fonte: "Wikidata",
};

/**
 * A REGRA DE QUAL TÍTULO MOSTRAR — o item inteiro está aqui.
 *
 * Numa gincana o filme é citado pelo nome que tem no Brasil. Trocar esse nome
 * pelo de Portugal é a resposta errada mais bem disfarçada que esta bancada
 * consegue produzir: soa certa, está em português, e encerra a investigação de
 * quem confiou nela.
 */
describe("qual título a tela mostra", () => {
  it("com título brasileiro, mostra ele e não ressalva nada", () => {
    const t = tituloPrincipal({
      ...base,
      tituloBr: "Um Sonho de Liberdade",
      tituloOriginal: "The Shawshank Redemption",
    });
    expect(t.texto).toBe("Um Sonho de Liberdade");
    expect(t.origem).toBe("br");
    expect(t.ressalva).toBeNull();
  });

  /**
   * O TESTE QUE JUSTIFICA A CLASSE. Sem título brasileiro, a escada NÃO desce
   * para o português de Portugal — ela vai para o original e AVISA.
   */
  /**
   * A etiqueta `pt` do Wikidata é PORTUGUÊS, não Portugal — "Regresso ao
   * Futuro" é de lá, mas "007 - Operação Skyfall", marcado igual, é daqui. Como
   * o dado não distingue, ele nunca entra nesta escada: cair nele acertaria
   * metade das vezes e erraria a outra, que é resposta errada com confiança.
   */
  it("sem título brasileiro, jamais cai no que está só marcado `pt`", () => {
    const t = tituloPrincipal({
      ...base,
      tituloBr: null,
      tituloPt: "Regresso ao Futuro",
      tituloOriginal: "Back to the Future",
    });
    expect(t.texto).toBe("Back to the Future");
    expect(t.texto).not.toBe("Regresso ao Futuro");
    expect(t.origem).toBe("original");
    expect(t.ressalva).toContain("não registra um título marcado como brasileiro");
  });

  it("sem título nenhum, mostra o ID e diz que não há título", () => {
    const t = tituloPrincipal(base);
    expect(t.texto).toBe("tt0111161");
    expect(t.origem).toBe("nenhum");
    expect(t.ressalva).toBeTruthy();
  });

  it("o inglês serve de original quando não há original declarado", () => {
    expect(tituloPrincipal({ ...base, tituloIngles: "Jumanji: The Next Level" }).texto).toBe(
      "Jumanji: The Next Level",
    );
  });

  /**
   * Toda saída sem título brasileiro carrega ressalva. Se algum caminho novo
   * escapar disso, o card volta a mostrar o inglês com cara de título daqui.
   */
  it("todo título que não é o brasileiro vem com ressalva", () => {
    for (const f of [
      { ...base, tituloOriginal: "X" },
      { ...base, tituloIngles: "Y" },
      { ...base, tituloPt: "Z" },
      base,
    ]) {
      const t = tituloPrincipal(f);
      if (t.origem !== "br") expect(t.ressalva, JSON.stringify(f)).toBeTruthy();
    }
  });
});

describe("duração legível", () => {
  it("passa de uma hora, lê-se em horas — e o número cru continua à vista", () => {
    expect(duracaoLegivel(181)).toBe("3 h 1 min (181 min)");
    expect(duracaoLegivel(180)).toBe("3 h 0 min (180 min)");
  });

  it("abaixo de uma hora fica em minutos", () => {
    expect(duracaoLegivel(45)).toBe("45 min");
  });

  it("ausente ou absurda não vira texto", () => {
    expect(duracaoLegivel(null)).toBeNull();
    expect(duracaoLegivel(0)).toBeNull();
    expect(duracaoLegivel(-3)).toBeNull();
  });
});

/**
 * OS DOIS TÍTULOS, SEMPRE — pedido do dono, e a razão é de prova: o inglês casa
 * com o enunciado, o brasileiro casa com o cartaz.
 */
describe("os dois títulos viajam juntos", () => {
  it("quando diferem, os dois vêm", () => {
    const t = titulosDe({
      ...base,
      tituloBr: "Um Sonho de Liberdade",
      tituloOriginal: "The Shawshank Redemption",
      tituloIngles: "The Shawshank Redemption",
    });
    expect(t.br).toBe("Um Sonho de Liberdade");
    expect(t.original).toBe("The Shawshank Redemption");
    // O inglês só aparece quando difere do original — senão é a mesma linha
    // duas vezes, que é ruído com cara de informação.
    expect(t.ingles).toBeNull();
  });

  it("quando o original não é em inglês, os dois aparecem", () => {
    const t = titulosDe({ ...base, tituloOriginal: "کلوزآپ", tituloIngles: "Close-Up" });
    expect(t.original).toBe("کلوزآپ");
    expect(t.ingles).toBe("Close-Up");
  });

  /** Skyfall se chama igual aqui e lá — não há segundo título a mostrar. */
  it("quando o filme tem um nome só, não se inventa o segundo", () => {
    const t = titulosDe({ ...base, tituloOriginal: "Skyfall", tituloIngles: "Skyfall" });
    expect(t.original).toBe("Skyfall");
    expect(t.ingles).toBeNull();
    expect(t.br).toBeNull();
  });
});
