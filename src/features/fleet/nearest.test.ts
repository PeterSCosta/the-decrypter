import { describe, expect, it } from "vitest";
import { formatDistance, haversineKm, nearestDevice } from "./nearest";
import type { FleetDevice } from "./types";

const dev = (id: number, name: string, lat: number | null, lng: number | null): FleetDevice => ({
  id,
  name,
  status: "online",
  lastUpdate: null,
  lat,
  lng,
  speedKmh: null,
  course: null,
  battery: null,
  moving: false,
  phone: null,
});

describe("haversineKm", () => {
  it("mesma coordenada = 0", () => {
    expect(haversineKm({ lat: -26.9, lng: -49.07 }, { lat: -26.9, lng: -49.07 })).toBeCloseTo(0, 5);
  });
  it("~1 grau de latitude ≈ 111 km", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
  });
});

describe("nearestDevice", () => {
  const point = { lat: -26.9, lng: -49.07 }; // Blumenau
  it("escolhe o mais próximo e ignora quem não tem posição", () => {
    const r = nearestDevice(point, [
      dev(1, "Longe", -23.55, -46.63), // SP
      dev(2, "Perto", -26.91, -49.08), // ~1.5 km
      dev(3, "SemPos", null, null),
    ]);
    expect(r?.device.name).toBe("Perto");
    expect(r?.km).toBeLessThan(3);
  });
  it("null quando ninguém tem posição", () => {
    expect(nearestDevice(point, [dev(3, "SemPos", null, null)])).toBeNull();
    expect(nearestDevice(point, [])).toBeNull();
  });
});

describe("formatDistance", () => {
  it("metros / km", () => {
    expect(formatDistance(0.85)).toBe("850 m");
    expect(formatDistance(1.23)).toBe("1,2 km");
    expect(formatDistance(42)).toBe("42 km");
  });
});
