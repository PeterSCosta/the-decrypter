import { describe, expect, it } from "vitest";
import { runDecoders } from "../run";
import type { DecodeCandidate, DecodeContext } from "../types";
import { decoders } from "./timestamp";

const ctx = { key: "", streets: null, ceps: null } as DecodeContext;
const dec = Array.isArray(decoders) ? decoders[0] : decoders;
const saidas = (t: string) => dec.decode(t, ctx).map((c: DecodeCandidate) => String(c.output));

describe("timestamp Unix", () => {
  it("lê segundos e milissegundos e dá o mesmo instante", () => {
    const s = saidas("1723680000")[0];
    const ms = saidas("1723680000000")[0];
    expect(s).toContain("14/08/2024");
    expect(ms).toBe(s);
  });

  /**
   * Uma prova do Vale escreve a hora LOCAL. Mostrar só UTC faria a bancada dizer
   * 21h quando o enunciado diz 18h, e quem confere fecha a aba.
   */
  it("mostra Brasília e UTC, nessa ordem", () => {
    const r = saidas("1723680000")[0];
    expect(r.indexOf("Brasília")).toBeLessThan(r.indexOf("UTC"));
    expect(r).toContain("21:00");
    expect(r).toContain("00:00");
  });

  it("traz o dia da semana, que é o que uma prova costuma pedir", () => {
    expect(saidas("1723680000")[0]).toContain("quarta");
  });

  /**
   * A FAIXA é o portão, e é ela que produz os 99,02% de rejeição medidos. Dez
   * dígitos também são protocolo, matrícula e código truncado — o que separa é
   * cair entre 2001 e 2033.
   */
  describe("a faixa recusa o que não é data", () => {
    for (const [nome, entrada] of [
      ["CEP de 8 dígitos", "89010000"],
      ["11 dígitos", "12345678901"],
      ["zero", "0000000000"],
      ["o máximo de 32 bits (2038, fora da faixa)", "2147483647"],
      ["texto", "1723680000a"],
    ] as const) {
      it(nome, () => expect(saidas(entrada)).toHaveLength(0));
    }
  });

  /**
   * O TETO DE NOTA, que é o resto do portão. A faixa rejeita 99% mas não prova
   * nada sobre a intenção de quem digitou — então o card aparece e não lidera.
   */
  it("nunca lidera o fan-out", () => {
    const { results } = runDecoders("1723680000", ctx);
    const ts = results.find((r) => r.decoderId === "timestamp");
    expect(ts).toBeTruthy();
    expect(ts?.score).toBeLessThanOrEqual(0.5);
  });

  it("encadeia só a data, não a linha inteira", () => {
    expect(dec.decode("1723680000", ctx)[0].chainValue).toBe("14/08/2024");
  });
});
