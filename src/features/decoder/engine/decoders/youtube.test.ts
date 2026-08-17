import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as youtube } from "./youtube";

const decode = (input: string) =>
  youtube.decode(input, { key: "", streets: null } as DecodeContext);

describe("vídeo do YouTube", () => {
  it("reconhece o ID solto — que é o caso que passa despercebido", () => {
    const c = decode("b62kBXlBlyQ")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("youtube");
    expect(c.label).toBe("b62kBXlBlyQ");
    expect(c.chainValue).toBe("b62kBXlBlyQ");
  });

  it("o link inteiro pontua no teto: não tem como ser outra coisa", () => {
    const url = decode("https://www.youtube.com/watch?v=b62kBXlBlyQ")[0];
    const nu = decode("b62kBXlBlyQ")[0];
    expect(url.forcedScore).toBeGreaterThan(nu.forcedScore as number);
    expect(url.label).toBe("b62kBXlBlyQ");
  });

  it("aceita as outras formas de link", () => {
    for (const u of [
      "https://youtu.be/b62kBXlBlyQ",
      "https://www.youtube.com/shorts/b62kBXlBlyQ",
      "https://www.youtube.com/embed/b62kBXlBlyQ",
      "https://www.youtube.com/live/b62kBXlBlyQ",
    ]) {
      expect(decode(u)[0]?.label).toBe("b62kBXlBlyQ");
    }
  });

  it("palavra de 11 letras não vira vídeo", () => {
    // A guarda que evita o falso positivo diário: um ID sorteado tem dígito,
    // maiúscula ou separador; "brasileiros" não tem nenhum dos três.
    expect(decode("brasileiros")).toHaveLength(0);
    expect(decode("computadore")).toHaveLength(0);
  });

  it("texto com sobra não é ID", () => {
    expect(decode("b62kBXlBlyQ e mais")).toHaveLength(0);
    expect(decode("b62kBXlBly")).toHaveLength(0);
  });
});
