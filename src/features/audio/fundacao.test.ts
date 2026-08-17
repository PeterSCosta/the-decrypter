import { describe, expect, it } from "vitest";
import { correlacao, medirCanais, mid, side } from "./canais";
import { analisarContainer } from "./container";
import { montarWavBytes } from "./decode";
import { goertzel, hann, magnitudes } from "./fft";
import { acharCorteDoCodec, calcularStft, energiaPorFaixa } from "./stft";

/** Um seno de `f` Hz, `n` amostras a `taxa`. */
function seno(f: number, n: number, taxa: number, amplitude = 1): Float64Array {
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = amplitude * Math.sin((2 * Math.PI * f * i) / taxa);
  return x;
}

const f32 = (x: Float64Array | number[]) => Float32Array.from(x);

describe("FFT", () => {
  it("acha o bin certo de um tom puro", () => {
    const taxa = 8000;
    const n = 1024;
    // 1000 Hz cai exatamente no bin 128 (1000 / (8000/1024) = 128).
    const m = magnitudes(seno(1000, n, taxa));
    let maior = 0;
    for (let i = 1; i < m.length; i++) if (m[i] > m[maior]) maior = i;
    expect(maior).toBe(128);
  });

  it("separa dois tons somados", () => {
    const taxa = 8000;
    const n = 1024;
    const a = seno(1000, n, taxa);
    const b = seno(2000, n, taxa);
    const soma = Float64Array.from(a.map((v, i) => v + b[i]));
    const m = magnitudes(soma);
    // Os dois picos, e nada de relevante entre eles.
    expect(m[128]).toBeGreaterThan(m[190] * 10);
    expect(m[256]).toBeGreaterThan(m[190] * 10);
  });

  it("recusa tamanho que não é potência de 2", () => {
    expect(() => magnitudes(new Float64Array(1000))).toThrow(/potência de 2/);
  });

  it("Hann começa e termina em zero", () => {
    const w = hann(64);
    expect(w[0]).toBeCloseTo(0, 10);
    expect(w[63]).toBeCloseTo(0, 10);
    expect(w[32]).toBeGreaterThan(0.99);
  });
});

describe("Goertzel", () => {
  it("responde forte na frequência presente e fraco na ausente", () => {
    const taxa = 8000;
    const x = seno(697, 512, taxa); // linha de baixo do DTMF
    const presente = goertzel(x, taxa, 697);
    const ausente = goertzel(x, taxa, 1209);
    expect(presente).toBeGreaterThan(ausente * 20);
  });

  it("detecta o par de um dígito DTMF de verdade", () => {
    // A tecla "1" é 697 Hz + 1209 Hz somados.
    const taxa = 8000;
    const n = 512;
    const a = seno(697, n, taxa, 0.5);
    const b = seno(1209, n, taxa, 0.5);
    const tecla1 = Float64Array.from(a.map((v, i) => v + b[i]));
    const linhas = [697, 770, 852, 941].map((f) => goertzel(tecla1, taxa, f));
    const colunas = [1209, 1336, 1477, 1633].map((f) => goertzel(tecla1, taxa, f));
    expect(linhas.indexOf(Math.max(...linhas))).toBe(0);
    expect(colunas.indexOf(Math.max(...colunas))).toBe(0);
  });
});

describe("canais", () => {
  it("mid e side reconstroem os canais", () => {
    const e = f32([0.5, -0.25, 0.75, 0]);
    const d = f32([0.1, 0.25, -0.75, 0.5]);
    const m = mid(e, d);
    const s = side(e, d);
    for (let i = 0; i < 4; i++) {
      expect(m[i] + s[i]).toBeCloseTo(e[i], 6);
      expect(m[i] - s[i]).toBeCloseTo(d[i], 6);
    }
  });

  it("mono duplicado é reconhecido como estéreo falso", () => {
    const x = f32(seno(440, 4096, 44100));
    const m = medirCanais([x, x.slice()]);
    expect(m.maiorDiferenca).toBe(0);
    expect(m.leitura).toContain("idênticos bit a bit");
  });

  it("ANTIFASE: a mensagem some no mono e vive no side", () => {
    // O esconderijo que motiva a vista "Diferença": D = −E.
    const x = f32(seno(440, 4096, 44100));
    const invertido = f32(Array.from(x, (v) => -v));
    const m = medirCanais([x, invertido]);
    expect(m.correlacao).toBeLessThan(-0.99);
    expect(m.leitura).toContain("OPOSIÇÃO DE FASE");

    // A prova numérica: somado para mono não sobra nada; no side sobra tudo.
    const somaMono = mid(x, invertido);
    expect(Math.max(...somaMono)).toBeCloseTo(0, 6);
    const lateral = side(x, invertido);
    expect(Math.max(...lateral)).toBeCloseTo(Math.max(...x), 6);
  });

  it("mensagem só no canal direito aparece na correlação", () => {
    const musica = f32(seno(220, 4096, 44100));
    const comSegredo = f32(
      Array.from(musica, (v, i) => v + 0.3 * Math.sin((2 * Math.PI * 3000 * i) / 44100)),
    );
    const m = medirCanais([musica, comSegredo]);
    expect(m.estereo).toBe(true);
    expect(m.maiorDiferenca).toBeGreaterThan(0.1);
  });

  it("mono não inventa segundo canal", () => {
    expect(medirCanais([f32(seno(440, 1024, 44100))]).estereo).toBe(false);
  });

  it("correlação de sinal com ele mesmo é 1", () => {
    const x = f32(seno(440, 1024, 44100));
    expect(correlacao(x, x)).toBeCloseTo(1, 6);
  });
});

