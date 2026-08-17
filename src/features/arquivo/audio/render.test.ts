import { calcularStft } from "@/features/audio/stft";
import { describe, expect, it } from "vitest";
import { RENDER_PADRAO, bordasVerticais, pintar } from "./render";

const TAXA = 8000;

/** Um tom de `hz` ligado entre `de` e `ate` segundos, dentro de `dur` segundos. */
function trecho(hz: number, de: number, ate: number, dur: number): Float32Array {
  const x = new Float32Array(Math.round(TAXA * dur));
  const i0 = Math.round(de * TAXA);
  const i1 = Math.round(ate * TAXA);
  for (let i = i0; i < i1 && i < x.length; i++)
    x[i] = 0.7 * Math.sin((2 * Math.PI * hz * i) / TAXA);
  return x;
}

describe("pintar", () => {
  it("devolve RGBA opaco do tamanho pedido", () => {
    const esp = calcularStft(trecho(1000, 0, 1, 1), TAXA, { n: 512, salto: 256, pisoDb: -90 });
    const px = pintar(esp, 40, 20, RENDER_PADRAO);
    expect(px.length).toBe(40 * 20 * 4);
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255);
  });

  it("põe o brilho na altura certa: grave embaixo, agudo em cima", () => {
    // Um tom de 500 Hz num teto de 4000 deve acender perto do RODAPÉ.
    const esp = calcularStft(trecho(500, 0, 1, 1), TAXA, { n: 512, salto: 256, pisoDb: -90 });
    const altura = 40;
    const px = pintar(esp, 10, altura, { ...RENDER_PADRAO, faixaHz: [0, 4000] });
    const brilhoDaLinha = (y: number) => {
      let s = 0;
      for (let x = 0; x < 10; x++) s += px[(y * 10 + x) * 4 + 1]; // canal verde
      return s;
    };
    let maisClara = 0;
    for (let y = 1; y < altura; y++) if (brilhoDaLinha(y) > brilhoDaLinha(maisClara)) maisClara = y;
    // 500 de 4000 = 12,5% do caminho a partir de baixo → linha ~35 de 40.
    expect(maisClara).toBeGreaterThan(altura * 0.75);
  });

  it("o piso controla o que é fundo — e é isso que revela sinal fraco", () => {
    // Um tom a −70 dBFS: invisível com piso de −60, visível com piso de −100.
    const x = new Float32Array(TAXA);
    for (let i = 0; i < x.length; i++)
      x[i] = 10 ** (-70 / 20) * Math.sin((2 * Math.PI * 1000 * i) / TAXA);
    const esp = calcularStft(x, TAXA, { n: 512, salto: 256, pisoDb: -120 });

    const soma = (piso: number) => {
      const px = pintar(esp, 20, 20, { ...RENDER_PADRAO, pisoDb: piso, tetoDb: -10 });
      let s = 0;
      for (let i = 1; i < px.length; i += 4) s += px[i];
      return s;
    };
    expect(soma(-60)).toBeLessThan(soma(-100));
  });
});

describe("bordas verticais", () => {
  it("acha o instante em que o tom liga", () => {
    // Silêncio, depois tom: uma borda só, no ponto de liga.
    const esp = calcularStft(trecho(1000, 0.5, 1, 1), TAXA, { n: 256, salto: 128, pisoDb: -90 });
    const bordas = bordasVerticais(esp);
    expect(bordas.length).toBeGreaterThan(0);
    const segundoDaBorda = bordas[0].quadro * esp.resolucaoSegundos;
    expect(segundoDaBorda).toBeGreaterThan(0.4);
    expect(segundoDaBorda).toBeLessThan(0.62);
  });

  it("tom contínuo NÃO produz borda", () => {
    // A disciplina de sempre: sem mudança brusca, silêncio.
    const esp = calcularStft(trecho(1000, 0, 1, 1), TAXA, { n: 256, salto: 128, pisoDb: -90 });
    expect(bordasVerticais(esp)).toEqual([]);
  });
});
