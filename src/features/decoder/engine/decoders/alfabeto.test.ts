import { ALPHABETS } from "@/features/reference/alphabets";
import { describe, expect, it } from "vitest";
import { runDecoders } from "../run";
import type { DecodeContext } from "../types";
import { decoders as alfabeto } from "./alfabeto";

const ctx = (key = "", aux?: string): DecodeContext => ({ key, aux, streets: null, ceps: null });
const decode = (input: string, key = "", aux?: string) => alfabeto.decode(input, ctx(key, aux));
const first = (input: string, key = "", aux?: string) => decode(input, key, aux)[0];

describe("alfabeto — contagem e ordem", () => {
  it("a 5ª letra do havaiano é U (13 letras, vogais primeiro)", () => {
    const c = first("5", "havaiano");
    expect(c.output).toBe("U");
    expect(c.notes).toContain("13 letras");
  });

  it("a 5ª do latino continua sendo E", () => {
    expect(first("5", "latino").output).toBe("E");
  });

  it("o havaiano acaba no ʻokina, a 13ª letra", () => {
    expect(first("13", "havaiano").output).toBe("ʻ");
  });

  it("lê uma lista de índices, e a volta fecha", () => {
    // ALOHA no havaiano: A=1, L=8, O=4, H=6.
    expect(first("1 8 4 6 1", "havaiano").output).toBe("ALOHA");
    expect(first("ALOHA", "havaiano").output).toBe("1 8 4 6 1");
  });

  it("índice fora da faixa não devolve resposta parcial", () => {
    const cs = decode("5 14", "havaiano");
    expect(cs.every((c) => c.output !== "U")).toBe(true);
  });

  it("letra → posição, e o Ñ do espanhol empurra o O para 16", () => {
    expect(first("O", "espanhol").output).toBe("16");
    // No latino puro "letra → posição" é o A1Z26, que já tem decoder próprio:
    // aqui sobra o painel.
    expect(first("O", "latino").forcedScore).toBe(0.3);
    expect(first("15", "latino").output).toBe("O");
  });

  it("texto longo não vira tira de índices", () => {
    expect(decode("Uma frase inteira nao se le letra por letra", "espanhol")[0].forcedScore).toBe(
      0.3,
    );
  });

  it("português antes do Acordo tem 23 letras: a 23ª é Z, no latino é W", () => {
    expect(first("23", "portugues antigo").output).toBe("Z");
    expect(first("23", "latino").output).toBe("W");
  });

  it("no turco, i e ı são letras diferentes (12ª e 11ª)", () => {
    expect(first("i", "turco").output).toBe("12");
    expect(first("ı", "turco").output).toBe("11");
    expect(first("11 12", "turco").output).toBe("Iİ");
  });

  it("as contagens do dataset batem com o que a prova cita", () => {
    const count = (id: string) => ALPHABETS.find((a) => a.id === id)?.letters.length;
    expect(count("havaiano")).toBe(13);
    expect(count("rotokas")).toBe(12);
    expect(count("grego")).toBe(24);
    expect(count("cirilico")).toBe(33);
    expect(count("hebraico")).toBe(22);
    expect(count("arabe")).toBe(28);
    expect(count("latino")).toBe(26);
    expect(count("portugues-antigo")).toBe(23);
    expect(count("espanhol")).toBe(27);
    expect(count("italiano")).toBe(21);
    expect(count("islandes")).toBe(32);
    expect(count("turco")).toBe(29);
    expect(count("esperanto")).toBe(28);
    expect(count("georgiano")).toBe(33);
    expect(count("futhark-antigo")).toBe(24);
    expect(count("futhark-recente")).toBe(16);
    expect(count("hangul")).toBe(24);
    expect(count("kana")).toBe(46);
  });

  it("transliteração e nomes ficam alinhados com as letras", () => {
    for (const a of ALPHABETS) {
      if (a.latin) expect(a.latin, a.id).toHaveLength(a.letters.length);
      if (a.letterNames) expect(a.letterNames, a.id).toHaveLength(a.letters.length);
      expect(new Set(a.letters).size, a.id).toBe(a.letters.length);
    }
  });
});

