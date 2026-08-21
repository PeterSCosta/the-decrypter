import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FichasData } from "@/features/ficha/types";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { PARECE_FICHA, decoders as ficha } from "./ficha-cp";

const fichas: FichasData = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/data/fichas-cp.json"), "utf8"),
);

const decode = (input: string, base: FichasData | null = fichas) =>
  ficha.decode(input, { key: "", streets: null, fichas: base } as DecodeContext);

describe("ficha da CP", () => {
  it("resolve o codinome e diz o que a entrada não dizia", () => {
    const c = decode("ZAZ")[0];
    expect(c.render).toBe("ficha-cp");
    expect(c.output).toContain("CARLOS EDUARDO HOEPERS");
    expect(c.forcedScore).toBe(0.8);
  });

  /**
   * A regra que mantém a base fora da prosa: sem ela, toda saída decifrada que
   * contivesse "diego" ganharia um card de ficha.
   */
  it("não acende dentro de uma frase", () => {
    expect(decode("diego")).toHaveLength(1);
    expect(decode("o diego escreveu essa prova")).toHaveLength(0);
  });

  it("o nome civil inteiro vale mais que o codinome — é assinatura", () => {
    const nome = decode("CRISTIANO RICARDO DA CUNHA CAPORAL")[0];
    const codinome = decode("CAPORAL")[0];
    expect(nome.forcedScore as number).toBeGreaterThan(codinome.forcedScore as number);
    expect(nome.forcedScore).toBe(0.9);
  });

  /**
   * A fobia entra EMBAIXO de propósito: `Claustrofobia` é palavra do
   * dicionário, e quem a digita quase sempre quer a palavra, não a ficha.
   */
  it("a fobia entra visível, mas abaixo do codinome", () => {
    const fobia = decode("Claustrofobia")[0];
    expect(fobia.forcedScore).toBe(0.55);
    expect(fobia.forcedScore as number).toBeGreaterThan(0.35);
    expect(fobia.forcedScore as number).toBeLessThan(decode("ADRI")[0].forcedScore as number);
  });

  it("o MCACLCAS do DIOGO acende pelo alvo", () => {
    const c = decode("MCACLCAS")[0];
    expect(c.output).toContain("DIOGO");
    expect(c.forcedScore).toBe(0.75);
  });

  it("o número de arquivo devolve as 17 e avisa que é o mesmo em todas", () => {
    const c = decode(fichas.arquivoN)[0];
    expect(c.label).toContain("arquivo");
    expect(c.output).toContain("o mesmo em todas");
    expect((c.data as { acertos: unknown[] }).acertos).toHaveLength(17);
  });

  it("encadeia o OUTRO lado do par, nunca a própria entrada", () => {
    expect(decode("ZAZ")[0].chainValue).toBe("CARLOS EDUARDO HOEPERS");
    expect(decode("CARLOS EDUARDO HOEPERS")[0].chainValue).toBe("ZAZ");
  });

  it("sem a base carregada, não inventa acerto", () => {
    expect(decode("ZAZ", null)).toHaveLength(0);
  });

  /**
   * O portão da carga e o do decoder são a MESMA constante. Se este teste
   * quebrar, a base parou de descer para alguma forma que o decoder aceita —
   * e o decoder cala sem dizer por quê.
   */
  it("o portão deixa passar tudo que o casamento sabe responder", () => {
    for (const f of fichas.fichas) {
      expect(PARECE_FICHA.test(f.codinome), f.codinome).toBe(true);
      expect(PARECE_FICHA.test(f.nomeCivil), f.nomeCivil).toBe(true);
    }
    expect(PARECE_FICHA.test(fichas.arquivoN)).toBe(true);
    expect(PARECE_FICHA.test("MCACLCAS")).toBe(true);
  });
});
