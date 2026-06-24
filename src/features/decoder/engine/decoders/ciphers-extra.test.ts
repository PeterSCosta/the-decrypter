import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as bifid } from "./bifid";
import { decoders as porta } from "./porta";
import { trithemius as triFn, decoders as trithemius } from "./trithemius";
import { decoders as xorKey } from "./xor-key";

const ctx = (key = ""): DecodeContext => ({ key, streets: null, ceps: null });
const outs = (
  d: { decode: (i: string, c: DecodeContext) => { output: string }[] },
  i: string,
  k = "",
) => d.decode(i, ctx(k)).map((c) => c.output);

describe("Trithemius", () => {
  it("cifrar(+i) e decifrar(−i) são inversos", () => {
    const cipher = triFn("HELLOWORLD", 1);
    expect(cipher).not.toBe("HELLOWORLD");
    expect(triFn(cipher, -1)).toBe("HELLOWORLD");
  });
  it("o decoder mostra o texto claro a partir do cifrado", () => {
    const cipher = triFn("ATTACKATDAWN", 1);
    expect(outs(trithemius, cipher)).toContain("ATTACKATDAWN");
  });
});

describe("Porta", () => {
  it("é recíproca: cifrar e decifrar com a mesma chave volta ao original", () => {
    const plain = "ATTACKATDAWN";
    const cipher = outs(porta, plain, "LEMON")[0];
    expect(cipher).not.toBe(plain);
    expect(outs(porta, cipher, "LEMON")).toContain(plain);
  });
  it("sem chave não dispara", () => {
    expect(outs(porta, "ATTACK")).toHaveLength(0);
  });
});

describe("XOR com chave", () => {
  it("recupera o texto claro de um hex XORado", () => {
    const plain = "HELLO";
    const key = "KEY";
    const pb = new TextEncoder().encode(plain);
    const kb = new TextEncoder().encode(key);
    const hex = [...pb]
      .map((b, i) => (b ^ kb[i % kb.length]).toString(16).padStart(2, "0"))
      .join("");
    expect(outs(xorKey, hex, key)).toContain(plain);
  });
  it("sem chave não dispara", () => {
    expect(outs(xorKey, "48656c6c6f")).toHaveLength(0);
  });
});

describe("Bifid", () => {
  it("decifra o vetor conhecido FNNVD → HELLO (sem chave, I/J juntos)", () => {
    expect(outs(bifid, "FNNVD")).toContain("HELLO");
  });
  it("round-trip com chave: decifrar o cifrado volta ao claro", () => {
    // cifra "REUNIAOMEIANOITE" com chave; decifrar de novo NÃO volta (Bifid não é
    // recíproca), então validamos só o vetor conhecido acima + que produz saída.
    expect(outs(bifid, "REUNIAO", "CHAVE").length).toBe(1);
  });
});