describe("alfabeto — reconhece a escrita sem ninguém pedir", () => {
  it("Χαίρε é grego, tem 24 letras e translitera", () => {
    const c = first("Χαίρε");
    expect(c.label).toContain("Grego");
    expect(c.label).toContain("24 letras");
    expect(c.output).toBe("Chaire");
  });

  it("o sigma final e o tonos não viram letra nova", () => {
    // Οδυσσεύς: o ς final é a mesma 18ª letra do σ.
    expect(first("Οδυσσεύς").output).toBe("Odysseys");
  });

  it("cirílico russo (33 letras)", () => {
    const c = first("Привет");
    expect(c.label).toContain("33 letras");
    expect(c.output).toBe("Privet");
  });

  it("hebraico (22 letras), com forma final", () => {
    const c = first("שלום");
    expect(c.label).toContain("22 letras");
    expect(c.output).toBe("shlvm");
  });

  it("árabe (28 letras)", () => {
    expect(first("سلام").label).toContain("28 letras");
  });

  it("Elder Futhark (24) e Younger Futhark (16) se separam pelas runas usadas", () => {
    expect(first("ᚠᚢᚦᚨᚱᚲ").label).toContain("Elder");
    expect(first("ᚠᚢᚦᚬᚱᚴ").label).toContain("Younger");
  });

  it("hangul se desmonta em jamo e romaniza a sílaba", () => {
    const c = first("한글");
    expect(c.output).toBe("hangeul");
    expect(c.label).toContain("24 letras");
  });

  it("kana: 46 no gojūon, e a 5ª é お", () => {
    expect(first("ありがとう").output).toBe("arigatou");
    expect(first("5", "kana").output).toBe("お");
  });

  it("georgiano (33 letras)", () => {
    expect(first("გამარჯობა").label).toContain("33 letras");
  });

  it("um único glifo colado ainda é reconhecido", () => {
    expect(first("Ω").output).toBe("O");
  });

  it("um π perdido no meio da prosa não vira 'texto em grego'", () => {
    expect(decode("a area do circulo usa π como constante")).toEqual([]);
  });
});

describe("alfabeto — chave e painel", () => {
  it("chave que não nomeia alfabeto nenhum não acende nada", () => {
    expect(decode("5", "LIMA")).toEqual([]);
    expect(decode("5", "")).toEqual([]);
  });

  it("o alfabeto também pode vir pelo segundo campo", () => {
    expect(first("5", "", "havaiano").output).toBe("U");
  });

  it("entrada que não é índice nem palavra vira painel, abaixo do corte", () => {
    const c = first("84 79 80 79", "havaiano");
    expect(c.forcedScore).toBe(0.3);
    expect(c.output).toContain("13 letras");
    // 0.35 é o corte do partition: painel nunca disputa o topo.
    expect(c.forcedScore).toBeLessThan(0.35);
  });

  it("apelidos e prefixos acham o alfabeto; sigla de duas letras, não", () => {
    expect(first("5", "alfabeto havaiano").output).toBe("U");
    expect(first("5", "hawaiian").output).toBe("U");
    expect(first("5", "hava").output).toBe("U");
    // "he", "it", "is", "ar" são chaves plausíveis de outra cifra — não podem
    // valer como nome de alfabeto.
    expect(decode("5", "he")).toEqual([]);
    expect(decode("5", "it")).toEqual([]);
  });
});

describe("alfabeto — portão anti-ruído", () => {
  const count = (input: string, key = "") =>
    runDecoders(input, ctx(key)).results.filter((r) => r.decoderId === "alfabeto").length;

  it("não dispara em entrada típica de gincana sem alfabeto escolhido", () => {
    expect(count("89066730")).toBe(0); // CEP
    expect(count("111.444.777-35")).toBe(0); // CPF
    expect(count("47 3221 5144")).toBe(0); // telefone
    expect(count("-26.9194, -49.0661")).toBe(0); // coordenada
    expect(count("25/07/2026")).toBe(0); // data
    expect(count("U29jb3Jybw==")).toBe(0); // Base64
    expect(count("84 79 80 79")).toBe(0); // A1Z26/ASCII
    expect(count("A resposta esta na primeira letra de cada linha")).toBe(0); // prosa
  });

  it("com alfabeto escolhido, um cartão — dois só quando há duas leituras", () => {
    expect(count("5", "havaiano")).toBe(1);
    expect(count("89066730", "havaiano")).toBe(1); // painel, abaixo do corte
    // Texto grego COM o grego escolhido: transliteração + posições das letras.
    expect(count("Χαίρε", "grego")).toBe(2);
    expect(count("Χαίρε")).toBe(1);
  });
});
