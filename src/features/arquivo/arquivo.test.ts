import { montarWavBytes } from "@/features/audio/decode";
import { describe, expect, it } from "vitest";
import { procurarEmbutidos } from "./carve";
import { mapearEntropia, quiQuadradoUniforme } from "./entropia";
import { fimDeclarado, sobra } from "./fim";
import { identificar } from "./identidade";
import { noDeRecorte, noRaiz } from "./no";
import { acharBase64, acharTextos, corteDeTexto } from "./strings";

/** xorshift32: bits baixos honestos, ao contrário de um LCG em `double`. */
function ruido(n: number, semente = 12345): Uint8Array {
  let s = semente >>> 0;
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    b[i] = s & 0xff;
  }
  return b;
}

/**
 * Um JPEG com SEGMENTOS DE VERDADE — SOI, APP0/JFIF, DQT, SOF0, DHT, SOS, EOI.
 *
 * A primeira versão deste gerador era ruído com FFD8 na frente e FFD9 no fim, e
 * o validador estrutural (corretamente) a rejeitou. Fixture que não tem a
 * estrutura do formato não testa carving: testa `indexOf`.
 */
function jpegFalso(tamanho: number, semente = 7): Uint8Array {
  const seg = (marcador: number, carga: number[]) => [
    0xff,
    marcador,
    ((carga.length + 2) >> 8) & 0xff,
    (carga.length + 2) & 0xff,
    ...carga,
  ];
  const cabecalho = [
    0xff,
    0xd8, // SOI
    ...seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0]), // APP0/JFIF
    ...seg(0xdb, [0, ...Array(64).fill(16)]), // DQT
    ...seg(0xc0, [8, 0, 8, 0, 8, 1, 1, 0x11, 0]), // SOF0 8x8
    ...seg(0xc4, [0x00, ...Array(16).fill(0), 0]), // DHT
    ...seg(0xda, [1, 1, 0x00, 0, 63, 0]), // SOS
  ];
  const nDados = tamanho - cabecalho.length - 2;
  if (nDados < 16) throw new Error("tamanho pequeno demais para o fixture");
  const dados = ruido(nDados, semente);
  // Dentro do fluxo comprimido, 0xFF precisa de escape (FF00) — e sem isso um
  // FFD9 acidental truncaria o recorte no meio.
  for (let i = 0; i < dados.length; i++) if (dados[i] === 0xff) dados[i] = 0xfe;
  const b = new Uint8Array(tamanho);
  b.set(cabecalho, 0);
  b.set(dados, cabecalho.length);
  b.set([0xff, 0xd9], tamanho - 2);
  return b;
}

const wavDe = (segundos: number, canais = 2) => {
  const n = Math.round(44100 * segundos);
  const canal = Float32Array.from({ length: n }, (_, i) => Math.sin(i / 30) * 0.4);
  return montarWavBytes(canais === 2 ? [canal, canal.slice()] : [canal], 44100);
};

describe("identidade — os bytes, não a extensão", () => {
  it("reconhece WAV, e o WAV não é confundido com AVI nem WEBP", () => {
    const id = identificar(wavDe(0.05), "prova.wav");
    expect(id.tipo).toBe("WAV");
    expect(id.familia).toBe("audio");
    expect(id.extensaoBate).toBe(true);
  });

  it("acusa a extensão mentirosa", () => {
    const id = identificar(wavDe(0.05), "foto.jpg");
    expect(id.tipo).toBe("WAV");
    expect(id.extensaoBate).toBe(false);
  });

  it("não acusa quem não tem extensão nem assinatura conhecida", () => {
    expect(identificar(ruido(100), "sem-extensao").extensaoBate).toBe(true);
    expect(identificar(wavDe(0.05), "").extensaoBate).toBe(true);
  });

  it("o MP3 sem tag exige sync de verdade, não só o 0xFF", () => {
    // Qualquer binário que comece com FF viraria "MP3" numa regra frouxa.
    const quaseMp3 = new Uint8Array([0xff, 0x01, 0x02, ...ruido(50)]);
    expect(identificar(quaseMp3, "x.bin").tipo).not.toBe("MP3");
    const mp3 = new Uint8Array([0xff, 0xfb, 0x90, 0x00, ...ruido(50)]);
    expect(identificar(mp3, "x.mp3").tipo).toBe("MP3");
  });
});

