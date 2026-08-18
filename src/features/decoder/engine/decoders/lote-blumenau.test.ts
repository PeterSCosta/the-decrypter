import type { LoteBlumenau } from "@/lib/lookup-cache";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as lote } from "./lote-blumenau";

/** O lote da foto do geoportal: `4-1-24-16-28`, 7 de Setembro, Centro. */
const SETE_DE_SETEMBRO: LoteBlumenau = {
  inscricao: "412400160028000",
  iq: "4-1-24-16-28",
  logradouro: "7 DE SETEMBRO",
  numero: "00",
  bairro: "CENTRO",
  cep: "89010200",
  lat: -26.917475,
  lng: -49.070025,
  areaM2: 4580,
};

/** As duas leituras REAIS de `41101634` — as duas existem no cadastro. */
const A: LoteBlumenau = { ...SETE_DE_SETEMBRO, iq: "4-1-10-16-34", logradouro: "RUA A" };
const B: LoteBlumenau = { ...SETE_DE_SETEMBRO, iq: "4-1-10-1-634", logradouro: "RUA B" };

const decode = (input: string, hits: Partial<DecodeContext["hits"]>) =>
  lote.decode(input, {
    key: "",
    streets: null,
    hits: { q: input.trim(), ...hits },
  } as DecodeContext);

describe("inscrição imobiliária de Blumenau", () => {
  it("o número colado da tela do geoportal acha o lote", () => {
    // O caso da foto: a tela mostra `4-1-24-16-28` e quem copia digita isto.
    const c = decode("41241628", { lote: SETE_DE_SETEMBRO })[0];
    expect(c.render).toBe("map");
    expect(c.output).toContain("7 DE SETEMBRO");
    expect(c.chainValue).toBe("-26.917475, -49.070025");
  });

  it("o número 00 não vira endereço", () => {
    // `numero: "00"` é "sem número" no cadastro; imprimir "7 DE SETEMBRO, 00"
    // seria inventar um endereço que não existe.
    expect(decode("41241628", { lote: SETE_DE_SETEMBRO })[0].output).not.toContain(", 00");
  });

  it("a nota segue a grafia, não o acerto", () => {
    // Os três resolvem contra a MESMA linha. O que muda é quanta evidência a
    // grafia carrega — e é isso que a nota tem de refletir.
    const pontuado = decode("4.1.24.16.28.0", { lote: SETE_DE_SETEMBRO })[0].forcedScore as number;
    const quinze = decode("412400160028000", { lote: SETE_DE_SETEMBRO })[0].forcedScore as number;
    const colado = decode("41241628", { lote: SETE_DE_SETEMBRO })[0].forcedScore as number;
    expect(pontuado).toBeGreaterThan(quinze);
    expect(quinze).toBeGreaterThan(colado);
  });

  it("sete dígitos ficam ABAIXO do card de município", () => {
    // MEDIDO: 81 números do cadastro são geocódigo do IBGE de verdade. O card
    // de município vale 0,95, e um lote não pode passar na frente dele — seria
    // o ranking mentindo por cima de uma resposta certa.
    const c = decode("4211603", { lote: SETE_DE_SETEMBRO })[0].forcedScore as number;
    expect(c).toBeLessThan(0.95);
  });

  it("quanto mais curto, menos vale — porque discrimina menos", () => {
    const oito = decode("41241628", { lote: SETE_DE_SETEMBRO })[0].forcedScore as number;
    const seis = decode("411634", { lote: SETE_DE_SETEMBRO })[0].forcedScore as number;
    expect(seis).toBeLessThan(oito);
  });

  it("o número ambíguo mostra as leituras em vez de escolher uma", () => {
    const cards = decode("41101634", { lotes: [A, B] });
    expect(cards).toHaveLength(2);
    // A grafia entra na saída: sem ela, dois lotes sem número na mesma rua
    // colidiriam na deduplicação por texto exato do motor.
    expect(cards[0].output).toContain("4-1-10-16-34");
    expect(cards[1].output).toContain("4-1-10-1-634");
    expect(cards[0].data).toMatchObject({ detail: expect.stringContaining("hífen desempata") });
  });

  it("meia resposta pontua menos que uma inteira", () => {
    const um = decode("41101634", { lote: A })[0].forcedScore as number;
    const dois = decode("41101634", { lotes: [A, B] })[0].forcedScore as number;
    expect(dois).toBeLessThan(um);
  });

  it("lote sem coordenada não vira card de mapa", () => {
    // 13 linhas da camada vêm sem geometria; um card de mapa sem ponto seria
    // um mapa no meio do oceano.
    expect(decode("41241628", { lote: { ...SETE_DE_SETEMBRO, lat: null, lng: null } })).toEqual([]);
  });

  it("acerto de outra tecla não vale", () => {
    expect(
      lote.decode("41241628", {
        key: "",
        streets: null,
        hits: { q: "4124162", lote: SETE_DE_SETEMBRO },
      } as DecodeContext),
    ).toEqual([]);
  });
});
