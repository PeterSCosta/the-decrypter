import { describe, expect, it } from "vitest";
import { detectLocation } from "./formats";
import { detectMapcode, resolveMapcode } from "./mapcode";

// Âncora verídica: GIA-2026, prova 08 "Fragmentos do Mundo". O acróstico das
// iniciais (Mistérios/Alguns/Pistas/Certas/O que/Dizem/E se) entrega MAPCODE, e
// o código do enunciado, `2JF.5R`, cai na Prefeitura de Blumenau — a resposta da
// prova é PREFEITURA.
// Fonte: acervo/gia-2026/gia-08-fragmentos-do-mundo/texto/{enunciado,resolucao}.md
const PREFEITURA = { lat: -26.913966, lng: -49.069158 };

const near = (got: { lat: number; lng: number }, expected: typeof PREFEITURA, tol = 1e-5) => {
  expect(Math.abs(got.lat - expected.lat)).toBeLessThan(tol);
  expect(Math.abs(got.lng - expected.lng)).toBeLessThan(tol);
};

describe("detectMapcode (síncrono, sem lib)", () => {
  it("reconhece o código da GIA-08", () => {
    expect(detectMapcode("2JF.5R")).toEqual({ code: "2JF.5R", territory: null, full: "2JF.5R" });
  });

  it("aceita minúsculas e espaço em volta", () => {
    expect(detectMapcode("  2jf.5r ")?.code).toBe("2JF.5R");
  });

  it("separa o território explícito e normaliza o traço", () => {
    expect(detectMapcode("BR_SC 2JF.5R")).toEqual({
      code: "2JF.5R",
      territory: "BR-SC",
      full: "BR-SC 2JF.5R",
    });
  });

  it("aceita a extensão de precisão", () => {
    expect(detectMapcode("2JF.5R-K3031422")?.code).toBe("2JF.5R-K3031422");
  });

  it("aceita o código internacional (5+4), mesmo sem dígito", () => {
    expect(detectMapcode("VHXGB.1J9J")?.code).toBe("VHXGB.1J9J");
  });

  // O portão contra ruído — "X.Y" é forma banal demais para passar batido.
  it.each([
    ["12.34", "só dígitos não é mapcode"],
    ["3.14159", "sufixo longo demais"],
    ["app.js", "sem dígito, sem território, forma curta"],
    ["casa.rua", "palavra com palavra"],
    ["index.php", "o I não existe no alfabeto do mapcode"],
    ["file.txt", "idem"],
    ["cuidou.prol.loja", "what3words tem três partes"],
    ["68130.89.91.15.12", "GeoTude tem mais de um ponto"],
    ["585G3WJM+6H", "Plus Code usa +, não ponto"],
    ["-26.9906, -48.6356", "par de coordenadas"],
  ])("recusa %j (%s)", (input) => {
    expect(detectMapcode(input)).toBeNull();
  });

  it("não colide com os formatos síncronos de detectLocation", () => {
    expect(detectLocation("2JF.5R")).toBeNull();
  });
});

describe("resolveMapcode (assíncrono, lib sob demanda)", () => {
  it("2JF.5R cai na Prefeitura de Blumenau assumindo BR-SC", async () => {
    const r = await resolveMapcode("2JF.5R");
    expect(r).not.toBeNull();
    near(r as NonNullable<typeof r>, PREFEITURA);
    expect(r?.territory).toBe("BR-SC");
    expect(r?.territoryName).toBe("Santa Catarina");
    expect(r?.scope).toBe("vale");
    expect(r?.assumed).toBe(true);
    expect(r?.detail).toContain("assumindo BR-SC");
  });

  it("com o território na entrada, para de supor", async () => {
    const r = await resolveMapcode("BR-SC 2JF.5R");
    near(r as NonNullable<typeof r>, PREFEITURA);
    expect(r?.scope).toBe("explicito");
    expect(r?.assumed).toBe(false);
    expect(r?.detail).toBe("BR-SC (Santa Catarina)");
  });

  // A armadilha central: sem território, a lib LANÇA — e o mesmo código vale em
  // 467 dos 533 territórios. O número é a medida da ambiguidade que o card mostra.
  it("mede a ambiguidade do código em vez de escondê-la", async () => {
    const r = await resolveMapcode("2JF.5R");
    expect(r?.ambiguity).toBe(467);
    // outros estados brasileiros que também aceitam o código, como pistas
    expect(r?.alternatives.map((a) => a.territory)).toContain("BR-PR");
    expect(r?.alternatives.every((a) => a.territory !== "BR-SC")).toBe(true);
    // o filtro de Brasil é por nome exato: Barbados (BRB) e Brunei (BRN) fora
    expect(r?.alternatives.map((a) => a.territory)).not.toContain("BRN");
  });

  it("território errado na entrada não apaga o palpite que existe", async () => {
    const r = await resolveMapcode("ZZZ 2JF.5R");
    // "ZZZ" nem é território: a detecção segue, e a resolução cai no Vale.
    near(r as NonNullable<typeof r>, PREFEITURA);
    expect(r?.scope).toBe("vale");
  });

  it("código internacional decodifica sozinho, fora do Brasil", async () => {
    const r = await resolveMapcode("VHXGB.1J9J");
    expect(r?.scope).toBe("internacional");
    expect(r?.territory).toBe("AAA");
    near(r as NonNullable<typeof r>, { lat: 52.376504, lng: 4.908535 }, 1e-4);
  });

  it("devolve null quando não decodifica em lugar nenhum", async () => {
    expect(await resolveMapcode("22.33")).toBeNull(); // nem passa na detecção
    expect(await resolveMapcode("XX.XX")).toBeNull();
  });
});
