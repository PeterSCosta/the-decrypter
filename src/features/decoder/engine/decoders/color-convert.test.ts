import {
  NAMED_COLORS,
  hslToRgb,
  nearestNamedColor,
  rgbToHex,
  rgbToHsl,
} from "@/features/reference/named-colors";
import type { CodeHit } from "@/features/reference/phone-codes";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as color } from "./color-convert";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => color.decode(input, ctx);
const out = (input: string) => decode(input)[0]?.output;
const hits = (input: string) => decode(input)[0]?.data as CodeHit[];

describe("cores — âncoras do acervo", () => {
  // ITC22 P3 Et.2 "Desenhos Animados": cada quadrante dá um canal, a mistura
  // é consultada na Lista de cores da Wikipédia (a resolução linka a página
  // em PORTUGUÊS) e as iniciais formam o objeto a entregar.
  // acervo/itc-2022/_caderno/texto/resolucao.md:38-53
  it("as 6 misturas RGB de 2022 dão BANANA", () => {
    const mistura = [
      "245 - 245 - 220",
      "244 - 196 - 48",
      "0 - 0 - 128",
      "0 - 0 - 255",
      "255 - 250 - 250",
      "153 - 102 - 204",
    ].join("\n");
    const [c] = decode(mistura);
    expect(c.output).toBe("Bege · Açafrão · Naval · Azul · Neve · Ametista");
    expect(c.notes).toBe("iniciais: BANANA");
    expect(c.label).toBe("triplas RGB");
    // Todas as seis são hex exato da lista — nada de "(aprox.)".
    expect(c.forcedScore).toBe(0.85);
    expect(
      hits(mistura)
        .map((h) => h.code)
        .join(""),
    ).toBe("BANANA");
  });

  // ITC19 P4 "Caverna do Dragão", etapa final: os três cristais dão
  // 255/165/0 na escala RGB — "uma laranja abrirá o portal".
  // acervo/itc-2019/p04-caverna-do-dragao/texto/resolucao.md:61-67
  it("rgb(255,165,0) é Laranja", () => {
    expect(out("rgb(255,165,0)")).toBe("Laranja");
    expect(hits("rgb(255,165,0)")[0].detail).toBe(
      "#FFA500 · rgb(255, 165, 0) · hsl(39, 100%, 50%)",
    );
  });

  // ITC23 P11 "Piloto do Século": a tabela da prova dá matiz (concurso da
  // Mega), saturação e luminosidade. Foi a única prova de cor com
  // cumprimento 0/4 — ninguém tinha como converter na hora.
  // acervo/itc-2023/p11-piloto-do-seculo/texto/resolucao.md
  it("hsl(120,100%,25%) fecha em Verde", () => {
    expect(out("hsl(120, 100%, 25%)")).toBe("Verde");
    expect(hits("hsl(120, 100%, 25%)")[0].detail).toBe(
      "#008000 · rgb(0, 128, 0) · hsl(120, 100%, 25%)",
    );
  });

  // ITC23 P19 Et.4 "Desafio dos Xallengianos": cada foto traz um código da
  // Encycolorpedia que identifica a equipe dona.
  // acervo/RESOLUCOES.md:476
  it("os 4 hexes dos Xallengianos", () => {
    const [c] = decode("#993399 #000000 #00ff00 #add8e6");
    // DIVERGÊNCIA de nomenclatura: o gabarito chama #00ff00 de "verde"
    // (nome da Encycolorpedia); na lista pt esse hex é Verde espectro/Lima e
    // "Verde" é o #008000. O hex, que é o que a prova entrega, casa exato.
    expect(c.output).toBe("Roxo · Preto · Verde espectro · Azul claro");
    expect(c.label).toBe("hex");
  });
});

