import type { MathReport } from "@/features/math/arith";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as math } from "./math-helper";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string, extra: Partial<DecodeContext> = {}) =>
  math.decode(input, { ...ctx, ...extra });

/** Parágrafo das evidências de GIA-27 "Engenheiro Foragido" (acervo). */
const GIA_27 = `Durante uma busca em um de seus antigos esconderijos, os investigadores encontraram diversos materiais que aparentemente não possuíam relação entre si: 21 cadernos de anotações, 15 mapas rabiscados, 45 fotografias, 60 páginas de cálculos, 63 coordenadas marcadas, 12 documentos falsificados e 15 cartões de acesso.

A única pista encontrada em seu diário foi uma frase escrita repetidas vezes: "Quando tudo parecer diferente, encontre aquilo que todos têm em comum."

68130.89.91.15.12`;

/** Enunciado de GIA-21 "Prova Quadrada" (acervo), com os dois parágrafos que carregam a coordenada. */
const GIA_21 = `As raízes representam a força invisível que sustenta a vida e mantêm as árvores firmes diante do tempo. Algumas espécies conseguem viver por mais de 676 anos graças à profundidade de suas raízes, enquanto outras precisam de apenas 81 dias para se estabelecer em um solo fértil. Em grandes florestas, há árvores cuja área de sustentação ultrapassa 2304 metros quadrados, tudo iniciado a partir de 1 pequena semente que encontrou espaço para crescer. Em certos casos, as raízes alcançam até 64 metros de extensão subterrânea, conectando vida, água e nutrientes em perfeita harmonia.

Na natureza, cada raiz possui um papel essencial no equilíbrio do ambiente. Existem plantas que começam a desenvolver suas primeiras ramificações em apenas 16 dias, criando uma base forte para continuar crescendo. Algumas árvores tropicais chegam a expandir suas raízes por até 8100 centímetros abaixo da terra, formando verdadeiras redes naturais. Em períodos de cultivo, muitos agricultores observam que cerca de 49 dias são suficientes para uma muda criar estabilidade no solo. Já árvores maiores podem absorver mais de 400 litros de água em dias quentes, mantendo-se vivas mesmo em condições difíceis, enquanto pequenas plantas mostram que até em espaços de apenas 4 metros é possível criar raízes fortes e duradouras.

Não perca as contas, nos encontre no local indicado. A precisão não é das melhores, mas basta olhar ao redor que tudo fara sentido.`;

/** Enunciado de GIA-06 "Paraíso Fiscal" (acervo). */
const GIA_06 = `Um investidor de criptomoedas anônimo da equipe está muito preocupado! O governo anunciou a taxação de 17,5% sobre os lucros com criptoativos, e ele tem um pequeno segredo: uma carteira Bitcoin no valor de R$ 15.586.677,75.

Seu maior medo é que seja descoberto e ele precise dividir esse valor com o governo. Então como bons gincaneiros vamos ajudar ele a encontrar qual o melhor paraíso fiscal para ele guardar sua carteira!`;

describe("faixa 1 — lista nua", () => {
  it("GIA-27: 21 15 45 60 63 12 15 → MDC 3 → GEOTUDE", () => {
    const c = decode("21 15 45 60 63 12 15");
    const panel = c[0];
    expect(panel.render).toBe("math");
    expect(panel.output).toContain("MDC = 3 → 7 5 15 20 21 4 5 → GEOTUDE");
    expect(panel.output).toContain("MMC = 1260");
    expect(panel.output).toContain("soma = 231");
    // A leitura A1Z26 empurra o painel para cima do piso da lista nua (0,32),
    // que é a propriedade que importa: sem leitura que signifique algo, o painel
    // é calculadora e fica abaixo do corte de 0,35 do `partition`; com GEOTUDE,
    // ele sobe e disputa o topo. Aqui a wordlist não está carregada — no app ela
    // está, e GEOTUDE (que é palavra de prova conhecida) sobe bem mais.
    expect(panel.forcedScore).toBeGreaterThan(0.35);
    expect(panel.chainValue).toBe("GEOTUDE");

    // e sai também como cartão de texto, sem score forçado — o scorer decide
    const leitura = c.find((x) => x.output === "GEOTUDE");
    expect(leitura?.forcedScore).toBeUndefined();
    expect(leitura?.label).toBe("MDC → A1Z26");
  });

  it("um token só não é lista: 89066-730 é CEP e fica com quem sabe ler CEP", () => {
    expect(decode("89066-730")).toEqual([]);
  });

  it("menos de 2 valores, ou mais de 24, não é lista de prova", () => {
    expect(decode("42")).toEqual([]);
    expect(decode(Array.from({ length: 25 }, (_, i) => i + 1).join(" "))).toEqual([]);
  });
});

