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

  it("g7rpj devolve as leituras do Vale E a Islândia, o Vale primeiro", () => {
    const r = detectLocations("g7rpj");
    // A cauda de geohash é ambígua: ela devolve 2-3 candidatos, todos no Vale.
    // Antes a bancada escolhia UM e o apresentava como resposta — e em 62,6%
    // dos pontos de Blumenau escolhia o errado, com 27 km de erro médio.
    const locais = r.filter((x) => x.format.includes("assumindo"));
    expect(locais.length).toBeGreaterThan(1);
    expect(locais.every((x) => x.format.includes("de "))).toBe(true);

    // O ponto verdadeiro de `6gjng7rpj` continua entre eles, e em cima.
    expect(r[0].format).toContain("Blumenau");
    expect(r[0].lat).toBeCloseTo(-26.919, 2);

    // E a de longe fica, embaixo — a regra da casa não apaga leitura distante.
    const islandia = r.find((x) => x.format === "Geohash");
    expect(islandia?.lat).toBeCloseTo(64.53, 1);
    expect(r.indexOf(islandia!)).toBeGreaterThan(r.indexOf(locais.at(-1)!));
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

  it("o mesmo ponto não aparece duas vezes no fan-out", () => {
    // ── A REGRESSÃO QUE ISTO PRENDE ─────────────────────────────────────────
    // Ao pôr os atalhos locais na cascata (para a ABA enxergá-los), eles
    // passaram a ter DOIS emissores: o decoder `location`, que lê a cascata, e
    // o `local-geocode`, que lia as mesmas funções direto. Resultado na tela,
    // relatado pelo dono com print: `38HQ+J3` saindo duas vezes, mesma
    // coordenada, cards #1 e #2.
    //
    // O `local-geocode` foi absorvido. Este teste garante que ninguém
    // ressuscite o segundo emissor sem perceber — e o motor NÃO pegaria, porque
    // ele deduplica por texto de saída, e os dois cards tinham textos
    // diferentes para o mesmo lugar.
    for (const entrada of ["38HQ+J3", "g7rpj", "3WJM+6H", "MD2005", "GR3221221631"]) {
      const vistos = new Map<string, string[]>();
      for (const d of detectLocations(entrada)) {
        const chave = `${d.lat.toFixed(5)}|${d.lng.toFixed(5)}`;
        vistos.set(chave, [...(vistos.get(chave) ?? []), d.format]);
      }
      for (const [ponto, formatos] of vistos) {
        expect(
          formatos,
          `"${entrada}" repete o ponto ${ponto}: ${formatos.join(" / ")}`,
        ).toHaveLength(1);
      }
    }
  });

  it("entrada que não é coordenada não ganha card de lugar nenhum", () => {
    // O preço de mostrar TODAS as leituras seria pagar em ruído. Medido: não é.
    for (const inocente of ["89010200", "bom dia", "3722", "SGVsbG8="]) {
      expect(detectLocations(inocente), `"${inocente}" virou lugar`).toEqual([]);
    }
  });
});
