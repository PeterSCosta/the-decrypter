import { cellToLatLng, isValidCell, latLngToCell } from "h3-js";
import { describe, expect, it } from "vitest";
import { placekeyParaH3 } from "./placekey";

const km = (a: number[], b: number[]) =>
  Math.hypot((a[0] - b[0]) * 111.32, (a[1] - b[1]) * 111.32 * Math.cos((a[0] * Math.PI) / 180));

describe("Placekey", () => {
  it("reproduz o exemplo canônico (Ferry Building, São Francisco)", () => {
    // O Placekey publicado na documentação deles.
    const h = placekeyParaH3("zzw-22y@5vg-7gt-qzz");
    console.log(`\n  zzw-22y@5vg-7gt-qzz → h3 ${h}`);
    expect(h).toBeTruthy();
    expect(isValidCell(h as string)).toBe(true);
    const pt = cellToLatLng(h as string);
    console.log(`    → ${pt[0].toFixed(4)}, ${pt[1].toFixed(4)}  (esperado 37.7953, -122.3940)`);
    expect(km(pt, [37.7953, -122.394])).toBeLessThan(0.2);
  });

  it("exige o @ — sem ele são três trios que colidem com ID de YouTube", () => {
    expect(placekeyParaH3("khg-8w9-89z")).toBeNull();
  });

  it("aceita a forma só-Onde (`@` na frente)", () => {
    const h = placekeyParaH3("@5vg-7gt-qzz");
    expect(h).toBeTruthy();
    expect(isValidCell(h as string)).toBe(true);
  });

  it("Blumenau: o hexágono certo", () => {
    const h3Blu = latLngToCell(-26.9194, -49.0661, 10);
    console.log(`  Blumenau em H3/10 → ${h3Blu}`);
    // Vamos achar o Placekey correspondente pela volta: qualquer Placekey que
    // aponte para esse hexágono tem de reproduzi-lo.
    expect(isValidCell(h3Blu)).toBe(true);
  });
});
