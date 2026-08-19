import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { type EixosData, PARECE_QUADRA, normalizarQuadra, porQuadra } from "./types";

const dataFile = (name: string) => resolve(__dirname, "../../../public/data", name);
const eixos = JSON.parse(readFileSync(dataFile("eixos-blumenau.json"), "utf8")) as EixosData;

/** Fixture mínima com o MESMO cabeçalho do arquivo real. */
const falso: EixosData = {
  source: "teste",
  url: "",
  generatedAt: "2026-08-18",
  count: 3,
  aviso: "",
  colunas: eixos.colunas,
  nomes: ["RUA UM", "RUA DOIS"],
  quadras: ["3-4-10-3", "9-9-99-99"],
  bairros: ["CENTRO"],
  ceps: ["89010000"],
  //         cod nome  lat    lng    len qD qE bnD bnE bD bE cD cE
  rows: [
    [10, 0, -26.9, -49.1, 100, 0, 0, 2, 2, 0, 0, 0, 0],
    [20, 1, -26.902, -49.104, 300, 0, 1, 2, 2, 0, 0, 0, 0],
    [30, 1, -26.8, -49.2, 100, 1, 1, 2, 2, 0, 0, 0, 0],
  ],
};

describe("normalizarQuadra", () => {
  it("aceita as grafias que as pessoas realmente digitam", () => {
    for (const g of ["3-4-10-3", "3.4.10.3", "3 4 10 3", "3/4/10/3", " 03-04-10-03 "]) {
      expect(normalizarQuadra(g)).toBe("3-4-10-3");
    }
  });

  it("recusa o que não é quadra", () => {
    // três grupos (subsetor), cinco grupos (é inscrição de LOTE, outro decoder),
    // texto, e uma data mal digitada que passaria por quatro grupos.
    for (const g of ["3-4-10", "4-1-24-20-2", "abc", "12-25-2019-1", "0-4-10-3", ""]) {
      expect(normalizarQuadra(g)).toBeNull();
    }
  });
});

describe("PARECE_QUADRA (o portão que baixa 197 KB)", () => {
  it("deixa passar as grafias de quadra", () => {
    for (const g of ["3-4-10-3", "3.4.10.3", "3 4 10 3", " 4-1-24-20 "]) {
      expect(PARECE_QUADRA.test(g)).toBe(true);
    }
  });

  it("não baixa a base para um IP nem para inscrição de lote", () => {
    // O caso que motivou compartilhar a regra: quatro grupos, mas 192 nunca é
    // distrito. Baixava 197 KB e não mostrava card nenhum.
    for (const g of ["192.168.0.1", "10.0.0.1", "4-1-24-20-2", "3-4-10", "0-1-2-3"]) {
      expect(PARECE_QUADRA.test(g)).toBe(false);
    }
  });

  it("concorda com o parser: o que passa no portão e existe, vira quadra", () => {
    // Um portão mais frouxo que o parser desperdiça download; mais apertado,
    // esconde resposta. Estes dois têm de contar a mesma história.
    for (const g of ["3-4-10-3", "192.168.0.1", "4-1-24-20-2"]) {
      if (normalizarQuadra(g)) expect(PARECE_QUADRA.test(g)).toBe(true);
    }
  });
});

describe("porQuadra (fixture)", () => {
  it("junta os trechos dos dois lados e nomeia o lado certo", () => {
    const q = porQuadra(falso, "3.4.10.3");
    expect(q).not.toBeNull();
    expect(q?.quadra).toBe("3-4-10-3");
    expect(q?.trechos.map((t) => t.lado)).toEqual(["ambos", "direito"]);
    expect(q?.ruas).toEqual(["RUA DOIS", "RUA UM"]);
  });

  it("pondera o centro pelo comprimento do trecho", () => {
    const q = porQuadra(falso, "3-4-10-3");
    // 100 m em -26.9 e 300 m em -26.902 → o centro pende para o trecho longo.
    expect(q?.lat).toBeCloseTo(-26.9015, 4);
  });

  it("devolve null para quadra ausente ou base não carregada", () => {
    expect(porQuadra(falso, "5-5-55-55")).toBeNull();
    expect(porQuadra(null, "3-4-10-3")).toBeNull();
  });
});

/**
 * Guardas sobre o arquivo REAL. É aqui que uma regeração torta aparece: um
 * `outSR` errado joga tudo no oceano Índico e nenhum teste de fixture veria.
 */
describe("eixos-blumenau.json (base real)", () => {
  it("tem o cabeçalho que os leitores esperam", () => {
    for (const c of ["codLog", "nome", "lat", "lng", "comprimentoM", "quadraDir", "quadraEsq"]) {
      expect(eixos.colunas).toContain(c);
    }
    expect(eixos.rows.length).toBe(eixos.count);
    expect(eixos.rows.length).toBeGreaterThan(9000);
  });

  it("põe todo trecho dentro da caixa de Blumenau", () => {
    const lat = eixos.colunas.indexOf("lat");
    const lng = eixos.colunas.indexOf("lng");
    const fora = eixos.rows.filter(
      (r) => !(r[lat] > -27.1 && r[lat] < -26.6 && r[lng] > -49.35 && r[lng] < -48.9),
    );
    expect(fora).toHaveLength(0);
  });

  it("acha uma quadra verídica com as ruas que a cercam", () => {
    const q = porQuadra(eixos, "3-4-10-3");
    expect(q).not.toBeNull();
    expect(q?.ruas.length).toBeGreaterThan(0);
    expect(q?.lat).toBeLessThan(-26.6);
    expect(q?.trechos.length).toBeGreaterThan(0);
  });
});
