import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import type { BarcodeHint } from "./barcode";
import { decoders as barcode } from "./barcode";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => barcode.decode(input, ctx);

describe("decoder código de barras", () => {
  it("EAN-13 brasileiro → país Brasil", () => {
    const c = decode("7891000053508")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("barcode");
    const hint = c.data as BarcodeHint;
    expect(hint.type).toBe("EAN-13");
    expect(hint.country).toBe("Brasil");
    expect(hint.special).toBeUndefined();
  });

  it("prefixo 978 → marcado como ISBN (livro)", () => {
    const hint = decode("9788535902778")[0].data as BarcodeHint;
    expect(hint.special).toBe("isbn");
    expect(hint.country).toContain("ISBN");
  });

  it("não dispara para DV inválido ou texto", () => {
    expect(decode("7891000053509")).toEqual([]); // DV errado
    expect(decode("hello world")).toEqual([]);
  });
});
