import type { CodeHit } from "@/features/reference/phone-codes";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as ddd } from "./ddd";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => ddd.decode(input, ctx);

describe("DDD (área do Brasil)", () => {
  it("'47 48' → norte e sul de SC", () => {
    const c = decode("47 48")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("code-list");
    const hits = c.data as CodeHit[];
    expect(hits[0]).toMatchObject({ code: "47", name: "SC · Norte / Vale do Itajaí" });
    expect(hits[1].name).toContain("SC");
    expect(hits[1].name).toContain("Sul");
  });

  it("'11' → Grande São Paulo", () => {
    expect((decode("11")[0].data as CodeHit[])[0].name).toBe("SP · Grande São Paulo");
  });

  it("não dispara para DDD inexistente ou token não-2-dígitos", () => {
    expect(decode("20")).toEqual([]); // 20 não é DDD válido
    expect(decode("123")).toEqual([]);
  });
});
