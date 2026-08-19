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

/**
 * O MESMO lote depois do `pnpm build:enderecos`. MEDIDO na tabela de endereços
 * do geoportal (`GEO.CONSULTA_ENDERECO`): `4-1-24-16-28` → `7 DE SETEMBRO,
 * 1560`. A camada de lotes dizia "00"; o número existe, só morava noutra mesa.
 */
const COM_NUMERO: LoteBlumenau = { ...SETE_DE_SETEMBRO, numero: "1560" };

/**
 * Esquina REAL, copiada da linha que o `build:enderecos` gerou: o lote
 * `4-1-24-25-8` responde por dois endereços em ruas DIFERENTES — CHILE, 25 e
 * URUGUAY, 100. São 1.133 lotes assim — e eles são SUBCONJUNTO dos 7.901 com
 * mais de uma porta, não uma parcela à parte.
 */
const ESQUINA: LoteBlumenau = {
  inscricao: "412400250008000",
  iq: "4-1-24-25-8",
  logradouro: "URUGUAY",
  numero: "100",
  bairro: "PONTA AGUDA",
  cep: "89050060",
  lat: -26.918151,
  lng: -49.06339,
  areaM2: 707,
  enderecos: "CHILE, 25;URUGUAY, 100",
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

  it("o lote que ganhou número mostra o número", () => {
    // 89,5% dos lotes vinham sem número de porta; este é um dos 66 mil que a
    // tabela de endereços preencheu.
    const c = decode("41241628", { lote: COM_NUMERO })[0];
    expect(c.output).toContain("7 DE SETEMBRO, 1560");
    expect(c.data).toMatchObject({ label: "7 DE SETEMBRO, 1560" });
  });

  it("o lote de esquina mostra os DOIS endereços, não escolhe um", () => {
    // Escolher um apagaria justamente a resposta de "a casa da esquina da X com
    // a Y" — que é o que uma prova pergunta.
    const c = decode("41242508", { lote: ESQUINA })[0];
    expect(c.output).toContain("CHILE, 25");
    expect(c.output).toContain("URUGUAY, 100");
    expect(c.data).toMatchObject({ detail: expect.stringContaining("esquina") });
  });

  it("o conjunto SUBSTITUI o par logradouro+numero, não se soma a ele", () => {
    // `enderecos` já traz o endereço principal dentro; imprimir os dois
    // repetiria "CHILE, 25" no mesmo card.
    const out = decode("41242508", { lote: ESQUINA })[0].output;
    expect(out.match(/URUGUAY, 100/g)).toHaveLength(1);
  });

  it("os outros zeros disfarçados também somem", () => {
    // O cadastro escreve o vazio como "00", mas também como "000" e "0000" —
    // 1.553 lotes medidos. Nenhum deles é número de porta.
    for (const n of ["000", "0000", "0"]) {
      const c = decode("41241628", { lote: { ...SETE_DE_SETEMBRO, numero: n } })[0];
      expect(c.output).not.toContain(`, ${n}`);
    }
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
