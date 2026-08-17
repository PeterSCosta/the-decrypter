import type { BridgeRow, BridgesData } from "@/features/bridge/types";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as bridge } from "./bridge";

const vazia: Partial<BridgeRow> = {
  nomeOsm: null,
  apelidos: [],
  fonte: "lei+osm",
  lei: null,
  numLei: null,
  anoLei: null,
  dataLei: null,
  ementa: null,
  textoLei: null,
  urlLei: null,
  cursoDaguaLei: null,
  bairrosLei: [],
  ruasLei: [],
  situacao: null,
  nota: null,
  lat: null,
  lng: null,
  comprimento: null,
  extremos: null,
  via: null,
  classeVia: null,
  material: null,
  camada: null,
  pistas: null,
  maoUnica: false,
  osmIds: [],
  transpoe: [],
  bairros: [],
};

const ponte = (p: Partial<BridgeRow>): BridgeRow =>
  ({ ...vazia, tipo: "ponte", ...p }) as BridgeRow;

const KERN = ponte({
  nome: "Passarela Rodolpho Kern",
  tipo: "passarela",
  lei: "5432/2000",
  lat: -26.9195,
  lng: -49.0661,
  transpoe: ["Ribeirão da Velha"],
});
const FERRO = ponte({
  nome: "Ponte Aldo Pereira de Andrade",
  apelidos: ["Ponte de Ferro"],
  lat: -26.9202,
  lng: -49.0653,
});
/** Denominada por lei, sem geometria no OSM — metade da base é assim. */
const SO_LEI = ponte({ nome: "Ponte Governador Celso Ramos", lei: "8492/2017" });

const base: BridgesData = {
  source: "teste",
  generatedAt: "2026-08",
  count: 3,
  rows: [KERN, FERRO, SO_LEI],
};

const decode = (input: string, bridges: BridgesData | null = base) =>
  bridge[0].decode(input, { key: "", streets: null, bridges } as DecodeContext);

describe("ponte / passarela", () => {
  it("nome inteiro → a estrutura, com a lei", () => {
    const c = decode("Passarela Rodolpho Kern")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("ponte");
    expect(c.output).toContain("Rodolpho Kern");
    expect(c.output).toContain("Ribeirão da Velha");
    expect(c.label).toBe("Lei 5432/2000");
    expect(c.forcedScore).toBe(0.95);
  });

  it("apelido também casa", () => {
    const c = decode("ponte de ferro")[0];
    expect(c).toBeDefined();
    expect((c.data as BridgeRow).nome).toBe("Ponte Aldo Pereira de Andrade");
  });

  it("acento e caixa não importam", () => {
    expect(decode("PASSARELA RODOLPHO KERN")[0]).toBeDefined();
    expect(decode("ponte governador celso ramos")[0]).toBeDefined();
  });

  it("sem geometria ainda responde — a lei é a resposta", () => {
    const c = decode("Ponte Governador Celso Ramos")[0];
    expect(c).toBeDefined();
    // ...mas não promete um ponto que não existe.
    expect(c.chainValue).toBeUndefined();
  });

  it("com geometria, encadeia como coordenada", () => {
    expect(decode("Passarela Rodolpho Kern")[0].chainValue).toBe("-26.9195, -49.0661");
  });

  it("sem a palavra 'ponte' não dispara — é o que impede o ruído", () => {
    // "Kern" sozinho é sobrenome e nome de rua; a base não pode chutar nisso.
    expect(decode("Rodolpho Kern")).toEqual([]);
  });

  it("'ponte' sozinha casa por conteúdo, e a confiança cai", () => {
    const c = decode("ponte")[0];
    // 5 letras: casa com quase tudo, então não pode competir com o card de rua.
    expect(c?.forcedScore ?? 0).toBeLessThan(0.7);
  });

  it("base ainda não carregada não emite nada", () => {
    expect(decode("Passarela Rodolpho Kern", null)).toEqual([]);
  });
});
