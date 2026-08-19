import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANCHORS,
  BLUMENAU,
  ITAJAI,
  VALE_BBOX,
  anchorForPoint,
  inBBox,
  scopeLabel,
} from "./anchors";
import { decodeGeohashLocal, decodePlusCode, decodePlusCodeLocal } from "./formats";

describe("âncoras locais", () => {
  it("o centro de cada cidade cai na própria caixa e no Vale, e não na caixa da outra", () => {
    expect(inBBox(BLUMENAU, BLUMENAU.bbox)).toBe(true);
    expect(inBBox(ITAJAI, ITAJAI.bbox)).toBe(true);
    expect(inBBox(BLUMENAU, VALE_BBOX)).toBe(true);
    expect(inBBox(ITAJAI, VALE_BBOX)).toBe(true);
    // caixas justas não se sobrepõem (discriminam as cidades)
    expect(inBBox(BLUMENAU, ITAJAI.bbox)).toBe(false);
    expect(inBBox(ITAJAI, BLUMENAU.bbox)).toBe(false);
  });

  it("o Plus Code de exemplo de cada cidade decodifica dentro da própria caixa", () => {
    for (const a of ANCHORS) {
      const pt = decodePlusCode(a.plusExample);
      expect(pt, `${a.name}: ${a.plusExample}`).not.toBeNull();
      expect(inBBox(pt!, a.bbox), `${a.name} dentro da caixa`).toBe(true);
    }
  });

  it("anchorForPoint / scopeLabel identificam a cidade", () => {
    expect(anchorForPoint(BLUMENAU)?.name).toBe("Blumenau");
    expect(anchorForPoint(ITAJAI)?.name).toBe("Itajaí");
    expect(anchorForPoint({ lat: 0, lng: 0 })).toBeNull();
    expect(scopeLabel(BLUMENAU)).toBe("Blumenau");
    // No vão ENTRE as caixas → "Vale do Itajaí", não cidade específica.
    //
    // O vão mudou de lugar quando as caixas foram corrigidas para conter os
    // municípios de verdade: Itajaí passou a ir até −48,877 (para alcançar
    // Laranjeiras) e Blumenau começa em −48,95. O ponto antigo do teste,
    // −48,87, HOJE É ITAJAÍ — e é assim que tem de ser.
    expect(scopeLabel({ lat: -26.9, lng: -48.91 })).toBe("Vale do Itajaí");
    expect(scopeLabel({ lat: -26.9, lng: -48.87 })).toBe("Itajaí");
  });
});

describe("atalhos de cauda local", () => {
  it("Plus Code curto recupera a cidade pelo prefixo (585G Blumenau / 585H Itajaí)", () => {
    const blu = decodePlusCodeLocal("3WJM+6H");
    expect(blu?.anchor).toBe("Blumenau");
    expect(blu && inBBox(blu, BLUMENAU.bbox)).toBe(true);

    const ita = decodePlusCodeLocal("38RQ+V7");
    expect(ita?.anchor).toBe("Itajaí");
    expect(ita && inBBox(ita, ITAJAI.bbox)).toBe(true);
  });

  it("Plus Code já completo (8 antes do +) não é tratado como cauda local", () => {
    expect(decodePlusCodeLocal("585G3WJM+6H")).toBeNull();
  });

  it("cauda de Geohash recupera a cidade pelo prefixo regional", () => {
    // "6gjng7rpj" é Blumenau; a cauda "g7rpj" + prefixo "6gjn" deve voltar p/ lá
    const hit = decodeGeohashLocal("g7rpj");
    expect(hit?.anchor).toBe("Blumenau");
    expect(hit && inBBox(hit, BLUMENAU.bbox)).toBe(true);
  });
});

/**
 * A caixa da âncora tem de conter o município — conferido contra o dado, não
 * contra a memória de quem escreveu o número.
 *
 * ── O QUE ISTO PRENDE ───────────────────────────────────────────────────────
 * A `bbox` é o VALIDADOR do atalho de cauda: código parcial só vira ponto se o
 * ponto reconstruído cair dentro. Quando ela é curta demais, o efeito não é
 * "não sei" — é a resposta ERRADA, porque sobra o Geohash global frouxo no fim
 * da cascata.
 *
 * Foi o que aconteceu com o Plus Code gabaritado da madrugada de 2024,
 * `25JR+P8` (Laranjeiras, Itajaí): a caixa parava 8 km a leste do bairro, os
 * dois ramos devolviam null, e a bancada respondia ANTÁRTIDA.
 *
 * Este teste refaz a medição a cada execução. Se o dado embarcado crescer para
 * fora da caixa — um bairro novo no cadastro, um CEP novo —, ele reprova aqui,
 * e não numa prova de madrugada.
 */
describe("a caixa contém o município", () => {
  const dentroDeMargem = (v: number, min: number, max: number) => v >= min && v <= max;

  it("os 84.539 lotes de Blumenau cabem na caixa de Blumenau", async () => {
    const lotes = JSON.parse(
      readFileSync(resolve(__dirname, "../../../seed-data/lotes-blumenau.json"), "utf8"),
    ) as { rows: (string | number | null)[][] };

    const fora = lotes.rows.filter((r) => {
      const [lat, lng] = [r[6], r[7]];
      if (typeof lat !== "number" || typeof lng !== "number") return false;
      return !inBBox({ lat, lng }, BLUMENAU.bbox);
    });
    expect(fora.length, `${fora.length} lotes fora da caixa de Blumenau`).toBe(0);
  });

  it("o código gabaritado de 2024 resolve — era o teste que faltava", () => {
    // `PLANO-2026-08.md` previa estes códigos como "os casos de regressão que
    // faltam para provar que o F2 funcionou". Antes desta caixa, reprovavam.
    const laranjeiras = { lat: -26.968187, lng: -48.809188 };
    expect(inBBox(laranjeiras, ITAJAI.bbox), "25JR+P8 caiu fora de Itajaí").toBe(true);

    const blumenauCentro = { lat: -26.9194, lng: -49.0661 };
    expect(inBBox(blumenauCentro, BLUMENAU.bbox)).toBe(true);
  });

  it("as duas caixas continuam sem se tocar — senão o atalho não sabe qual cidade", () => {
    const separadas =
      BLUMENAU.bbox.lonMax <= ITAJAI.bbox.lonMin || ITAJAI.bbox.lonMax <= BLUMENAU.bbox.lonMin;
    expect(separadas, "as caixas se sobrepõem: a atribuição de cidade vira sorteio").toBe(true);
    expect(dentroDeMargem(BLUMENAU.lat, BLUMENAU.bbox.latMin, BLUMENAU.bbox.latMax)).toBe(true);
    expect(dentroDeMargem(ITAJAI.lat, ITAJAI.bbox.latMin, ITAJAI.bbox.latMax)).toBe(true);
  });
});
