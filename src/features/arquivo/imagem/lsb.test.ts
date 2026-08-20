import { describe, expect, it } from "vitest";
import { type OpcoesLsbImagem, extrairLsbImagem, varrerLsbImagem } from "./lsb";

/** Monta uma imagem RGBA com `f(x, y, canal)` decidindo cada byte. */
function imagem(w: number, h: number, f: (x: number, y: number, c: number) => number) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const base = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) px[base + c] = f(x, y, c);
    }
  }
  return px;
}

/** Esconde `texto` no bit baixo de R, G, B, varrendo por linha, MSB primeiro. */
function esconder(w: number, h: number, texto: string) {
  const bits: number[] = [];
  for (const ch of texto) {
    const b = ch.charCodeAt(0);
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  // Um byte de terminação, para a corrida fechar antes do ruído.
  for (let i = 0; i < 8; i++) bits.push(0);

  let n = 0;
  return imagem(w, h, (x, y, c) => {
    // Um fundo com variedade: área chapada produziria corrida de zeros.
    const base = ((x * 7 + y * 13 + c * 29) % 200) + 20;
    if (c === 3) return 255;
    const bit = n < bits.length ? bits[n] : (base >> 0) & 1;
    n++;
    return (base & 0xfe) | bit;
  });
}

const OPCOES: OpcoesLsbImagem = {
  conjunto: "rgb",
  varredura: "linha",
  ordem: "msb-primeiro",
  quantosBits: 1,
};

describe("extração de LSB de imagem", () => {
  it("recupera a mensagem escondida, exata", () => {
    const texto = "A CHAVE ESTA NA PONTE DE FERRO SOBRE O RIO ITAJAI";
    const px = esconder(120, 60, texto);
    const r = extrairLsbImagem(px, 120, 60, OPCOES, 8);
    expect(r.maiorCorrida.startsWith(texto)).toBe(true);
  });

  /**
   * A interpretação ERRADA não pode devolver a mensagem — se devolvesse, a
   * varredura não estaria testando nada, e o "achamos em rgb/linha" seria
   * decoração.
   */
  it("a interpretação errada não acha", () => {
    const texto = "A CHAVE ESTA NA PONTE DE FERRO SOBRE O RIO ITAJAI";
    const px = esconder(120, 60, texto);
    for (const errada of [
      { ...OPCOES, ordem: "lsb-primeiro" as const },
      { ...OPCOES, conjunto: "g" as const },
      { ...OPCOES, varredura: "coluna" as const },
    ]) {
      expect(
        extrairLsbImagem(px, 120, 60, errada, 8).maiorCorrida,
        JSON.stringify(errada),
      ).not.toContain("PONTE DE FERRO");
    }
  });

  /**
   * ÁREA CHAPADA É O FALSO POSITIVO CLÁSSICO. Uma região de cor única produz
   * corrida longa de bytes iguais, que passa em qualquer teste de "imprimível"
   * e não diz nada. `temVariedade` mata a família inteira.
   */
  it("cor chapada não vira achado", () => {
    const px = imagem(200, 150, (_x, _y, c) => (c === 3 ? 255 : 0x41));
    const r = extrairLsbImagem(px, 200, 150, OPCOES);
    expect(r.trechos).toEqual([]);
  });

  it("ruído aleatório não produz achado acima do corte", () => {
    let semente = 12345;
    const rnd = () => {
      semente = (semente * 1103515245 + 12345) & 0x7fffffff;
      return semente % 256;
    };
    const px = imagem(200, 150, (_x, _y, c) => (c === 3 ? 255 : rnd()));
    expect(varrerLsbImagem(px, 200, 150).achados).toEqual([]);
  });
});

describe("a varredura", () => {
  it("acha a mensagem e diz em qual interpretação", () => {
    const texto = "ENCONTRE A CHAVE ESCONDIDA NA PRACA CENTRAL";
    const v = varrerLsbImagem(esconder(150, 80, texto), 150, 80);
    expect(v.achados.length).toBeGreaterThan(0);
    // O que a tela mostra é o TRECHO (filtrado por variedade), não a corrida
    // crua: o alfa opaco produz uma corrida de `UUUU…` que não diz nada.
    expect(v.achados[0].trechos.some((t) => t.includes(texto))).toBe(true);
    expect(v.achados[0].opcoes.conjunto).toBe("rgb");
    expect(v.achados[0].opcoes.ordem).toBe("msb-primeiro");
  });

  /**
   * O CORTE SOBE COM O TAMANHO DA BUSCA. Testar 20 interpretações é colher 20
   * vezes mais acaso; um corte por interpretação deixaria passar, em média,
   * vinte corridas falsas — cada uma com a mesma cara de achado.
   */
  it("o corte da varredura é maior que o de uma interpretação só", () => {
    const px = esconder(150, 80, "ola");
    const v = varrerLsbImagem(px, 150, 80);
    const uma = extrairLsbImagem(px, 150, 80, OPCOES);
    expect(v.corte).toBeGreaterThan(uma.corteUsado);
    expect(v.testadas).toBe(20);
  });

  it("o número de interpretações testadas viaja com o resultado", () => {
    const v = varrerLsbImagem(esconder(60, 40, "ola mundo aqui"), 60, 40);
    expect(v.testadas).toBeGreaterThan(0);
    expect(v.corte).toBeGreaterThan(0);
  });
});
