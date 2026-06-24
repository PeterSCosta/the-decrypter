import { describe, expect, it } from "vitest";
import { BLUMENAU, inBBox } from "./anchors";
import { decodePlusCode, decodePlusCodeLocal, decodePlusCodeOffline } from "./formats";
import { decodePlusCodeLib, recoverPlusCodeLib } from "./plus-code";

describe("Plus Code — lib oficial como fallback", () => {
  it("paridade: lib e offline decodificam o mesmo centro (códigos validados)", () => {
    for (const code of ["585G3WJM+6H", "585H38RQ+V7"]) {
      const off = decodePlusCodeOffline(code);
      const lib = decodePlusCodeLib(code);
      expect(off, code).not.toBeNull();
      expect(lib, code).not.toBeNull();
      expect(lib?.lat).toBeCloseTo(off!.lat, 4);
      expect(lib?.lng).toBeCloseTo(off!.lng, 4);
    }
  });

  it("offline rejeita refinamento de grade (4 chars após +); decodePlusCode cai na lib", () => {
    const grid = "585G3WJM+6HR5"; // grade nível 12
    expect(decodePlusCodeOffline(grid)).toBeNull();
    const pt = decodePlusCode(grid);
    expect(pt).not.toBeNull();
    expect(inBBox(pt!, BLUMENAU.bbox)).toBe(true);
  });

  it("recoverPlusCodeLib recupera o código completo perto da âncora", () => {
    const r = recoverPlusCodeLib("3WJM+6H", BLUMENAU.lat, BLUMENAU.lng);
    expect(r?.full).toBe("585G3WJM+6H");
    expect(r && inBBox(r, BLUMENAU.bbox)).toBe(true);
  });

  it("decodePlusCodeLocal recupera a cidade (atalho offline + fallback da lib)", () => {
    expect(decodePlusCodeLocal("3WJM+6H")?.anchor).toBe("Blumenau");
    expect(decodePlusCodeLocal("38RQ+V7")?.anchor).toBe("Itajaí");
  });

  it("lib retorna null p/ entrada inválida", () => {
    expect(decodePlusCodeLib("isto não é plus code")).toBeNull();
    expect(decodePlusCodeLib("585G3WJM+6H sobra")).toBeNull();
  });
});
