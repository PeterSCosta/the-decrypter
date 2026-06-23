import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as rbr } from "./registrobr";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (i: string) => rbr.decode(i, ctx);

describe("Domínio .br (Registro.br)", () => {
  it("detecta domínio .br e marca render", () => {
    const c = decode("uol.com.br")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("registrobr");
    expect((c.data as { domain: string }).domain).toBe("uol.com.br");
    expect(decode("blumenau.sc.gov.br").length).toBe(1);
  });

  it("ignora o que não é domínio .br", () => {
    expect(decode("google.com")).toEqual([]);
    expect(decode("texto qualquer")).toEqual([]);
    expect(decode("br")).toEqual([]);
  });
});