describe("fim declarado", () => {
  it("acha o fim do WAV pelo cabeçalho RIFF", () => {
    const w = wavDe(0.05);
    expect(fimDeclarado(w)?.fim).toBe(w.length);
    expect(sobra(w)).toBeNull();
  });

  it("acha o fim do JPEG pelo FFD9", () => {
    const j = jpegFalso(2000);
    expect(fimDeclarado(j)?.fim).toBe(2000);
  });

  it("admite não saber, em vez de inventar", () => {
    // MP3 sem tag não declara tamanho: a sequência de frames simplesmente acaba.
    const mp3 = new Uint8Array([0xff, 0xfb, 0x90, 0x00, ...ruido(500)]);
    expect(fimDeclarado(mp3)).toBeNull();
  });

  it("box de MP4 com size 0 não vira sobra fantasma", () => {
    // `size == 0` é LEGAL e significa "vai até o fim". Tratado como literal,
    // o parser declararia sobra do meio do arquivo em diante — falso positivo
    // idêntico a um arquivo colado.
    const b = new Uint8Array(200);
    b.set([0, 0, 0, 16], 0);
    b.set(
      [...("ftypisom" as string)].map((c) => c.charCodeAt(0)),
      4,
    );
    b.set([0, 0, 0, 0], 16); // segundo box: size 0 → até o fim
    b.set(
      [...("mdat" as string)].map((c) => c.charCodeAt(0)),
      20,
    );
    const f = fimDeclarado(b);
    expect(f?.fim).toBe(200);
    expect(sobra(b)).toBeNull();
  });
});

describe("carving — o caso do áudio com a foto colada", () => {
  it("recorta a foto BYTE A BYTE idêntica, e o WAV continua íntegro", () => {
    const wav = wavDe(1);
    const foto = jpegFalso(9000);
    const juntos = new Uint8Array(wav.length + foto.length);
    juntos.set(wav, 0);
    juntos.set(foto, wav.length);

    // O arquivo se apresenta como WAV e assim continua.
    expect(identificar(juntos, "prova.wav").tipo).toBe("WAV");
    const s = sobra(juntos);
    expect(s?.inicio).toBe(wav.length);
    expect(s?.tamanho).toBe(foto.length);

    const achados = procurarEmbutidos(juntos);
    const jpeg = achados.find((a) => a.tipo === "JPEG" && a.forca === "confirmado");
    expect(jpeg).toBeDefined();
    expect(jpeg?.inicio).toBe(wav.length);
    expect(jpeg?.tamanho).toBe(foto.length);
    // O critério de pronto: byte a byte.
    expect(jpeg?.bytes).toEqual(foto);
  });

  it("4,5 MB de ruído não produzem NENHUM embutido confirmado", () => {
    // O critério de pronto da Fase 1. Assinatura de 3-4 bytes casa por acaso
    // milhares de vezes em 4,5 MB; o que não pode acontecer é alguma delas
    // passar pela validação estrutural e virar "achado".
    const puro = ruido(4_500_000, 999);
    const achados = procurarEmbutidos(puro);
    expect(achados.filter((a) => a.forca === "confirmado")).toEqual([]);
  });

  it("um arquivo dentro do outro sem sobra ainda é confirmado se a estrutura fecha", () => {
    const foto = jpegFalso(3000);
    const envelope = new Uint8Array(1000 + foto.length + 1000);
    envelope.set(ruido(1000, 3), 0);
    envelope.set(foto, 1000);
    const achado = procurarEmbutidos(envelope).find((a) => a.tipo === "JPEG");
    expect(achado?.forca).toBe("confirmado");
    expect(achado?.bytes).toEqual(foto);
  });
});

