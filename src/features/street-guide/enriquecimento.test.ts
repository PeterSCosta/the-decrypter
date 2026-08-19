import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { StreetsData } from "./types";

const dataFile = (name: string) => resolve(__dirname, "../../../public/data", name);
const streets = JSON.parse(readFileSync(dataFile("streets.json"), "utf8")) as StreetsData;

/**
 * O Rol de Ruas veio de um PDF sem coordenada e foi geocodificado duas vezes:
 * por NOME contra a base de CEP, e depois por CÓDIGO contra os eixos do
 * geoportal (`scripts/enrich-streets-eixos.ts`). Estes testes guardam o
 * resultado do segundo passo — e principalmente guardam contra rodar
 * `build:streets-geo` DEPOIS do enriquecimento, que zera lat/lng de quem só
 * casou por código e faria a cobertura desabar sem ninguém notar.
 */
describe("streets.json · cobertura geográfica", () => {
  const comCoord = streets.rows.filter((r) => r.lat != null && r.lng != null);

  it("mantém ao menos 95% dos trechos com coordenada", () => {
    // Medido em 18/08/2026: 4.286 de 4.426 (96,8%). Antes dos eixos eram 71,8%.
    expect(comCoord.length / streets.rows.length).toBeGreaterThan(0.95);
  });

  it("põe toda coordenada dentro da caixa de Blumenau", () => {
    const fora = comCoord.filter(
      (r) =>
        !(
          (r.lat as number) > -27.1 &&
          (r.lat as number) < -26.6 &&
          (r.lng as number) > -49.35 &&
          (r.lng as number) < -48.9
        ),
    );
    expect(fora).toHaveLength(0);
  });

  it("marca a procedência de quem veio dos eixos, e só de quem tem ponto", () => {
    const marcadas = streets.rows.filter((r) => r.fonteGeo);
    expect(marcadas.length).toBeGreaterThan(1000);
    for (const r of marcadas) {
      expect(r.lat).toBeTypeOf("number");
      expect(r.fonteGeo).toMatch(/^eixos:codigo(\+bairro)?$/);
    }
  });

  it("guarda o nome divergente do geoportal ao lado, sem apagar o do Rol", () => {
    const divergentes = streets.rows.filter((r) => r.nomeEixos);
    expect(divergentes.length).toBeGreaterThan(0);
    for (const r of divergentes) {
      expect(r.nome).toBeTruthy();
      expect(r.nomeEixos).not.toBe(r.nome);
    }
    // Caso verídico: o PDF do Rol perdeu o "N" e o geoportal tem o nome inteiro.
    const lenz = streets.rows.find((r) => r.codigo === 4332);
    expect(lenz?.nome).toBe("ANNA CATHARINA LEZ");
    expect(lenz?.nomeEixos).toBe("ANNA CATHARINA LENZ");
  });
});
