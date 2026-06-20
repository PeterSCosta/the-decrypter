import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as music } from "./music-notes";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => music.decode(input, ctx);
const out = (input: string) => decode(input)[0]?.output;

describe("notas musicais", () => {
  it("solfejo pt → letras", () => {
    expect(out("Dó Ré Mi Fá")).toBe("CDEF");
    expect(out("sol la si")).toBe("GAB");
  });

  it("cifra anglo (com oitava/acidentes) → letras", () => {
    expect(out("C D E")).toBe("CDE");
    expect(out("C4 E4 G4")).toBe("CEG");
    expect(out("F# A Bb")).toBe("FAB");
  });

  it("inclui números A1Z26 nas notas", () => {
    expect(decode("Dó Ré Mi")[0]?.notes).toBe("A1Z26: 3 4 5");
  });

  it("ignora quando há token que não é nota ou < 3 notas", () => {
    expect(decode("do re xyz")).toEqual([]);
    expect(decode("do re")).toEqual([]);
  });
});
