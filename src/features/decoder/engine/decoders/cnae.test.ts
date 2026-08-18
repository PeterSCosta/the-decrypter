import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as cnae, formatarCnae } from "./cnae";

const decode = (input: string) => cnae.decode(input, { key: "", streets: null } as DecodeContext);

describe("CNAE", () => {
  it("a pontuação é a assinatura, e ela vale nota alta", () => {
    const c = decode("62.01-5/01")[0];
    expect(c).toBeDefined();
    expect(c.render).toBe("cnae");
    expect(c.forcedScore).toBeGreaterThan(0.8);
  });

  it("sete dígitos nus entram baixo — é a forma de meia dúzia de outras coisas", () => {
    // Mesmo comprimento do IMO, de um telefone sem DDD e de tanto número por
    // aí. Sem pontuação, quem separa o CNAE do resto é o IBGE confirmar no card.
    const nu = decode("6201501")[0].forcedScore as number;
    const pontuado = decode("62.01-5/01")[0].forcedScore as number;
    expect(nu).toBeLessThan(0.35);
    expect(pontuado).toBeGreaterThan(nu);
  });

  it("pontuação pela metade não é grafia que exista", () => {
    // `62.01501` e `6201-501` não aparecem em lugar nenhum; aceitá-las só
    // abriria porta para ruído com cara de assinatura.
    expect(decode("62.01501")).toHaveLength(0);
    expect(decode("6201-501")).toHaveLength(0);
  });

  it("comprimento errado não emite", () => {
    expect(decode("620150")).toHaveLength(0);
    expect(decode("62015012")).toHaveLength(0);
  });

  it("formata como o código aparece impresso", () => {
    expect(formatarCnae("6201501")).toBe("62.01-5/01");
    expect(formatarCnae("4711302")).toBe("47.11-3/02");
  });
});
