import { describe, expect, it } from "vitest";
import type { DecodeContext, Decoder } from "../types";
import { decoders as autokey } from "./autokey";
import { decoders as baudot } from "./baudot";
import { decoders as columnar } from "./columnar";
import { decoders as playfair } from "./playfair";

const ctx = (key = ""): DecodeContext => ({ key, streets: null, ceps: null });
const out = (d: Decoder, input: string, key = "") => d.decode(input, ctx(key)).map((c) => c.output);

describe("mais cifras (lote 2)", () => {
  it("Baudot / ITA2", () => {
    expect(out(baudot, "1010000001100101001011000")).toContain("HELLO");
  });
  it("Playfair (vetor clássico)", () => {
    expect(out(playfair, "BMODZBXDNABEKUDMUIXMMOUVIF", "PLAYFAIREXAMPLE")[0]).toContain(
      "HIDETHEGOLD",
    );
  });
  it("Transposição colunar (chave ZEBRAS)", () => {
    expect(out(columnar, "EVLNACDTESEAROFODEECWIREE", "ZEBRAS")).toContain(
      "WEAREDISCOVEREDFLEEATONCE",
    );
  });
  it("Vigenère autokey", () => {
    expect(out(autokey, "QNXEPVYTWTWP", "QUEENLY")).toContain("ATTACKATDAWN");
  });
});
