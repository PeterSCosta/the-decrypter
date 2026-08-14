import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as regroup } from "./digit-regroup";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => regroup.decode(input, ctx);

/**
 * Texto de GIA-01 "Ask Me" (acervo: gia-2026/gia-01-ask-me/texto/resolucao.md),
 * copiado na íntegra porque o portão depende de contar dígitos no meio da prosa.
 * Os 32 dígitos saem em ordem: 01010100 01001111 01010000 01001111 → TOPO.
 */
const ASK_ME = `Quer saber o segredo da Equipe Arromba é só me perguntar! Tudo começa com 0,10 de dúvida sobre nossa chance de ganhar. Ninguém tem dúvida que na hora que o sangue laranja verde quase nada nos para. Depois disso vem um pessoal 10: todo mundo se estendendo as mãos e corações pulsando no mesmo ritmo e vontade de ir além. E a cereja do bolo é a energia 100 para encarar o vem vier. Com ideias e amizade para seguir em frente sempre juntos.

Mas tem mais nessa jornada. Mesmo se uma prova der 0,100 de diferença na pontuação nós vamos atrás com tudo. Foi aí que apareceu o 1: já ganhamos no critério de desempate e até por mais de 11 pontos. Acreditar é uma marca do Arromba! Quando tudo parecia perdido nós não baixamos a cabeça e fomos atrás daquele 1 ponto para buscar os nossos objetivos.

Claro que todos temos dias bons e ruins. Afinal ganhar e perder faz parte da caminhada. Mas mesmo nos dias de tempestade seguíamos em frente. Mesmo que estivéssemos com 0,10 da equipe em uma prova pode ter certeza de que todos iriam 100 vezes mais longe se fosse preciso até que não sobrasse 0,0 pontos...

Em resumo é isso... uma equipe diferente: onde 0,100 dos integrantes competem com 111 se precisar para buscar novamente sermos o número 1. Porque quando cada número nessa história ajuda na conquista final.

OBS: Diferente da CP que adora uma vírgula nós não demos muito importância para elas`;

describe("reagrupar dígitos", () => {
  it("GIA-01 Ask Me: a prosa inteira → TOPO", () => {
    const cands = decode(ASK_ME);
    expect(cands[0]?.output).toBe("TOPO");
    expect(cands[0]?.label).toBe("binário, blocos de 8 (ASCII)");
    // as outras divisões (4 bits, pares) morrem no filtro — um cartão, sem cauda
    expect(cands).toHaveLength(1);
  });

  it("pares decimais → A1Z26 (caso canônico, não do acervo)", () => {
    // VENCEDOR (resposta de GIA-04) escrito com dois dígitos por letra
    const c = decode("22 05 14 03 05 04 15 18");
    expect(c[0]?.output).toBe("VENCEDOR");
    expect(c[0]?.label).toBe("A1Z26, blocos de 2");
  });

  it("trincas decimais → ASCII (caso canônico, não do acervo)", () => {
    const c = decode("065.082.082.079.077.066.065");
    expect(c.some((x) => x.output === "ARROMBA")).toBe(true);
  });

  it("não repete o codec `binary` quando os octetos já vêm separados", () => {
    expect(decode("01010100 01001111 01010000 01001111")).toEqual([]);
    expect(decode("01010100010011110101000001001111")).toEqual([]);
  });

  it("cala a boca sem dígitos suficientes ou sem leitura plausível", () => {
    expect(decode("0,10 e 10 e 100")).toEqual([]); // 8 dígitos < 16
    expect(decode("CPF 111.444.777-35, fone (47) 3333-2222")).toEqual([]);
    expect(decode("Reunião dia 27/07/2026 às 14h30, sala 12, ramal 4488")).toEqual([]);
  });
});
