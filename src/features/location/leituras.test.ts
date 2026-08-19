import { describe, expect, it } from "vitest";
import { CONFIANCA, detectLocation, detectLocations } from "./formats";

/**
 * "Se existe uma localização, mesmo que longe, é válida."
 *
 * A cascata parava no primeiro acerto, e isso ESCONDIA leitura verdadeira. O
 * caso que motivou tudo é `38HQ+J3`, da ITC 2017 Extra: ele é ao mesmo tempo a
 * cauda de um Plus Code de Itajaí e — se a gente fingir que quatro caracteres
 * antes do `+` são um código inteiro — um ponto no Atlântico Sul, 2.900 km
 * fora. A bancada mostrava só o segundo, com a nota MAIS ALTA da cascata,
 * enquanto a ficha ao lado prometia o atalho local.
 *
 * A regra que este teste prende tem duas metades, e a segunda é a que costuma
 * ser esquecida:
 *   1. a leitura de perto tem de APARECER e vir em cima;
 *   2. a leitura de longe **não se apaga** — ela é o que aquele sistema
 *      devolve, e apagá-la seria decidir pelo jogador.
 */
describe("todas as leituras, a mais confiável em cima", () => {
  it("38HQ+J3 devolve Itajaí E o Atlântico, nessa ordem", () => {
    const r = detectLocations("38HQ+J3");
    expect(r).toHaveLength(2);

    expect(r[0].format).toContain("Itajaí");
    expect(r[0].lat).toBeCloseTo(-26.92, 1);
    expect(r[0].lng).toBeCloseTo(-48.66, 1);
    expect(r[0].confianca).toBe(CONFIANCA.atalho);

    // A de longe fica, e fica embaixo.
    expect(r[1].lat).toBeCloseTo(-58.4, 1);
    expect(r[1].confianca).toBe(CONFIANCA.frouxa);
  });

  it("g7rpj devolve Blumenau E a Islândia, nessa ordem", () => {
    const r = detectLocations("g7rpj");
    expect(r[0].format).toContain("Blumenau");
    expect(r[0].lat).toBeCloseTo(-26.919, 2);
    expect(r[1].format).toBe("Geohash");
    expect(r[1].lat).toBeCloseTo(64.53, 1);
  });

  it("um Plus Code INTEIRO vale forma própria; uma cauda, não", () => {
    // Oito caracteres antes do `+` são o código completo — aí não há palpite.
    const inteiro = detectLocations("796RWF8Q+WF");
    expect(inteiro[0].confianca).toBe(CONFIANCA.forma);
    // Quatro são cauda; lê-la como inteiro é chute, e chute não passa na frente
    // de uma leitura que se auto-valida contra a caixa do Vale.
    const cauda = detectLocations("3WJM+6H");
    expect(cauda[0].confianca).toBe(CONFIANCA.atalho);
    expect(cauda[0].format).toContain("Blumenau");
  });

  it("o código local escrito por inteiro não vira leitura repetida", () => {
    // `6gjng7rpj` é o mesmo ponto que a cauda `g7rpj` reconstrói. Duas linhas
    // idênticas na tela seriam a mesma resposta dita duas vezes.
    const r = detectLocations("6gjng7rpj");
    expect(r).toHaveLength(1);
    expect(r[0].lat).toBeCloseTo(-26.919, 2);
  });

  it("detectLocation continua devolvendo a melhor — os chamadores dependem disso", () => {
    expect(detectLocation("38HQ+J3")?.format).toContain("Itajaí");
    expect(detectLocation("")).toBeNull();
    expect(detectLocation("bom dia")).toBeNull();
  });

  it("uma coordenada comum tem uma leitura só, e não ganha ruído", () => {
    const r = detectLocations("-26.9194, -49.0661");
    expect(r).toHaveLength(1);
    expect(r[0].format).toContain("Graus decimais");
  });
});
