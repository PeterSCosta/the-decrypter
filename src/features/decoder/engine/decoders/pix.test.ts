import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as pix } from "./pix";

const pixData = [
  { ispb: "00000000", nome: "BANCO DO BRASIL S.A.", nomeReduzido: "BB", tipo: "Direta" },
  { ispb: "60746948", nome: "BANCO BRADESCO S.A.", nomeReduzido: "BRADESCO", tipo: "Direta" },
];
const ctx: DecodeContext = { key: "", streets: null, ceps: null, pix: pixData };
const decode = (i: string) => pix.decode(i, ctx);

describe("Participante PIX (ISPB)", () => {
  it("ISPB conhecido → participante", () => {
    const c = decode("60746948")[0];
    expect(c).toBeDefined();
    expect(c.output).toContain("BRADESCO");
    expect(c.notes).toContain("ISPB 60746948");
  });

  it("não dispara sem base, sem 8 dígitos ou com ISPB inexistente", () => {
    expect(pix.decode("60746948", { key: "", streets: null, ceps: null })).toEqual([]);
    expect(decode("123")).toEqual([]);
    expect(decode("99999999")).toEqual([]);
  });
});
