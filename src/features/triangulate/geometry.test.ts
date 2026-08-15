import { describe, expect, it } from "vitest";
import {
  centroide,
  circuncentro,
  distancia,
  formataDistancia,
  incentro,
  medianaGeometrica,
  ordemMaisCurta,
  rosaDosVentos,
  rota,
  rumo,
  triangulo,
} from "./geometry";

const P = (lat: number, lng: number) => ({ lat, lng });

describe("distancia", () => {
  it("bate com a distância conhecida entre duas pontes do centro", () => {
    // Ponte Adolfo Konder → Ponte Aldo Pereira de Andrade (Ponte de Ferro).
    const d = distancia(P(-26.91822, -49.06528), P(-26.91296, -49.06746));
    expect(d).toBeGreaterThan(600);
    expect(d).toBeLessThan(660);
  });

  it("é zero para o mesmo ponto", () => {
    expect(distancia(P(-26.9, -49.06), P(-26.9, -49.06))).toBe(0);
  });

  it("um grau de latitude são ~111 km", () => {
    expect(distancia(P(0, 0), P(1, 0))).toBeCloseTo(111195, -2);
  });
});

describe("rumo", () => {
  it("norte é 0, leste é 90", () => {
    expect(rumo(P(-26.9, -49.06), P(-26.8, -49.06))).toBeCloseTo(0, 1);
    expect(rumo(P(-26.9, -49.06), P(-26.9, -48.96))).toBeCloseTo(90, 1);
  });

  it("traduz para a rosa dos ventos", () => {
    expect(rosaDosVentos(0)).toBe("N");
    expect(rosaDosVentos(45)).toBe("NE");
    expect(rosaDosVentos(180)).toBe("S");
    expect(rosaDosVentos(315)).toBe("NO");
    expect(rosaDosVentos(359)).toBe("N");
  });
});

describe("centroide", () => {
  it("é a média em casos simétricos", () => {
    const c = centroide([P(-26.92, -49.08), P(-26.92, -49.06), P(-26.9, -49.08), P(-26.9, -49.06)]);
    expect(c?.lat).toBeCloseTo(-26.91, 5);
    expect(c?.lng).toBeCloseTo(-49.07, 5);
  });

  it("é o centro na esfera, não a média das coordenadas", () => {
    // Num quadrado de 2° a soma vetorial 3D já se afasta da média aritmética
    // (uns 17 m). Isso é a resposta certa — a média de lat/lng não é um ponto
    // médio sobre a esfera —, e a diferença some na escala de uma cidade.
    const c = centroide([P(0, 0), P(0, 2), P(2, 0), P(2, 2)]);
    expect(c?.lat).toBeCloseTo(1, 3);
    expect(c?.lat).not.toBe(1);
  });

  it("atravessa o antimeridiano sem cair no meio do Pacífico", () => {
    const c = centroide([P(0, 179), P(0, -179)]);
    expect(Math.abs(c?.lng ?? 0)).toBeCloseTo(180, 4);
  });

  it("devolve null sem pontos", () => {
    expect(centroide([])).toBeNull();
  });
});

describe("circuncentro", () => {
  it("fica à mesma distância dos três vértices", () => {
    const a = P(-26.92, -49.07);
    const b = P(-26.9, -49.05);
    const c = P(-26.88, -49.09);
    const cc = circuncentro(a, b, c);
    if (!cc) throw new Error("esperava um circuncentro");
    const [da, db, dc] = [distancia(cc, a), distancia(cc, b), distancia(cc, c)];
    expect(Math.abs(da - db)).toBeLessThan(1);
    expect(Math.abs(da - dc)).toBeLessThan(1);
  });

  it("não existe para três pontos alinhados", () => {
    expect(circuncentro(P(-26.9, -49.1), P(-26.9, -49.05), P(-26.9, -49.0))).toBeNull();
  });

  it("não existe quando dois pontos coincidem", () => {
    expect(circuncentro(P(-26.9, -49.1), P(-26.9, -49.1), P(-26.88, -49.05))).toBeNull();
  });
});

