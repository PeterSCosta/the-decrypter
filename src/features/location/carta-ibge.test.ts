import { describe, expect, it } from "vitest";
import { BLUMENAU, ITAJAI } from "./anchors";
import { cartaScaleLabel, decodeCartaIbge, decodeMiSheet, parseCartaIbge } from "./carta-ibge";
import { detectLocation } from "./formats";

/** O ponto está dentro da quadrícula cujo CENTRO foi devolvido? */
const contem = (code: string, alvo: { lat: number; lng: number }) => {
  const hit = decodeCartaIbge(code);
  expect(hit, code).not.toBeNull();
  const h = hit as NonNullable<typeof hit>;
  expect(Math.abs(h.lat - alvo.lat), `${code} lat`).toBeLessThanOrEqual(h.size[0] / 2);
  expect(Math.abs(h.lng - alvo.lng), `${code} lon`).toBeLessThanOrEqual(h.size[1] / 2);
  return h;
};

/**
 * Conferido ao contrário contra registro real do acervo IBGE: Mafra/SC sai
 * 'SG-22-Z-A-III-1', que é a nomenclatura publicada da folha "MAFRA
 * SG-22-Z-A-III-1 MI 2868-1"; e 'SG-22-Z-B' é a folha 1:250.000 Blumenau.
 */
const MAFRA = { lat: -26.1114, lng: -49.8054 };

