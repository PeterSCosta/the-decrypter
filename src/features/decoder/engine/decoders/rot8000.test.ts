import { describe, expect, it } from "vitest";
import { decoders as registry } from "../registry";
import { partition, runDecoders } from "../run";
import type { DecodeContext } from "../types";
import { rot8000, decoders as rot8000Decoder } from "./rot8000";

const ctx = (only?: string): DecodeContext => ({
  key: "",
  streets: null,
  ceps: null,
  ...(only ? { only } : {}),
});
const out = (input: string, only?: string) =>
  rot8000Decoder.decode(input, ctx(only)).map((c) => c.output);

describe("ROT8000 — a rotação", () => {
  // Âncoras conferidas contra a implementação de referência (rottytooth/rot8000):
  // as 9 faixas dão alfabeto de 63.404 posições e deslocamento de 31.702, e os
  // code points da saída são U+7C4B U+7C75 U+7C7E U+7C76 U+7C6E U+7C77 U+7C6A U+7C7E.
  it("Blumenau vira ideograma", () => {
    expect(rot8000("Blumenau")).toBe("籋籵籾籶籮籷籪籾");
  });

  it("GINCANA vira ideograma", () => {
    expect(rot8000("GINCANA")).toBe("籐籒籗籌籊籗籊");
  });

  it("é auto-inversa: girar duas vezes devolve o original", () => {
    for (const s of [
      "Blumenau",
      "GINCANA",
      "Itajaí Challenge 2026",
      "o rato roeu a roupa do rei",
    ]) {
      expect(rot8000(rot8000(s))).toBe(s);
    }
  });

  it("o espaço não gira — ele está no buraco 0–32", () => {
    expect(rot8000("A B")).toBe("籊 籋");
  });

  it("acentuado gira junto, porque a faixa 161–5759 cobre o Latin-1", () => {
    expect(rot8000("Itajaí")).toBe("籒籽籪米籪糔");
    expect(rot8000("籒籽籪米籪糔")).toBe("Itajaí");
  });

  it("emoji está fora do BMP e passa intacto", () => {
    expect(rot8000("\u{1F600}")).toBe("\u{1F600}");
  });

  it("o alfabeto tem mesmo 63.404 posições — todo code point do BMP volta ao lugar", () => {
    let girados = 0;
    for (let cp = 0; cp <= 0xffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue; // substituto solto, não é texto
      const ch = String.fromCodePoint(cp);
      const ida = rot8000(ch);
      expect(rot8000(ida)).toBe(ch);
      if (ida !== ch) girados++;
    }
    expect(girados).toBe(63404);
  });
});

describe("ROT8000 — o decoder na bancada", () => {
  it("decifra o ideograma de volta para português", () => {
    expect(out("籋籵籾籶籮籷籪籾")).toEqual(["Blumenau"]);
  });

  it("decifra uma frase inteira, espaços preservados", () => {
    expect(out(rot8000("o rato roeu a roupa do rei"))).toEqual(["o rato roeu a roupa do rei"]);
  });

  it("não força pontuação: quem ranqueia é o scorer, e a saída é texto", () => {
    const [c] = rot8000Decoder.decode("籋籵籾籶籮籷籪籾", ctx());
    expect(c.forcedScore).toBeUndefined();
    expect(c.notes).toContain("31.702");
  });

  it("encode cifra português em ideograma", () => {
    expect(rot8000Decoder.encode?.("Blumenau", ctx())).toBe("籋籵籾籶籮籷籪籾");
  });

  it("entra no registro automático", () => {
    expect(registry.some((d) => d.id === "rot8000")).toBe(true);
  });
});

describe("ROT8000 — portão anti-ruído", () => {
  // A cifra é auto-inversa: o mesmo código cifra e decifra. Sem portão, TODA
  // entrada latina ganharia um cartão de ideogramas. A sonda abaixo é a lista
  // de entradas que a bancada vê o dia inteiro.
  it("cala nas entradas do dia a dia", () => {
    const sonda = [
      "89010-000", // CEP
      "111.444.777-35", // CPF (dígitos conferidos)
      "(47) 3348-4000", // telefone
      "-26.9194, -48.6614", // coordenada
      "14/08/2026", // data
      "Qmx1bWVuYXU=", // Base64
      "o rato roeu a roupa do rei de roma", // prosa
      "GINCANA", // texto solto em caixa alta
      "Itajaí Challenge", // prosa acentuada
      "4205407", // código IBGE
      ".- -... -.-.", // morse
      "01001000 01001001", // binário
    ];
    for (const s of sonda) expect(out(s)).toEqual([]);
  });

  it("um ideograma solto não é cifra", () => {
    expect(out("籋")).toEqual([]);
    expect(out("籋籵籾")).toEqual([]); // abaixo do mínimo de 4 giráveis
  });

  it("texto CJK legítimo volta como glifo alto, não como latim, e é barrado", () => {
    // Chinês e japonês reais ocupam faixa larga do CJK; só o recorte estreito
    // U+7C4A–U+7CA7 (a imagem do ASCII imprimível) atravessa o portão.
    expect(out("中文测试文本内容")).toEqual([]);
    expect(out("日本語のテキストです")).toEqual([]);
    expect(out("한국어 텍스트 입니다")).toEqual([]);
  });

  it("braille tem decoder próprio e não é sequestrado por aqui", () => {
    expect(out("⠃⠇⠥⠍⠑⠝⠁⠥")).toEqual([]);
  });

  it("uma pitada de ideograma em texto latino não abre o portão", () => {
    expect(out("Blumenau 籋籵籾籶")).toEqual([]);
  });

  it("no modo uma-cifra-só o portão sai da frente, e dá pra cifrar", () => {
    expect(out("Blumenau", "rot8000")).toEqual(["籋籵籾籶籮籷籪籾"]);
    expect(out("中文", "rot8000")).toHaveLength(1);
  });
});

describe("ROT8000 — na bancada inteira", () => {
  // O teste que importa: a prova de que a saída correta ganha o ranking sozinha
  // e que o decoder não aparece onde não foi chamado.
  it("ganha o topo do fan-out com a frase decifrada", () => {
    const cifrado = rot8000("a resposta desta prova e blumenau");
    const { results } = runDecoders(cifrado, ctx());
    expect(results[0].decoderId).toBe("rot8000");
    expect(results[0].output).toBe("a resposta desta prova e blumenau");
    // e passa folgado do corte de 0.35 do partition
    const { likely } = partition(results);
    expect(likely[0].decoderId).toBe("rot8000");
  });

  it("não polui o fan-out de uma entrada latina comum", () => {
    for (const s of ["Qmx1bWVuYXU=", "o rato roeu a roupa do rei", "89010-000"]) {
      const { results } = runDecoders(s, ctx());
      expect(results.some((r) => r.decoderId === "rot8000")).toBe(false);
    }
  });
});