describe("incentro", () => {
  it("fica dentro do triângulo", () => {
    const a = P(-26.92, -49.07);
    const b = P(-26.9, -49.05);
    const c = P(-26.88, -49.09);
    const i = incentro(a, b, c);
    if (!i) throw new Error("esperava um incentro");
    expect(i.lat).toBeGreaterThan(-26.92);
    expect(i.lat).toBeLessThan(-26.88);
    expect(i.lng).toBeGreaterThan(-49.09);
    expect(i.lng).toBeLessThan(-49.05);
  });
});

describe("medianaGeometrica", () => {
  it("não é arrastada por um ponto distante como o centroide é", () => {
    // Três pontos juntos no centro + um lá na Vila Itoupava.
    const perto = [P(-26.915, -49.065), P(-26.916, -49.066), P(-26.914, -49.064)];
    const longe = P(-26.65, -49.05);
    const todos = [...perto, longe];
    const med = medianaGeometrica(todos);
    const cen = centroide(todos);
    if (!med || !cen) throw new Error("esperava os dois centros");
    // A mediana fica praticamente sobre o trio; o centroide sobe uns 7 km.
    expect(distancia(med, perto[0])).toBeLessThan(300);
    expect(distancia(cen, perto[0])).toBeGreaterThan(5000);
  });

  it("com dois pontos cai no meio", () => {
    const m = medianaGeometrica([P(-26.9, -49.1), P(-26.9, -49.0)]);
    expect(m?.lng).toBeCloseTo(-49.05, 3);
  });
});

describe("triangulo", () => {
  it("soma 180° nos ângulos internos", () => {
    const t = triangulo(P(-26.92, -49.07), P(-26.9, -49.05), P(-26.88, -49.09));
    if (!t) throw new Error("esperava um triângulo");
    expect(t.angulos[0] + t.angulos[1] + t.angulos[2]).toBeCloseTo(180, 3);
  });

  it("mede a área de um triângulo retângulo conhecido", () => {
    // ~1,11 km no eixo N-S por ~1,11 km no eixo L-O na latitude 0.
    const t = triangulo(P(0, 0), P(0.01, 0), P(0, 0.01));
    if (!t) throw new Error("esperava um triângulo");
    expect(t.area).toBeCloseTo((1111.95 * 1111.95) / 2, -4);
  });

  it("é null quando dois pontos coincidem", () => {
    expect(triangulo(P(-26.9, -49.1), P(-26.9, -49.1), P(-26.88, -49.05))).toBeNull();
  });
});

describe("rota", () => {
  it("mede cada perna e o total na ordem dada", () => {
    const r = rota([P(0, 0), P(0.01, 0), P(0.02, 0)]);
    expect(r.pernas).toHaveLength(2);
    expect(r.pernas[0].direcao).toBe("N");
    expect(r.total).toBeCloseTo(r.pernas[0].metros + r.pernas[1].metros, 6);
  });

  it("o total fechado inclui a volta ao primeiro ponto", () => {
    const pts = [P(0, 0), P(0.01, 0), P(0.01, 0.01)];
    const r = rota(pts);
    expect(r.totalFechado).toBeCloseTo(r.total + distancia(pts[2], pts[0]), 6);
  });

  it("sem pontos suficientes não tem perna alguma", () => {
    expect(rota([P(0, 0)]).pernas).toHaveLength(0);
  });
});

describe("ordemMaisCurta", () => {
  it("desfaz o zigue-zague mantendo o ponto de partida", () => {
    // Quatro cantos de um quadrado, entrados em ordem cruzada.
    const pts = [P(0, 0), P(0.01, 0.01), P(0, 0.01), P(0.01, 0)];
    const o = ordemMaisCurta(pts);
    expect(o[0]).toBe(0);
    expect([...o].sort()).toEqual([0, 1, 2, 3]);
    const antes = rota(pts).total;
    const depois = rota(o.map((i) => pts[i])).total;
    expect(depois).toBeLessThan(antes);
  });

  it("não mexe em menos de três pontos", () => {
    expect(ordemMaisCurta([P(0, 0), P(1, 1)])).toEqual([0, 1]);
  });
});

describe("formataDistancia", () => {
  it("troca para km acima de 1000 m", () => {
    expect(formataDistancia(820)).toBe("820 m");
    expect(formataDistancia(1400)).toBe("1,4 km");
  });
});
