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
    // no vão entre as caixas das duas cidades → Vale, não cidade específica
    expect(scopeLabel({ lat: -26.9, lng: -48.87 })).toBe("Vale do Itajaí");
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
