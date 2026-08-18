import { describe, expect, it } from "vitest";
import { decodeGeoUri, decodeIso6709, decodeOsmShortlink } from "./geo-uri";

const BLUMENAU = { lat: -26.9194, lng: -49.0661 };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.hypot(
    (a.lat - b.lat) * 111.32,
    (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180),
  );

describe("Geo URI (RFC 5870)", () => {
  it("lê o par e a incerteza", () => {
    const r = decodeGeoUri("geo:-26.9194,-49.0661;u=35");
    expect(km(r!, BLUMENAU)).toBeLessThan(0.1);
    expect(r!.incerteza).toBe(35);
  });
  it("sem incerteza também vale", () => {
    expect(decodeGeoUri("geo:-26.9194,-49.0661")).toBeTruthy();
  });
  it("não é geo URI se não tiver o esquema", () => {
    expect(decodeGeoUri("-26.9194,-49.0661")).toBeNull();
  });
});

describe("ISO 6709", () => {
  it("exige as TRÊS marcas: sinal, 3 dígitos na longitude e barra", () => {
    expect(km(decodeIso6709("-26.9194-049.0661/")!, BLUMENAU)).toBeLessThan(0.1);
    expect(decodeIso6709("-26.9194-49.0661/")).toBeNull(); // longitude com 2 dígitos
    expect(decodeIso6709("-26.9194-049.0661")).toBeNull(); // sem barra
    expect(decodeIso6709("26.9194049.0661/")).toBeNull(); // sem sinal
  });
  it("lê a altitude quando vem", () => {
    const r = decodeIso6709("-26.9194-049.0661+21.0CRSWGS_84/");
    expect(r!.altitude).toBe(21);
  });
});

describe("OSM shortlink", () => {
  it("reproduz o exemplo do wiki do OSM", () => {
    // 0EEQjE-- = 51.5110 / 0.0550, zoom 9 — o exemplo publicado, com os dois
    // hífens que descem o zoom.
    const r = decodeOsmShortlink("https://osm.org/go/0EEQjE--");
    expect(r).toBeTruthy();
    console.log(`\n  0EEQjE-- → ${r!.lat.toFixed(4)}, ${r!.lng.toFixed(4)} (z${r!.zoom})`);
    expect(km(r!, { lat: 51.511, lng: 0.055 })).toBeLessThan(3);
    // O zoom documentado é 9 — e a inversa ingênua devolvia 8.
    expect(r!.zoom).toBe(9);
  });
  it("exige o prefixo — 8 caracteres soltos são a forma de meio mundo", () => {
    expect(decodeOsmShortlink("M_NHnvWM")).toBeNull();
  });
});
