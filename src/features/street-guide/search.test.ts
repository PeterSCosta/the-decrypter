import { describe, expect, it } from "vitest";
import { searchStreets } from "./search";
import type { StreetsData } from "./types";

function row(codigo: number, nome: string, numLei: number | null, bairro = "Centro") {
  return {
    codigo,
    tipo: "R",
    nome,
    bairroNum: 1,
    bairro,
    numLei,
    dataLei: null,
    localizacao: "",
    ext: null,
    larg: null,
    atas: "",
  };
}

const data: StreetsData = {
  source: "test",
  generatedAt: "2026-01-01",
  count: 3,
  rows: [
    row(3722, "ABACATE", 6416),
    row(1655, "ABACATEIRO", 2952, "Victor Konder"),
    row(11, "ACRE", 6416), // shares law 6416 with ABACATE
  ],
};

describe("searchStreets", () => {
  it("matches an exact código first", () => {
    const r = searchStreets(data, "3722");
    expect(r[0].kind).toBe("codigo");
    expect(r[0].row.nome).toBe("ABACATE");
  });

  it("matches Nº da Lei (possibly several streets)", () => {
    const r = searchStreets(data, "6416");
    const leis = r.filter((m) => m.kind === "lei");
    expect(leis.map((m) => m.row.nome).sort()).toEqual(["ABACATE", "ACRE"]);
  });

  it("matches name substrings, accent-insensitive", () => {
    expect(searchStreets(data, "abacate").length).toBe(2); // ABACATE + ABACATEIRO
  });

  it("matches by bairro", () => {
    const r = searchStreets(data, "konder");
    expect(r[0].row.nome).toBe("ABACATEIRO");
  });

  it("returns nothing for empty query", () => {
    expect(searchStreets(data, "")).toHaveLength(0);
  });
});
