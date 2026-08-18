import { decodeMaidenhead, decodeQuadkey, detectLocation } from "@/features/location/formats";
import { describe, expect, it } from "vitest";
import { GRUPOS_GEO } from "./formatos";

/**
 * A aba anunciava exemplos que caíam a 150 km daqui e no meio do Atlântico — e o
 * botão de exemplo executava a discordância na cara de quem clicava. Este teste
 * é o que impede a volta: todo exemplo que promete um lugar tem de cair nele.
 */
const BLUMENAU = { lat: -26.9194, lng: -49.0661 };
const ITAJAI = { lat: -26.9078, lng: -48.6618 };

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.hypot(
    (a.lat - b.lat) * 111.32,
    (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180),
  );

describe("os exemplos da aba Geolocalização", () => {
  it("Maidenhead e Quadkey apontam para Blumenau de verdade", () => {
    expect(km(decodeMaidenhead("GG53lb") as { lat: number; lng: number }, BLUMENAU)).toBeLessThan(
      5,
    );
    expect(
      km(decodeQuadkey("210311232221") as { lat: number; lng: number }, BLUMENAU),
    ).toBeLessThan(5);

    // E os valores que estavam publicados, para o teste dizer POR QUE existe:
    expect(
      km(decodeMaidenhead("GG42vb") as { lat: number; lng: number }, BLUMENAU),
    ).toBeGreaterThan(100);
    expect(
      km(decodeQuadkey("211102203311") as { lat: number; lng: number }, BLUMENAU),
    ).toBeGreaterThan(1000);
  });

  it("todo exemplo que promete Blumenau ou Itajaí cai lá", () => {
    for (const f of GRUPOS_GEO.flatMap((g) => g.formatos)) {
      const promete = /blumenau/i.test(f.exemplo.saida)
        ? BLUMENAU
        : /itaja/i.test(f.exemplo.saida)
          ? ITAJAI
          : null;
      if (!promete) continue;

      const r = detectLocation(f.exemplo.entrada);
      expect(r, `${f.id}: "${f.exemplo.entrada}" não foi reconhecido`).not.toBeNull();
      // 30 km cobre a célula grossa de um GeoHex ou de um UTM truncado sem
      // deixar passar erro de sistema — o menor dos dois antigos era de 150 km.
      expect(
        km(r as { lat: number; lng: number }, promete),
        `${f.id}: "${f.exemplo.entrada}" caiu longe do que promete`,
      ).toBeLessThan(30);
    }
  });
});