describe("contêiner (bytes crus)", () => {
  /** WAV mínimo válido, com `n` bytes de dado. */
  function wav(nDados: number, extras: Uint8Array = new Uint8Array(0)): Uint8Array {
    const b = new Uint8Array(44 + nDados + extras.length);
    const dv = new DataView(b.buffer);
    b.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    dv.setUint32(4, 36 + nDados, true);
    b.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
    b.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true); // PCM
    dv.setUint16(22, 2, true); // canais
    dv.setUint32(24, 44100, true); // taxa
    dv.setUint16(34, 16, true); // bits
    b.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
    dv.setUint32(40, nDados, true);
    if (extras.length) b.set(extras, 44 + nDados);
    return b;
  }

  it("lê formato, taxa e canais do cabeçalho", () => {
    const f = analisarContainer(wav(100), "prova.wav");
    expect(f.formato).toBe("wav");
    expect(f.taxaDeclarada).toBe(44100);
    expect(f.canaisDeclarados).toBe(2);
    expect(f.bitsPorAmostra).toBe(16);
    expect(f.extensaoBate).toBe(true);
  });

  it("acusa bytes depois do fim declarado — o zip colado no fim", () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8]);
    const f = analisarContainer(wav(100, zip), "prova.wav");
    expect(f.bytesDepoisDoFim).toBe(12);
    const achadoZip = f.embutidos.find((x) => x.tipo === "ZIP");
    expect(achadoZip?.forca).toBe("depois-do-fim");
    expect(f.observacoes.join(" ")).toContain("depois do fim declarado");
  });

  it("acusa extensão que não bate com o conteúdo", () => {
    const f = analisarContainer(wav(50), "musica.mp3");
    expect(f.extensaoBate).toBe(false);
    expect(f.observacoes.join(" ")).toContain("não corresponde");
  });

  it("acha chunk RIFF fora do comum e o texto dentro dele", () => {
    // Um chunk "sEcR" com texto, inserido antes do data.
    const texto = "MENSAGEM ESCONDIDA";
    const bytes = new Uint8Array(44 + 8 + texto.length + 20);
    bytes.set(wav(20).subarray(0, 36), 0);
    const dv = new DataView(bytes.buffer);
    bytes.set([0x73, 0x45, 0x63, 0x52], 36); // "sEcR"
    dv.setUint32(40, texto.length, true);
    for (let i = 0; i < texto.length; i++) bytes[44 + i] = texto.charCodeAt(i);
    const off = 44 + texto.length;
    bytes.set([0x64, 0x61, 0x74, 0x61], off);
    dv.setUint32(off + 4, 20, true);
    dv.setUint32(4, bytes.length - 8, true);

    const f = analisarContainer(bytes, "x.wav");
    expect(f.chunks.some((c) => c.id === "sEcR" && !c.conhecido)).toBe(true);
    expect(f.textos.some((t) => t.texto.includes("MENSAGEM ESCONDIDA"))).toBe(true);
  });

  it("arquivo limpo não gera observação nenhuma", () => {
    // A disciplina do falso positivo: sem anomalia, silêncio.
    const f = analisarContainer(wav(1000), "limpo.wav");
    expect(f.observacoes).toEqual([]);
    expect(f.embutidos).toEqual([]);
  });

  it("reconhece MP3 pelo ID3 e pelo frame sync", () => {
    const comId3 = new Uint8Array(200);
    comId3.set([0x49, 0x44, 0x33, 3, 0], 0);
    expect(analisarContainer(comId3, "a.mp3").formato).toBe("mp3");

    const semTag = new Uint8Array([0xff, 0xfb, 0x90, 0x00, ...new Array(100).fill(0)]);
    expect(analisarContainer(semTag, "b.mp3").formato).toBe("mp3");
  });
});