describe("carta IBGE/DSG (articulação sistemática)", () => {
  it("SG-22-Z-B-IV-4-SE é a quadrícula de 7,5' que contém Blumenau", () => {
    const h = contem("SG-22-Z-B-IV-4-SE", BLUMENAU);
    expect(h.scale).toBe(25_000);
    // lat -27,000..-26,875 e lon -49,125..-49,000
    expect(h.lat).toBeCloseTo(-26.9375, 6);
    expect(h.lng).toBeCloseTo(-49.0625, 6);
    expect(h.size).toEqual([0.125, 0.125]);
  });

  it("SG-22-Z-B-V-4-SO é a de Itajaí", () => {
    const h = contem("SG-22-Z-B-V-4-SO", ITAJAI);
    expect(h.lat).toBeCloseTo(-26.9375, 6);
    expect(h.lng).toBeCloseTo(-48.6875, 6);
  });

  it("SG-22-Z-A-III-1 é a folha de Mafra (registro real do IBGE)", () => {
    const h = contem("SG-22-Z-A-III-1", MAFRA);
    expect(h.scale).toBe(50_000);
  });

  it("SG-22 sozinho é a folha da CIM: 4°×6° (era prometido na ficha e recusado)", () => {
    const h = contem("SG-22", BLUMENAU);
    expect(h.scale).toBe(1_000_000);
    // faixa G = 24–28°S, fuso 22 = -54° a -48°
    expect(h.lat).toBeCloseTo(-26, 9);
    expect(h.lng).toBeCloseTo(-51, 9);
    expect(h.size).toEqual([4, 6]);
    expect(h.sheet).toBe("SG-22");
    // e Mafra cai na mesma folha da CIM que Blumenau
    contem("SG-22", MAFRA);
  });

  it("parando no fuso, o gate é hemisfério + janela brasileira", () => {
    // dentro da janela: faixas NA/NB e SA..SI, fusos 18..26
    for (const s of ["SG-22", "SI-22", "NA-20", "NB-21", "SB-18", "SF-26", "SC-25"]) {
      expect(decodeCartaIbge(s), s).not.toBeNull();
    }
    // sem hemisfério explícito é rótulo genérico
    expect(parseCartaIbge("G-22")).toBeNull();
    expect(parseCartaIbge("B-12")).toBeNull();
    // fora da janela: era daqui que vinham os 59 falsos positivos medidos
    expect(parseCartaIbge("NF-12")).toBeNull(); // nota fiscal
    expect(parseCartaIbge("NR-18")).toBeNull(); // norma regulamentadora
    expect(parseCartaIbge("NR-10")).toBeNull();
    expect(parseCartaIbge("SJ-22")).toBeNull(); // faixa ao sul do Chuí
    expect(parseCartaIbge("SG-17")).toBeNull(); // fuso a oeste do Acre
    expect(parseCartaIbge("SG-27")).toBeNull(); // fuso a leste das ilhas
  });

  it("a janela só vale sem subdivisão — com ela, o mundo todo continua valendo", () => {
    // "NF-12" não é folha, mas "NF-12-Z" é: a cadeia já segura o gate sozinha
    expect(decodeCartaIbge("NF-12-Z")).not.toBeNull();
    expect(decodeCartaIbge("G-22-Z-B")).not.toBeNull(); // hemisfério opcional
    // "NG-22" (24–28°N) está fora do Brasil e para no gate; com subdivisão passa
    expect(parseCartaIbge("NG-22")).toBeNull();
    expect(decodeCartaIbge("NG-22-Z")?.lat).toBe(25);
    // e ao norte da janela o espelhamento continua valendo
    expect(decodeCartaIbge("NB-21")?.lat).toBe(6);
  });

  it("toda a cadeia de níveis contém o ponto (cada nível parte o anterior)", () => {
    const niveis: [string, number][] = [
      ["SG-22", 1_000_000],
      ["SG-22-Z", 500_000],
      ["SG-22-Z-B", 250_000],
      ["SG-22-Z-B-IV", 100_000],
      ["SG-22-Z-B-IV-4", 50_000],
      ["SG-22-Z-B-IV-4-SE", 25_000],
    ];
    let anterior = Number.POSITIVE_INFINITY;
    for (const [code, escala] of niveis) {
      const h = contem(code, BLUMENAU);
      expect(h.scale, code).toBe(escala);
      expect(h.size[0], code).toBeLessThan(anterior);
      anterior = h.size[0];
    }
  });

  it("o 1:100.000 é 3 colunas × 2 linhas (I..VI) — inverter erraria 30'", () => {
    // Blumenau é IV (linha de baixo, 1ª coluna) e Mafra é III (linha de cima,
    // 3ª coluna): as duas âncoras cobrem as duas linhas da numeração.
    const iv = decodeCartaIbge("SG-22-Z-B-IV") as { lat: number; lng: number };
    const i = decodeCartaIbge("SG-22-Z-B-I") as { lat: number; lng: number };
    const iii = decodeCartaIbge("SG-22-Z-B-III") as { lat: number; lng: number };
    expect(i.lat).toBeGreaterThan(iv.lat); // I acima de IV
    expect(i.lng).toBeCloseTo(iv.lng, 9); // mesma coluna
    expect(iii.lng).toBeGreaterThan(i.lng); // III mais a leste que I
    expect(iii.lat).toBeCloseTo(i.lat, 9); // mesma linha
  });

  it("o hemisfério pode ser omitido: dentro do Brasil assume-se Sul", () => {
    expect(parseCartaIbge("G-22-Z-B-IV-4-SE")).toEqual(parseCartaIbge("SG-22-Z-B-IV-4-SE"));
    expect(decodeCartaIbge("G-22-Z-B-IV-4-SE")?.sheet).toBe("SG-22-Z-B-IV-4-SE");
    // com N explícito, o mesmo código espelha para o hemisfério norte
    const norte = decodeCartaIbge("NG-22-Z-B-IV-4-SE");
    expect(norte?.lat).toBeGreaterThan(0);
  });

  describe("gate anti-ruído", () => {
    it("sem os níveis de subdivisão, só passa dentro da articulação brasileira", () => {
      // era aqui que "SG-22" morria junto com o ruído; agora a linha é outra
      expect(parseCartaIbge("B-12")).toBeNull();
      expect(parseCartaIbge("A-4")).toBeNull();
      expect(parseCartaIbge("G-22")).toBeNull();
      expect(parseCartaIbge("SG-22")).not.toBeNull();
    });

    it("recusa vocabulário fora das listas fechadas e fuso inválido", () => {
      expect(parseCartaIbge("SG-22-W-B")).toBeNull(); // 1:500.000 só V/X/Y/Z
      expect(parseCartaIbge("SG-22-Z-E")).toBeNull(); // 1:250.000 só A–D
      expect(parseCartaIbge("SG-22-Z-B-VII")).toBeNull(); // 1:100.000 só I–VI
      expect(parseCartaIbge("SG-22-Z-B-IV-5")).toBeNull(); // 1:50.000 só 1–4
      expect(parseCartaIbge("SG-22-Z-B-IV-4-NW")).toBeNull(); // em pt-BR é NO
      expect(parseCartaIbge("SG-61-Z")).toBeNull(); // fuso 61 não existe
      expect(parseCartaIbge("SZ-22-Z")).toBeNull(); // faixa Z > V
    });

    it("não dispara em CEP, CPF, telefone, data, coordenada nem prosa", () => {
      for (const s of [
        "89010-000",
        "111.444.777-35",
        "47-3231-3000",
        "2026-08-14",
        "-26.9194, -49.0661",
        "SG-22-Z-B-IV-4-SE-XX",
        "ENGENHEIRO-FORAGIDO",
      ]) {
        expect(parseCartaIbge(s), s).toBeNull();
      }
    });
  });

  describe("separadores — legenda escaneada, OCR e planilha não usam hífen", () => {
    const canonico = decodeCartaIbge("SG-22-Z-A-III-1");

    it("ponto, espaço, barra, sublinhado e mistura caem na mesma folha", () => {
      for (const s of [
        "SG.22.Z.A.III.1",
        "SG 22 Z A III 1",
        "SG/22/Z/A/III/1",
        "SG_22_Z_A_III_1",
        "SG-22 . Z/A_III 1",
        "  sg-22-z-a-iii-1  ",
        "SG--22--Z--A--III--1",
      ]) {
        expect(decodeCartaIbge(s), s).toEqual(canonico);
      }
    });

    it("a nomenclatura devolvida sai canônica, com hífen", () => {
      expect(decodeCartaIbge("SG.22.Z.B")?.sheet).toBe("SG-22-Z-B");
      expect(decodeCartaIbge("G 22 Z B IV 4 SE")?.sheet).toBe("SG-22-Z-B-IV-4-SE");
    });

    it("afrouxar o separador não abre vaga: o gate é a cadeia de vocabulários", () => {
      for (const s of [
        "89.010.000",
        "111 444 777 35",
        "47 3231 3000",
        "2026.08.14",
        "-26.9194, -49.0661",
        "12/03/2026",
        "A.4",
        "B/12",
        "G.22",
        "NF 12", // nota fiscal
        "NR 18", // norma regulamentadora
        "SC 108", // rodovia estadual: três dígitos não entram no fuso
      ]) {
        expect(parseCartaIbge(s), s).toBeNull();
      }
    });
  });

  /**
   * O MI é a outra identificação da MESMA folha ("MAFRA SG-22-Z-A-III-1 MI
   * 2868-1"). A conversão MI → nomenclatura não está publicada — é tabela de
   * ~3.036 folhas, e a numeração segue o contorno do país (SG-22-Z-A-III=2868,
   * SG-22-Z-B-V=2882, SG-22-Z-D-V=2909 não fecham com linha de comprimento
   * fixo). Então aqui só se RECONHECE; inventar coordenada seria resposta
   * errada com cara de certa.
   */
  describe("número MI (Mapa Índice) — reconhece, não converte", () => {
    it("lê o número e os sufixos, e nunca devolve coordenada", () => {
      const h = decodeMiSheet("MI 2868-1");
      expect(h?.mi).toBe(2868);
      expect(h?.sub50).toBe(1);
      expect(h?.sub25).toBeUndefined();
      expect(h?.label).toBe("MI 2868-1");
      expect(h).not.toHaveProperty("lat");
      // e o caminho de coordenada segue recusando
      expect(parseCartaIbge("MI 2868-1")).toBeNull();
      expect(detectLocation("MI 2868-1")).toBeNull();
    });

    it("o sufixo é o que fecha a escala (o mesmo dígito/quadrante da nomenclatura)", () => {
      expect(decodeMiSheet("MI 2868")?.scales).toEqual([100_000]);
      expect(decodeMiSheet("MI 2882-3")?.scales).toEqual([50_000]);
      expect(decodeMiSheet("MI-2214-2-NO")?.scales).toEqual([25_000]);
      expect(decodeMiSheet("MI-2214-2-NO")?.sub25).toBe("NO");
    });

    it("número puro pequeno é ambíguo: o acervo também numera o 1:250.000", () => {
      // "SERRA DOS CARAJÁS SB-22-Z-A MI 198" é 1:250.000; a série 1:100.000
      // também tem uma folha 198. Sem sufixo, não dá para escolher.
      expect(decodeMiSheet("MI 198")?.scales).toEqual([250_000, 100_000]);
      expect(decodeMiSheet("MI 2868")?.scales).toEqual([100_000]);
    });

    it("aceita a pontuação frouxa do OCR, mas exige o 'MI' como assinatura", () => {
      const alvo = decodeMiSheet("MI 2868-1");
      for (const s of ["MI-2868-1", "MI2868-1", "mi. 2868 . 1", "  MI/2868/1  "]) {
        expect(decodeMiSheet(s), s).toEqual(alvo);
      }
      // sem o "MI", "2868-1" é ano-lote-placar-qualquer-coisa
      expect(decodeMiSheet("2868-1")).toBeNull();
      expect(decodeMiSheet("2868")).toBeNull();
    });

    it("recusa número fora da faixa das folhas e sufixo inválido", () => {
      expect(decodeMiSheet("MI 0")).toBeNull();
      expect(decodeMiSheet("MI 9999")).toBeNull();
      expect(decodeMiSheet("MI 3500")).toBeNull();
      expect(decodeMiSheet("MI 2868-5")).toBeNull(); // 1:50.000 só 1–4
      expect(decodeMiSheet("MI 2868-1-NW")).toBeNull(); // em pt-BR é NO
      expect(decodeMiSheet("MIR 198")).toBeNull(); // outra sigla, outro índice
    });

    it("a nomenclatura e o MI não se confundem no mesmo passe", () => {
      expect(decodeMiSheet("SG-22-Z-A-III-1")).toBeNull();
      expect(decodeCartaIbge("MI 2868-1")).toBeNull();
    });
  });

  it("detectLocation nomeia o formato com a escala", () => {
    expect(detectLocation("SG-22-Z-B-IV-4-SE")?.format).toBe("Carta IBGE/DSG · 1:25.000");
    expect(detectLocation("SG-22-Z-B")?.format).toBe("Carta IBGE/DSG · 1:250.000");
  });

  it("cartaScaleLabel usa o ponto de milhar do pt-BR", () => {
    expect(cartaScaleLabel(25_000)).toBe("1:25.000");
    expect(cartaScaleLabel(1_000_000)).toBe("1:1.000.000");
  });
});