describe("textos — e o falso positivo que este módulo existe para evitar", () => {
  it("acha texto ASCII plantado", () => {
    const b = new Uint8Array(5000);
    b.set(ruido(5000, 5), 0);
    const frase = "A RESPOSTA ESTA NA PONTE DE FERRO";
    for (let i = 0; i < frase.length; i++) b[2000 + i] = frase.charCodeAt(i);
    b[2000 - 1] = 0;
    b[2000 + frase.length] = 0;
    expect(acharTextos(b).some((t) => t.texto.includes(frase))).toBe(true);
  });

  it("PCM silencioso NÃO vira enxurrada de strings UTF-16", () => {
    // `XX 00 XX 00` é exatamente PCM de 16 bits em baixa amplitude. Sem a
    // defesa, um WAV com qualquer passagem silenciosa produz milhares de
    // "strings UTF-16" — o falso positivo mais provável do sistema, porque
    // esta aba nasce colada num motor de áudio.
    const n = 100_000;
    const quase = Float32Array.from({ length: n }, (_, i) => (((i * 37) % 90) + 32) / 32768);
    const wav = montarWavBytes([quase], 44100);

    const comDefesa = acharTextos(wav, { regioesDeAmostras: [[44, wav.length]] });
    expect(comDefesa.filter((t) => t.codificacao === "utf16le")).toEqual([]);

    // E a prova de que a defesa é necessária: sem ela, aparece.
    const semDefesa = acharTextos(wav);
    expect(semDefesa.filter((t) => t.codificacao === "utf16le").length).toBeGreaterThan(0);
  });

  it("cadeia sem variedade não é texto", () => {
    const b = new Uint8Array(3000);
    b.fill(0x41, 1000, 1100); // 100 letras "A"
    expect(acharTextos(b).some((t) => /^A+$/.test(t.texto))).toBe(false);
  });

  it("o corte cresce com o arquivo", () => {
    expect(corteDeTexto(1_000)).toBeLessThan(corteDeTexto(10_000_000));
  });

  it("base64 exige múltiplo de 4 e variedade", () => {
    const b = new Uint8Array(2000);
    b.set(ruido(2000, 11), 0);
    const alvo = "TUVOU0FHRU0gRVNDT05ESURBIEVNIEJBU0U2NA==";
    for (let i = 0; i < alvo.length; i++) b[500 + i] = alvo.charCodeAt(i);
    b[499] = 0;
    b[500 + alvo.length] = 0;
    expect(acharBase64(b).some((t) => t.texto === alvo)).toBe(true);
  });
});

describe("entropia", () => {
  it("ruído dá perto de 8, e um bloco repetido dá perto de 0", () => {
    expect(mapearEntropia(ruido(50_000)).media).toBeGreaterThan(7.9);
    const zeros = new Uint8Array(50_000);
    expect(mapearEntropia(zeros).media).toBeLessThan(0.1);
  });

  it("acha o degrau de um bloco cifrado dentro de texto", () => {
    const n = 200_000;
    const b = new Uint8Array(n);
    // Fundo de "texto": alfabeto pequeno, entropia baixa.
    for (let i = 0; i < n; i++) b[i] = 0x61 + (i % 12);
    // Um bloco de 40 KB de ruído no meio.
    b.set(ruido(40_000, 77), 80_000);
    const m = mapearEntropia(b);
    expect(m.degraus.length).toBeGreaterThan(0);
    const d = m.degraus[0];
    expect(d.offset).toBeGreaterThanOrEqual(76_000);
    expect(d.offset).toBeLessThanOrEqual(84_000);
    // E a leitura NÃO promete distinguir cifrado de comprimido.
    expect(d.leitura).toContain("não separa");
  });

  it("arquivo já comprimido não vira suspeita", () => {
    // Todo MP3/JPEG/ZIP fica perto de 8; anunciar isso como achado seria
    // acusar todo arquivo do mundo.
    const m = mapearEntropia(ruido(300_000, 42));
    expect(m.degraus).toEqual([]);
    expect(m.leitura).toContain("Nada a concluir");
  });

  it("qui-quadrado separa uniforme de estruturado", () => {
    const uniforme = ruido(100_000, 5);
    const estruturado = new Uint8Array(100_000);
    for (let i = 0; i < estruturado.length; i++) estruturado[i] = i % 64;
    expect(quiQuadradoUniforme(uniforme, 0, 100_000)).toBeLessThan(
      quiQuadradoUniforme(estruturado, 0, 100_000),
    );
  });
});

describe("nome do recorte — o falso positivo que ele criava", () => {
  it("o nó recortado carrega extensão do próprio tipo", () => {
    // Sem ponto no nome, `split(".").pop()` devolve o nome inteiro como
    // extensão, e a primeira olhada anunciava «a extensão diz
    // ".jpeg-em-176444", os bytes dizem JPEG» — um achado FORTE e falso, no
    // topo da lista. Um recorte nasce do tipo detectado: a extensão dele nunca
    // pode divergir do conteúdo.
    const wav = wavDe(0.2);
    const foto = jpegFalso(3000);
    const juntos = new Uint8Array(wav.length + foto.length);
    juntos.set(wav, 0);
    juntos.set(foto, wav.length);

    const pai = noRaiz(juntos, "prova.wav", "audio/wav");
    const recorte = pai.analise.embutidos.find((e) => e.forca === "confirmado" && e.bytes);
    expect(recorte).toBeDefined();
    if (!recorte) return;

    const filho = noDeRecorte(pai, recorte);
    expect(filho?.nome).toMatch(/\.jpg$/);
    expect(filho?.analise.identidade.extensaoBate).toBe(true);
    // E nenhum achado forte reclamando de extensão.
    const falso = filho?.analise.achados.find((a) => a.titulo.includes("A extensão diz"));
    expect(falso).toBeUndefined();
  });
});