describe("STFT e espectro", () => {
  it("põe a energia no bin certo, no tempo certo", () => {
    const taxa = 8000;
    // 1 s de silêncio, 1 s de 1000 Hz.
    const x = new Float32Array(taxa * 2);
    for (let i = taxa; i < taxa * 2; i++) x[i] = Math.sin((2 * Math.PI * 1000 * i) / taxa);
    const esp = calcularStft(x, taxa, { n: 1024, salto: 512, pisoDb: -100 });

    const bin1000 = Math.round(1000 / esp.resolucaoHz);
    const primeiro = esp.quadros[2][bin1000];
    const ultimo = esp.quadros[esp.quadros.length - 3][bin1000];
    expect(primeiro).toBeLessThan(-60); // no silêncio
    expect(ultimo).toBeGreaterThan(-12); // no tom
  });

  it("um seno de amplitude 1 chega perto de 0 dB", () => {
    const taxa = 8000;
    const x = new Float32Array(4096);
    for (let i = 0; i < x.length; i++) x[i] = Math.sin((2 * Math.PI * 1000 * i) / taxa);
    const esp = calcularStft(x, taxa, { n: 1024, salto: 512, pisoDb: -100 });
    const bin = Math.round(1000 / esp.resolucaoHz);
    const pico = Math.max(...esp.quadros.map((q) => q[bin]));
    expect(pico).toBeGreaterThan(-3);
    expect(pico).toBeLessThan(3);
  });

  it("acha energia numa faixa ultrassônica plantada", () => {
    const taxa = 48000;
    const x = new Float32Array(taxa);
    for (let i = 0; i < x.length; i++) {
      x[i] =
        0.5 * Math.sin((2 * Math.PI * 440 * i) / taxa) +
        0.2 * Math.sin((2 * Math.PI * 19000 * i) / taxa);
    }
    const esp = calcularStft(x, taxa, { n: 2048, salto: 1024, pisoDb: -120 });
    const [audivel, ultra] = energiaPorFaixa(esp, [
      [300, 5000],
      [18000, 22000],
    ]);
    // A portadora inaudível está claramente acima do piso.
    expect(ultra.db).toBeGreaterThan(-60);
    expect(audivel.db).toBeGreaterThan(ultra.db);
  });

  it("acha o corte de um codec simulado", () => {
    const taxa = 44100;
    const x = new Float32Array(taxa);
    // Soma de tons só até 10 kHz — como se o codec tivesse cortado ali.
    for (let f = 200; f <= 10000; f += 200) {
      for (let i = 0; i < x.length; i++) x[i] += 0.05 * Math.sin((2 * Math.PI * f * i) / taxa);
    }
    const esp = calcularStft(x, taxa, { n: 2048, salto: 1024, pisoDb: -140 });
    const corte = acharCorteDoCodec(esp);
    expect(corte).not.toBeNull();
    expect(corte as number).toBeGreaterThan(9000);
    expect(corte as number).toBeLessThan(13000);
  });

  it("num WAV de espectro cheio não inventa corte", () => {
    const taxa = 8000;
    const x = new Float32Array(8192);
    let s = 1 >>> 0;
    for (let i = 0; i < x.length; i++) {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      x[i] = (s / 0xffffffff) * 2 - 1; // ruído branco: energia até Nyquist
    }
    const esp = calcularStft(x, taxa, { n: 1024, salto: 512, pisoDb: -120 });
    expect(acharCorteDoCodec(esp)).toBeNull();
  });
});

describe("força do achado — a defesa contra o falso positivo", () => {
  /**
   * O caso REAL que motivou a distinção: um WAV de 1 s com uma foto colada no
   * fim fazia o detector apontar um "JPEG" no offset 46.592 — dentro das
   * amostras — em vez do arquivo de verdade, lá no fim. Assinatura de 3 bytes
   * (`FF D8 FF`) casa por acaso em qualquer massa de dados.
   */
  it("acha a foto colada no FIM, e não o casamento por acaso no meio do áudio", () => {
    const canal = Float32Array.from({ length: 44100 }, (_, i) => Math.sin(i / 20) * 0.5);
    const wav = montarWavBytes([canal, canal], 44100);

    const jpeg = new Uint8Array(5000);
    jpeg.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46], 0);
    for (let i = 10; i < jpeg.length - 2; i++) jpeg[i] = (i * 7) & 0xff;
    jpeg.set([0xff, 0xd9], jpeg.length - 2);

    const juntos = new Uint8Array(wav.length + jpeg.length);
    juntos.set(wav, 0);
    juntos.set(jpeg, wav.length);

    const f = analisarContainer(juntos, "prova.wav");
    const achado = f.embutidos.find((x) => x.tipo === "JPEG");
    expect(achado).toBeDefined();
    // O offset tem de ser o do arquivo REAL, não o do acaso.
    expect(achado?.offset).toBe(wav.length);
    expect(achado?.forca).toBe("depois-do-fim");
    expect(f.bytesDepoisDoFim).toBe(5000);
  });

  it("num arquivo sem nada colado, o que sobra é marcado como fraco", () => {
    // Não esconder o achado fraco: mostrá-lo COMO fraco. Quem quiser cavar,
    // cava; quem está com pressa não é enganado.
    const canal = Float32Array.from({ length: 44100 }, (_, i) => Math.sin(i / 20) * 0.5);
    const limpo = montarWavBytes([canal, canal], 44100);
    const f = analisarContainer(limpo, "limpo.wav");
    expect(f.bytesDepoisDoFim).toBe(0);
    for (const e of f.embutidos) expect(e.forca).toBe("dentro-do-dado");
  });
});
