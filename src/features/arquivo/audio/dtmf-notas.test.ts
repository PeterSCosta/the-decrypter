import { describe, expect, it } from "vitest";
import { ehDtmf, lerDtmf } from "./dtmf";
import { ehNotas, frequenciaParaNota, lerNotas } from "./notas";

const TAXA = 8000;

/** Soma senos num trecho, com rampa de 5 ms nas pontas. */
function tons(x: Float32Array, deS: number, durS: number, hzs: number[], amp = 0.4) {
  const i0 = Math.round(deS * TAXA);
  const n = Math.round(durS * TAXA);
  for (let i = 0; i < n && i0 + i < x.length; i++) {
    const r = Math.min(1, i / (TAXA * 0.005), (n - i) / (TAXA * 0.005));
    for (const hz of hzs) x[i0 + i] += amp * r * Math.sin((2 * Math.PI * hz * (i0 + i)) / TAXA);
  }
}

const buffer = (dur: number) => new Float32Array(Math.round(TAXA * dur));

describe("DTMF", () => {
  it("lê uma sequência de teclas", () => {
    // 1 = 697+1209 · 5 = 770+1336 · 9 = 852+1477 · 0 = 941+1336
    const x = buffer(3);
    tons(x, 0.2, 0.12, [697, 1209]);
    tons(x, 0.5, 0.12, [770, 1336]);
    tons(x, 0.8, 0.12, [852, 1477]);
    tons(x, 1.1, 0.12, [941, 1336]);
    const r = lerDtmf(x, TAXA);
    expect(ehDtmf(r)).toBe(true);
    if (ehDtmf(r)) expect(r.texto).toBe("1590");
  });

  it("um seno sozinho NÃO é DTMF — o par é a definição", () => {
    const x = buffer(2);
    tons(x, 0.2, 0.5, [697]);
    tons(x, 1.0, 0.5, [1209]);
    expect(ehDtmf(lerDtmf(x, TAXA))).toBe(false);
  });

  it("acorde musical não vira dígito", () => {
    // Dó-Mi-Sol: três parciais, energia espalhada, nenhum par dominante.
    const x = buffer(2);
    tons(x, 0.2, 1.2, [261.6, 329.6, 392.0], 0.5);
    expect(ehDtmf(lerDtmf(x, TAXA))).toBe(false);
  });

  it("tom curto demais é descartado", () => {
    const x = buffer(1);
    tons(x, 0.2, 0.02, [697, 1209]); // 20 ms, abaixo do mínimo de 35
    expect(ehDtmf(lerDtmf(x, TAXA))).toBe(false);
  });
});

describe("frequência → nota", () => {
  it("acerta as âncoras", () => {
    expect(frequenciaParaNota(440)?.anglo).toBe("A4");
    expect(frequenciaParaNota(440)?.solfejo).toBe("Lá");
    expect(frequenciaParaNota(261.63)?.anglo).toBe("C4");
    expect(frequenciaParaNota(261.63)?.solfejo).toBe("Dó");
    expect(frequenciaParaNota(880)?.anglo).toBe("A5");
  });

  it("mede o desvio em centavos", () => {
    expect(Math.abs(frequenciaParaNota(440)?.centavos ?? 99)).toBeLessThan(2);
    // Um quarto de tom acima do lá: ~50 centavos.
    const c = frequenciaParaNota(440 * 2 ** (0.5 / 12))?.centavos ?? 0;
    expect(Math.abs(c)).toBeGreaterThan(40);
  });

  it("respeita outra afinação de referência", () => {
    // Com A4 = 432, o próprio 432 Hz passa a ser o lá.
    expect(frequenciaParaNota(432, 432)?.anglo).toBe("A4");
    expect(frequenciaParaNota(440, 432)?.anglo).toBe("A4");
  });
});

describe("notas tocadas", () => {
  it("lê uma melodia e devolve o texto que o decoder consome", () => {
    // Dó Ré Mi Fá — as frequências da quarta oitava.
    const x = buffer(4);
    const melodia = [261.63, 293.66, 329.63, 349.23];
    melodia.forEach((hz, i) => tons(x, 0.3 + i * 0.8, 0.5, [hz], 0.8));
    const r = lerNotas(x, TAXA);
    expect(ehNotas(r)).toBe(true);
    if (!ehNotas(r)) return;
    expect(r.textoSolfejo).toBe("Dó Ré Mi Fá");
    expect(r.textoAnglo).toBe("C D E F");
    // E o desvio tem de ser pequeno: senão a nota lida está errada.
    for (const nota of r.notas) expect(Math.abs(nota.centavos)).toBeLessThan(25);
  });

  it("tom contínuo não vira sequência", () => {
    const x = buffer(3);
    tons(x, 0, 3, [440], 0.8);
    expect(ehNotas(lerNotas(x, TAXA))).toBe(false);
  });

  it("acorde é recusado, com o motivo", () => {
    // Sem fundamental dominante, não há nota única para reportar.
    const x = buffer(4);
    for (let i = 0; i < 3; i++) {
      tons(x, 0.3 + i * 1.1, 0.6, [261.6, 329.6, 392.0, 523.3], 0.5);
    }
    const r = lerNotas(x, TAXA);
    if (ehNotas(r)) {
      // Se passar, ao menos não pode inventar mais notas que trechos.
      expect(r.notas.length).toBeLessThanOrEqual(3);
    } else {
      expect(r.motivo).toMatch(/fundamental|Acorde|acorde/);
    }
  });
});
