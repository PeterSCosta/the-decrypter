import { describe, expect, it } from "vitest";
import { CORRIDA_MINIMA, detectarAnomaliaDeBit, extrairLsb, offsetDoPcm, varrerLsb } from "./lsb";

/**
 * Gera um WAV PCM 16 bits com `nAmostras` por canal, ruído determinístico, e
 * opcionalmente uma mensagem escondida nos bits baixos.
 *
 * Este gerador é o que torna o extrator testável sem depender de arquivo
 * externo: aqui a verdade é conhecida por construção.
 */
function wavComSegredo(opts: {
  nAmostras: number;
  canais: number;
  mensagem?: string;
  ordem?: "msb-primeiro" | "lsb-primeiro";
  /** Esconder só neste canal (0 ou 1). */
  canal?: number | null;
}): Uint8Array {
  const { nAmostras, canais, mensagem = "", ordem = "msb-primeiro", canal = null } = opts;
  const nDados = nAmostras * canais * 2;
  const b = new Uint8Array(44 + nDados);
  const dv = new DataView(b.buffer);
  b.set([0x52, 0x49, 0x46, 0x46], 0);
  dv.setUint32(4, 36 + nDados, true);
  b.set([0x57, 0x41, 0x56, 0x45], 8);
  b.set([0x66, 0x6d, 0x74, 0x20], 12);
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, canais, true);
  dv.setUint32(24, 44100, true);
  dv.setUint16(34, 16, true);
  b.set([0x64, 0x61, 0x74, 0x61], 36);
  dv.setUint32(40, nDados, true);

  // Portadora determinística (sem Math.random: teste tem de ser reproduzível).
  //
  // xorshift32, e NÃO um LCG do tipo `x*1103515245 + 12345`: em JS aquele
  // produto passa de 2**53 e o double perde justamente os bits baixos, que
  // saem quase todos zero. Num teste de LSB isso é fatal — a portadora ficaria
  // com o bit menos significativo constante, e o teste do "áudio limpo"
  // passaria pelo motivo errado.
  let semente = 12345 >>> 0;
  const proximo = () => {
    semente ^= semente << 13;
    semente >>>= 0;
    semente ^= semente >>> 17;
    semente ^= semente << 5;
    semente >>>= 0;
    return semente;
  };
  for (let i = 0; i < nAmostras * canais; i++) {
    dv.setInt16(44 + i * 2, (proximo() % 20000) - 10000, true);
  }

  // Bits da mensagem, na mesma convenção que o extrator usa.
  const bits: number[] = [];
  for (let i = 0; i < mensagem.length; i++) {
    const c = mensagem.charCodeAt(i);
    if (ordem === "msb-primeiro") for (let k = 7; k >= 0; k--) bits.push((c >> k) & 1);
    else for (let k = 0; k < 8; k++) bits.push((c >> k) & 1);
  }

  let iBit = 0;
  for (let p = 0; p < nAmostras && iBit < bits.length; p++) {
    for (let c = 0; c < canais && iBit < bits.length; c++) {
      if (canal !== null && c !== canal) continue;
      const off = 44 + (p * canais + c) * 2;
      b[off] = (b[off] & 0xfe) | bits[iBit++];
    }
  }
  return b;
}

const BASE = { bitsPorAmostra: 16, canais: 2, offset: 44 };

