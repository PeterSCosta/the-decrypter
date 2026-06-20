import type { CodeHit } from "@/features/reference/phone-codes";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as ddi } from "./ddi";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => ddi.decode(input, ctx);

describe("DDI (código de país)", () => {
  it("'55 56' → Brasil, Chile", () => {
    const c = decode("55 56")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("code-list");
    const hits = c.data as CodeHit[];
    expect(hits.map((h) => h.name)).toEqual(["Brasil", "Chile"]);
    expect(c.output).toContain("Brasil");
  });

  it("código único (1 = EUA/Canadá)", () => {
    expect((decode("1")[0].data as CodeHit[])[0].name).toContain("Estados Unidos");
  });

  it("não dispara se algum token não for país", () => {
    expect(decode("55 9999")).toEqual([]);
    expect(decode("abc")).toEqual([]);
  });
});
