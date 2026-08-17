import { describe, expect, it } from "vitest";
import { ehAchado, lerMorse } from "./morse";

const TAXA = 8000;
const DIT = 0.08;

/** Gera Morse por tom a partir de pontos e traços. */
function gerar(simbolos: string, hz = 700, ruidoDb = -60): Float32Array {
  const dur = simbolos.length * DIT * 4 + 1;
  const x = new Float32Array(Math.round(TAXA * dur));
  // Piso de ruído: áudio real nunca é silêncio absoluto, e o detector precisa
  // funcionar com ele — foi o silêncio digital que quebrou a primeira versão.
  let s = 7 >>> 0;
  const amp = 10 ** (ruidoDb / 20);
  for (let i = 0; i < x.length; i++) {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    x[i] = ((s / 0xffffffff) * 2 - 1) * amp;
  }
  let t = 0.3;
  const por = (durS: number) => {
    const i0 = Math.round(t * TAXA);
    const n = Math.round(durS * TAXA);
    for (let i = 0; i < n; i++) {
      const r = Math.min(1, i / (TAXA * 0.005), (n - i) / (TAXA * 0.005));
      x[i0 + i] += 0.6 * r * Math.sin((2 * Math.PI * hz * i) / TAXA);
    }
    t += durS;
  };
  for (const c of simbolos) {
    if (c === ".") {
      por(DIT);
      t += DIT;
    } else if (c === "-") {
      por(DIT * 3);
      t += DIT;
    } else if (c === " ") t += DIT * 2;
    else if (c === "/") t += DIT * 4;
  }
  return x;
}

describe("Morse por tom", () => {
  it("lê uma mensagem inteira, sem sobra no fim", () => {
    // SOS OK = ... --- ... / --- -.-
    const r = lerMorse(gerar("... --- ... / --- -.-"), TAXA);
    expect(ehAchado(r)).toBe(true);
    if (!ehAchado(r)) return;
    expect(r.texto).toBe("SOS OK");
    // O "?" no fim era o separador de palavra entrando como símbolo.
    expect(r.texto).not.toContain("?");
    expect(r.portadoraHz).toBeGreaterThan(650);
    expect(r.portadoraHz).toBeLessThan(750);
    expect(r.wpm).toBeGreaterThan(10);
  });

  it("BARREIRA 1: sem portadora estreita, recusa", () => {
    // Ruído branco: energia em todo o espectro, nenhum tom.
    const x = new Float32Array(TAXA * 3);
    let s = 3 >>> 0;
    for (let i = 0; i < x.length; i++) {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      x[i] = (s / 0xffffffff) * 2 - 1;
    }
    const r = lerMorse(x, TAXA);
    expect(ehAchado(r)).toBe(false);
    if (!ehAchado(r)) expect(r.motivo).toMatch(/portadora/i);
  });

  it("BARREIRA 2: tom CONTÍNUO não vira Morse", () => {
    const x = new Float32Array(TAXA * 3);
    for (let i = 0; i < x.length; i++) x[i] = 0.6 * Math.sin((2 * Math.PI * 700 * i) / TAXA);
    const r = lerMorse(x, TAXA);
    expect(ehAchado(r)).toBe(false);
  });

  it("BARREIRA 3: pulsos todos iguais não têm a proporção do código", () => {
    // 20 pulsos idênticos: liga-desliga regular, mas sem dit/dah.
    const r = lerMorse(gerar(". . . . . . . . . . . . . . . . . . . ."), TAXA);
    expect(ehAchado(r)).toBe(false);
  });

  it("BARREIRA 4: poucos pulsos não decidem nada", () => {
    const r = lerMorse(gerar("... ---"), TAXA);
    expect(ehAchado(r)).toBe(false);
    if (!ehAchado(r)) expect(r.motivo).toMatch(/12/);
  });

  it("BARREIRA 6: ritmo de Morse mas grupos inexistentes → recusa", () => {
    // Grupos de 7 elementos alternando ponto e traço: a proporção dah/dit é
    // exatamente 3 (passa na barreira 3), o número de pulsos é alto (passa na
    // 4) — e nenhum deles existe no código. É o formato do falso positivo que
    // o binário FSK do arquivo de prova produziu.
    const r = lerMorse(gerar(".-.-.-. .-.-.-. .-.-.-. .-.-.-."), TAXA);
    expect(ehAchado(r)).toBe(false);
    if (!ehAchado(r)) expect(r.motivo).toMatch(/tabela|FSK/);
  });
});