describe("cores — o gate", () => {
  it("três números soltos não são cor", () => {
    expect(decode("245 245 220")).toEqual([]);
    expect(decode("255 165 0")).toEqual([]);
  });

  it("uma tripla sozinha não basta — só lista ou sintaxe explícita", () => {
    expect(decode("244-196-48")).toEqual([]);
    expect(out("rgb(244, 196, 48)")).toBe("Açafrão");
  });

  it("não engole data, telefone nem texto com números", () => {
    expect(decode("12-05-2024 31-12-2023")).toEqual([]);
    expect(decode("a equipe 3-1-2 venceu, a 4-5-6 perdeu")).toEqual([]);
    expect(decode("47 3221-5144")).toEqual([]);
  });

  // Regressão: `TRIPLE_RE` fatia QUALQUER lista de números de três em três, e
  // uma lista de comprimento múltiplo de 3 passava inteira por aqui — inclusive
  // os códigos Faber-Castell da GIA-39, cujo cartão certo (0.55) ficava ATRÁS
  // do cartão de cor (0.6) na própria âncora dele.
  it("lista rasa de números não é lista de triplas", () => {
    // GIA-39 "Desenhar e colorir": 12 códigos de lápis, não 4 cores.
    expect(decode("015, 076, 038, 091, 037, 005, 010, 071, 083, 082, 696, 081")).toEqual([]);
    // A1Z26 e ASCII com comprimento múltiplo de 3.
    expect(decode("22, 5, 14, 3, 5, 4")).toEqual([]);
    expect(decode("84, 79, 80, 79, 65, 66")).toEqual([]);
    expect(decode("8, 15, 12, 1, 22, 5, 14, 3, 5")).toEqual([]);
    // O que define a lista de triplas é o separador de DOIS níveis.
    expect(out("245-245-220, 0-0-128")).toBe("Bege · Naval");
    expect(out("245,245,220\n0,0,128")).toBe("Bege · Naval");
  });

  it("componente acima de 255 não é cor", () => {
    expect(decode("300-10-20 40-50-60")).toEqual([]);
    expect(decode("rgb(300, 10, 20)")).toEqual([]);
  });

  it("aceita hex de 3 dígitos e mistura de sintaxes", () => {
    expect(out("#fff")).toBe("Branco");
    const [c] = decode("#000080 e rgb(0,0,255)");
    expect(c.output).toBe("Naval · Azul");
    expect(c.label).toBe("hex + rgb()");
  });
});

describe("cores — a matemática", () => {
  it("aproxima e diz o quanto errou", () => {
    const [c] = decode("#f5f5dd");
    // O `output` guarda o nome limpo (é o que encadeia); o "(aprox.)" e o ΔE
    // moram no card, onde o usuário decide se aceita o palpite.
    expect(c.output).toBe("Bege");
    expect(c.chainValue).toBe("Bege");
    expect((c.data as CodeHit[])[0].name).toBe("Bege (aprox.)");
    expect((c.data as CodeHit[])[0].detail).toBe(
      "#F5F5DD · rgb(245, 245, 221) · hsl(60, 55%, 91%) · ΔE 0,5",
    );
    expect(c.forcedScore).toBe(0.6);
  });

  // O item pede CIELab justamente por isto: em RGB a distância euclidiana
  // responde "Quantum" (#111111, ou seja, preto) para um verde-azulado
  // escuro. Em Lab, o vizinho é o cinza-ardósia escuro (#2F4F4F).
  it("ΔE em CIELab, não euclidiana em RGB", () => {
    const alvo: [number, number, number] = [5, 56, 44];
    const porRgb = NAMED_COLORS.reduce((best, c) => {
      const d = (x: (typeof c)["rgb"]) =>
        (x[0] - alvo[0]) ** 2 + (x[1] - alvo[1]) ** 2 + (x[2] - alvo[2]) ** 2;
      return d(c.rgb) < d(best.rgb) ? c : best;
    });
    expect(porRgb.name).toBe("Quantum");
    expect(nearestNamedColor(alvo).color.name).toBe("Cinza ardósia escuro");
    expect(out("rgb(5,56,44)")).toBe("Cinza ardósia escuro");
  });

  it("hex ↔ RGB ↔ HSL fecham o círculo em toda a lista", () => {
    for (const c of NAMED_COLORS) {
      expect(rgbToHex(c.rgb)).toBe(`#${c.hex}`);
      // O HSL exibido é arredondado para inteiro (é o que se digita num
      // seletor de cor), então a volta erra no máximo 3 por canal.
      const volta = hslToRgb(rgbToHsl(c.rgb));
      for (let i = 0; i < 3; i++) expect(Math.abs(volta[i] - c.rgb[i])).toBeLessThanOrEqual(3);
    }
    // Onde a prova mora, a volta é exata.
    expect(hslToRgb([120, 100, 25])).toEqual([0, 128, 0]);
    expect(rgbToHsl([0, 128, 0])).toEqual([120, 100, 25]);
  });

  it("a lista tem as 255 entradas e os sinônimos do mesmo hex", () => {
    expect(NAMED_COLORS).toHaveLength(255);
    const vermelho = nearestNamedColor([255, 0, 0]);
    expect(vermelho.color.name).toBe("Vermelho");
    expect(vermelho.aliases).toEqual(["Encarnado", "Rubro"]);
    expect(decode("#ff0000")[0].notes).toBe("também: Encarnado · Rubro");
  });
});
