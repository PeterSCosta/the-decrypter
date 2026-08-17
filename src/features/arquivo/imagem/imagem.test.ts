import { describe, expect, it } from "vitest";
import { lerExif } from "./exif";
import { alfaOpaco, apenasCanal, medirPlanos, planoDeBit } from "./planos";

/** RGBA de `w × h`, preenchido por uma função. */
function imagem(
  w: number,
  h: number,
  f: (x: number, y: number) => [number, number, number, number],
) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = f(x, y);
      const i = (y * w + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = a;
    }
  }
  return px;
}

describe("planos de bit", () => {
  it("isola o bit pedido, em preto e branco", () => {
    // Vermelho alternando entre 0b10101010 e 0b01010101.
    const px = imagem(4, 2, (x) => [x % 2 === 0 ? 0xaa : 0x55, 0, 0, 255]);
    const bit0 = planoDeBit(px, "vermelho", 0);
    // 0xAA termina em 0 → preto; 0x55 termina em 1 → branco.
    expect(bit0[0]).toBe(0);
    expect(bit0[4]).toBe(255);
    // E o bit 1 inverte.
    const bit1 = planoDeBit(px, "vermelho", 1);
    expect(bit1[0]).toBe(255);
    expect(bit1[4]).toBe(0);
    // Sempre opaco: um plano com alfa variável seria ilegível.
    for (let i = 3; i < bit0.length; i += 4) expect(bit0[i]).toBe(255);
  });

  it("um canal sozinho vira cinza", () => {
    const px = imagem(2, 1, () => [200, 50, 10, 255]);
    expect(apenasCanal(px, "vermelho")[0]).toBe(200);
    expect(apenasCanal(px, "verde")[0]).toBe(50);
    expect(apenasCanal(px, "azul")[0]).toBe(10);
    // Cinza usa a luminância perceptual, não a média aritmética.
    const cinza = apenasCanal(px, "cinza")[0];
    expect(cinza).toBe(Math.round(0.299 * 200 + 0.587 * 50 + 0.114 * 10));
  });
});

describe("canal alfa", () => {
  it("acusa pixel invisível que ainda carrega cor", () => {
    // Metade transparente, mas colorida: escondido à vista de todos.
    const px = imagem(4, 1, (x) => (x < 2 ? [255, 0, 0, 0] : [0, 0, 255, 255]));
    const r = alfaOpaco(px);
    expect(r.pixelsInvisiveis).toBe(2);
    expect(r.comCorEscondida).toBe(2);
    // Forçado o opaco, a cor escondida aparece.
    expect(r.imagem[0]).toBe(255);
    expect(r.imagem[3]).toBe(255);
  });

  it("transparente e preto não conta como cor escondida", () => {
    const px = imagem(2, 1, () => [0, 0, 0, 0]);
    const r = alfaOpaco(px);
    expect(r.pixelsInvisiveis).toBe(2);
    expect(r.comCorEscondida).toBe(0);
  });
});

describe("medida dos planos — o indício mais barato", () => {
  it("ruído no bit baixo é reconhecido como ruído", () => {
    let s = 42 >>> 0;
    const px = imagem(64, 64, () => {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return [s & 0xff, (s >> 8) & 0xff, (s >> 16) & 0xff, 255];
    });
    const m = medirPlanos(px, 64);
    // Vizinhos independentes: concordam perto de metade das vezes.
    expect(m.continuidade.vermelho).toBeGreaterThan(0.4);
    expect(m.continuidade.vermelho).toBeLessThan(0.6);
    expect(m.leitura).toContain("ruído");
    // E a leitura NÃO promete ausência de mensagem.
    expect(m.leitura).toContain("não é ausência de mensagem");
  });

  it("estrutura no bit baixo é acusada", () => {
    // Faixas largas: o bit 0 fica constante por trechos longos.
    const px = imagem(64, 64, (x) => {
      const v = Math.floor(x / 8) % 2 === 0 ? 0 : 1;
      return [v, v, v, 255];
    });
    const m = medirPlanos(px, 64);
    expect(m.continuidade.vermelho).toBeGreaterThan(0.8);
    expect(m.leitura).toContain("MUITA estrutura");
  });
});

describe("EXIF", () => {
  /** JPEG com um APP1/EXIF contendo as tags pedidas. */
  function comExif(tags: { tag: number; texto: string }[]): Uint8Array {
    const corpo: number[] = [];
    const dados: number[] = [];
    const inicioDados = 8 + 2 + tags.length * 12 + 4;
    for (const t of tags) {
      const bytes = [...t.texto].map((c) => c.charCodeAt(0));
      bytes.push(0);
      const off = inicioDados + dados.length;
      corpo.push(
        (t.tag >> 8) & 0xff,
        t.tag & 0xff, // tag
        0,
        2, // tipo ASCII
        0,
        0,
        (bytes.length >> 8) & 0xff,
        bytes.length & 0xff, // quantidade
        (off >> 24) & 0xff,
        (off >> 16) & 0xff,
        (off >> 8) & 0xff,
        off & 0xff,
      );
      dados.push(...bytes);
    }
    const tiff = [
      0x4d,
      0x4d,
      0x00,
      0x2a, // "MM" + 42, big-endian
      0,
      0,
      0,
      8, // offset do IFD0
      (tags.length >> 8) & 0xff,
      tags.length & 0xff,
      ...corpo,
      0,
      0,
      0,
      0, // sem IFD1
      ...dados,
    ];
    const app1 = [...[..."Exif"].map((c) => c.charCodeAt(0)), 0, 0, ...tiff];
    const tamanho = app1.length + 2;
    return Uint8Array.from([
      0xff,
      0xd8,
      0xff,
      0xe1,
      (tamanho >> 8) & 0xff,
      tamanho & 0xff,
      ...app1,
      0xff,
      0xd9,
    ]);
  }

  it("lê fabricante, modelo e data", () => {
    const e = lerExif(
      comExif([
        { tag: 0x010f, texto: "Canon" },
        { tag: 0x0110, texto: "EOS 5D" },
        { tag: 0x9003, texto: "2017:08:12 14:03:22" },
      ]),
    );
    expect(e).not.toBeNull();
    const porTag = Object.fromEntries((e?.campos ?? []).map((c) => [c.tag, c.valor]));
    expect(porTag.Fabricante).toBe("Canon");
    expect(porTag.Modelo).toBe("EOS 5D");
    // CRU: a string exata, sem virar Date e sem deslocar por fuso. Com o
    // `reviveValues` padrão do exifr, isto voltaria como 17:03:22 UTC.
    expect(porTag["Data original"]).toBe("2017:08:12 14:03:22");
  });

  it("devolve null quando não há EXIF", () => {
    expect(lerExif(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    expect(lerExif(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBeNull();
  });
});
