import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as resistor } from "./resistor";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => resistor.decode(input, ctx);
const out = (input: string) => decode(input)[0]?.output;
const encode = (input: string) => resistor.encode?.(input, ctx) ?? null;

describe("código de cores de resistor", () => {
  // Âncora do acervo: ITC25-P14 "Vive La Resistance" — a resolução existe
  // (acervo/itc-2025/p14-vive-la-resistance/texto/resolucao.md + a captura da
  // calculadora DigiKey em imagens/02), ao contrário do que diz o plano. As 6
  // cores do enunciado dão 742 MΩ ±0,5% 50 ppm, e a prova encadeia só o 742
  // (→ GDB, o nome da loja).
  it("lê as 6 faixas da ITC25-P14 (742 MΩ)", () => {
    const [valor, digitos] = decode("violeta amarelo vermelho azul verde vermelho");
    expect(valor.output).toBe("742000000 Ω ±0,5% · 50 ppm/K");
    expect(valor.label).toBe("6 faixas");
    expect(valor.notes).toContain("742 MΩ");
    expect(valor.notes).toContain("azul ×10⁶");
    expect(digitos.output).toBe("742");
    expect(digitos.chainValue).toBe("742");
  });

  // Canônicas (não do acervo): as duas leituras clássicas de bancada.
  it("lê 4 faixas — canônico", () => {
    expect(out("marrom preto vermelho ouro")).toBe("1000 Ω ±5%");
    expect(decode("marrom preto vermelho ouro")[0].notes).toContain("1 kΩ");
  });

  it("lê 5 faixas — canônico, onde a leitura de 4 erraria a ordem de grandeza", () => {
    expect(out("vermelho vermelho preto marrom marrom")).toBe("2200 Ω ±1%");
  });

  it("3 faixas = ±20% implícito, e ouro como multiplicador", () => {
    expect(out("marrom preto ouro")).toBe("1 Ω ±20%");
    expect(out("vermelho vermelho marrom")).toBe("220 Ω ±20%");
  });

  it("aceita nomes em inglês, caixa alta e vírgula como separador", () => {
    expect(out("brown black red gold")).toBe("1000 Ω ±5%");
    expect(out("VIOLETA, Amarelo, Vermelho, Azul, Verde, Vermelho")).toBe(
      "742000000 Ω ±0,5% · 50 ppm/K",
    );
  });

  describe("direção da leitura", () => {
    it("ouro na frente é impossível: inverte", () => {
      const [c] = decode("ouro vermelho preto marrom");
      expect(c.output).toBe("1000 Ω ±5%");
      expect(c.label).toContain("leitura invertida");
      expect(c.forcedScore).toBe(0.6);
      expect(c.notes).toContain("só existe como tolerância");
    });

    it("faixa preta na frente é impossível: inverte", () => {
      const [c] = decode("preto vermelho marrom");
      expect(c.output).toBe("12 Ω ±20%");
      expect(c.notes).toContain("zero à esquerda");
    });

    it("sem ouro/prata na ponta, oferece as duas direções — a direta primeiro", () => {
      const cands = decode("vermelho vermelho preto marrom marrom");
      const invertida = cands.find((c) => c.label?.includes("invertida"));
      expect(invertida?.output).toBe("11000 Ω ±2%");
      expect(invertida?.forcedScore).toBeLessThan(cands[0].forcedScore as number);
    });

    it("recusa a sequência que não é resistor em nenhuma direção", () => {
      // Preto encerrando não é tolerância; preto abrindo é zero à esquerda.
      expect(decode("preto vermelho vermelho amarelo")).toEqual([]);
    });
  });

  describe("portão", () => {
    it("exige de 3 a 6 tokens, todos cor do código", () => {
      expect(decode("marrom preto")).toEqual([]);
      expect(decode("marrom preto vermelho ouro verde azul violeta")).toEqual([]);
      expect(decode("azul verde caneta")).toEqual([]);
      expect(decode("o cavalo azul")).toEqual([]);
    });

    it("não aceita abreviação de uma letra (V é violeta, vermelho e verde)", () => {
      expect(decode("m p v o")).toEqual([]);
    });
  });

  describe("encode", () => {
    it("4700 → amarelo violeta vermelho ouro", () => {
      expect(encode("4700")).toBe("amarelo violeta vermelho ouro");
      expect(encode("4,7k")).toBe("amarelo violeta vermelho ouro");
      expect(encode("4.7 kΩ")).toBe("amarelo violeta vermelho ouro");
    });

    it("três dígitos significativos viram 5 faixas", () => {
      expect(encode("1000")).toBe("marrom preto vermelho ouro");
      expect(encode("742M")).toBe("violeta amarelo vermelho azul marrom");
    });

    it("volta pelo decode (ida e volta)", () => {
      expect(out(encode("4700") as string)).toBe("4700 Ω ±5%");
    });

    it("recusa o que não é valor de resistência", () => {
      expect(encode("abc")).toBeNull();
      expect(encode("12345")).toBeNull();
      expect(encode("0")).toBeNull();
    });
  });
});