describe("offset do PCM", () => {
  it("acha o começo do chunk data", () => {
    expect(offsetDoPcm(wavComSegredo({ nAmostras: 10, canais: 2 }))).toBe(44);
  });
  it("devolve null para quem não é RIFF", () => {
    expect(offsetDoPcm(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBe(null);
  });
});

describe("extração de LSB", () => {
  it("recupera a mensagem escondida, byte a byte", () => {
    const segredo = "A RESPOSTA E A PONTE DE FERRO";
    const wav = wavComSegredo({ nAmostras: 4000, canais: 2, mensagem: segredo });
    const r = extrairLsb(wav, { ...BASE, canal: null, ordem: "msb-primeiro", quantosBits: 1 });
    expect(r.maiorCorrida).toContain(segredo);
  });

  it("a ordem dos bits importa — e a errada não acha nada", () => {
    const segredo = "MENSAGEM ESCONDIDA NO BIT MENOS SIGNIFICATIVO";
    const wav = wavComSegredo({
      nAmostras: 4000,
      canais: 2,
      mensagem: segredo,
      ordem: "lsb-primeiro",
    });
    const certa = extrairLsb(wav, { ...BASE, canal: null, ordem: "lsb-primeiro", quantosBits: 1 });
    const errada = extrairLsb(wav, { ...BASE, canal: null, ordem: "msb-primeiro", quantosBits: 1 });
    expect(certa.maiorCorrida).toContain(segredo);
    expect(errada.maiorCorrida).not.toContain(segredo);
  });

  it("mensagem só no canal direito", () => {
    const segredo = "SO NO CANAL DIREITO ESTA A RESPOSTA";
    const wav = wavComSegredo({ nAmostras: 6000, canais: 2, mensagem: segredo, canal: 1 });
    const soDireito = extrairLsb(wav, { ...BASE, canal: 1, ordem: "msb-primeiro", quantosBits: 1 });
    expect(soDireito.maiorCorrida).toContain(segredo);
  });

  it("a varredura acha sozinha, sem receber a configuração", () => {
    // É o caso real: ninguém avisa em que canal nem em que ordem escondeu.
    const segredo = "ACHOU SEM SABER ONDE PROCURAR NESTE ARQUIVO";
    const wav = wavComSegredo({
      nAmostras: 8000,
      canais: 2,
      mensagem: segredo,
      canal: 1,
      ordem: "lsb-primeiro",
    });
    const melhor = varrerLsb(wav, BASE)[0];
    expect(melhor.maiorCorrida).toContain(segredo);
    expect(melhor.opcoes.canal).toBe(1);
    expect(melhor.opcoes.ordem).toBe("lsb-primeiro");
  });

  it("áudio LIMPO não produz corrida longa — a disciplina do falso positivo", () => {
    // O pecado capital seria gritar "mensagem" aqui. Um segundo de áudio dá
    // ~11 mil bytes de LSB; corridas curtas por acaso são esperadas, longas não.
    const limpo = wavComSegredo({ nAmostras: 44100, canais: 2 });
    const melhor = varrerLsb(limpo, BASE)[0];
    expect(melhor.maiorCorrida.length).toBeLessThan(CORRIDA_MINIMA);
    expect(melhor.trechos).toEqual([]);
  });
});

describe("anomalia estatística (o caso do dado cifrado)", () => {
  it("acusa o rastro quando TODOS os bits baixos foram substituídos", () => {
    // Steghide e DeepSound cifram: não há texto para achar, só o histograma.
    const wav = wavComSegredo({ nAmostras: 20000, canais: 2 });
    let semente = 999 >>> 0;
    const proximo = () => {
      semente ^= semente << 13;
      semente >>>= 0;
      semente ^= semente >>> 17;
      semente ^= semente << 5;
      semente >>>= 0;
      return semente;
    };
    for (let p = 44; p + 2 <= wav.length; p += 2) {
      wav[p] = (wav[p] & 0xfe) | (proximo() & 1);
    }
    const a = detectarAnomaliaDeBit(wav, BASE);
    expect(a.proporcaoDeUns).toBeGreaterThan(0.45);
    expect(a.proporcaoDeUns).toBeLessThan(0.55);
    expect(a.amostrasAnalisadas).toBeGreaterThan(1000);
  });

  it("não inventa leitura quando há amostras de menos", () => {
    const curto = wavComSegredo({ nAmostras: 50, canais: 2 });
    expect(detectarAnomaliaDeBit(curto, BASE).leitura).toContain("de menos");
  });
});