describe("faixa 2 — prosa com palavra-dica", () => {
  it("GIA-21 'raízes': raiz de cada, agrupada por bloco → coordenada", () => {
    const c = decode(GIA_21);
    expect(c).toHaveLength(1); // só a linha da dica, sem painel
    expect(c[0].label).toBe("Raiz quadrada");
    expect(c[0].forcedScore).toBe(0.62);
    expect(c[0].output).toContain("raiz: 26 9 48 1 8 | 4 90 7 20 2");
    expect(c[0].output).toContain("junto: 2694818 4907202");
    expect(c[0].output).toContain("possível coordenada -26.94818, -49.07202");
    expect(c[0].chainValue).toBe("-26.94818, -49.07202");
  });

  it("GIA-06 'dividir' + alíquota: 15.586.677,75 ÷ 17,5% = 89066730 → CEP", () => {
    const c = decode(GIA_06);
    expect(c).toHaveLength(1);
    expect(c[0].label).toBe("Divisão");
    expect(c[0].output).toBe("15.586.677,75 ÷ 17,5% = 89066730 · CEP 89066-730");
    expect(c[0].chainValue).toBe("89066730");
  });

  it("GIA-27 inteiro: 'em comum' isola o MDC, e o bloco do código não polui", () => {
    const c = decode(GIA_27);
    const linha = c.find((x) => x.label === "MDC");
    expect(linha?.output).toBe("MDC = 3 → 7 5 15 20 21 4 5 → GEOTUDE | MDC = 1");
    expect(c.some((x) => x.output === "GEOTUDE")).toBe(true);
    // nenhuma outra operação entra sem dica que a peça
    expect(c.every((x) => x.label === "MDC" || x.label === "MDC → A1Z26")).toBe(true);
  });

  it("'Kaprekar' + anos: o código verídico é 4377, não o 4477 do gabarito", () => {
    // acervo RESOLUCOES.md:271 conta 4/4/7/7; 2010 fecha em 3 passos, e o
    // algoritmo NÃO foi torcido para reproduzir o gabarito (ver arith.test.ts)
    const c = decode("Kaprekar visitou 2019, 2010, 1949 e 1905.");
    const linha = c.find((x) => x.label === "Kaprekar");
    expect(linha?.output).toBe("Kaprekar: 2019 → 4 · 2010 → 3 · 1949 → 7 · 1905 → 7 · código 4377");
    expect(linha?.chainValue).toBe("4377");
  });
});

describe("faixa 3 — solo", () => {
  it("escolhida a dedo, a prosa abre o painel inteiro", () => {
    const c = decode(GIA_21, { only: "math-helper" });
    const panel = c[0];
    expect(panel.label).toBe("10 números");
    expect(panel.output).toContain("MDC = 1");
    expect(panel.output).toContain("raiz: 26 9 48 1 8");
    const report = panel.data as MathReport;
    expect(report.blocks).toHaveLength(2);
    expect(report.lines.length).toBeGreaterThan(3);
  });
});

describe("o portão", () => {
  it("SEM DICA, PROSA NUNCA DISPARA", () => {
    expect(decode("Reunião dia 27/07/2026 às 14h30, sala 12, ramal 4488")).toEqual([]);
    expect(decode("A equipe tem 12 integrantes e ganhou 3 provas em 2025.")).toEqual([]);
    expect(decode("Rua Ilhas Malvinas, 250, Itoupavazinha, CEP 89066-730")).toEqual([]);
    expect(decode(GIA_21.replace(/ra[íi]z(es)?/gi, "sustentação"))).toEqual([]);
  });

  it("percentual solto não é dica de divisão fora do formato de GIA-06", () => {
    expect(decode("O faturamento cresceu 12% em 2024 e 30% em 2025.")).toEqual([]);
  });

  it("sem número nenhum, nem em solo", () => {
    expect(decode("nenhum número aqui", { only: "math-helper" })).toEqual([]);
  });
});
