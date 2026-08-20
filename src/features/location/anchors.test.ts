import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANCHORS,
  BLUMENAU,
  FUSO_DO_VALE,
  ITAJAI,
  VALE_BBOX,
  ZONA_UTM_DO_VALE,
  anchorForPoint,
  inBBox,
  scopeLabel,
} from "./anchors";
import {
  decodeGeohashLocal,
  decodePlusCode,
  decodePlusCodeLocal,
  encodeGeohash,
  geohashPrefixes,
  parseUTMLocal,
} from "./formats";

describe("âncoras locais", () => {
  it("o centro de cada cidade cai na própria caixa e no Vale, e não na caixa da outra", () => {
    expect(inBBox(BLUMENAU, BLUMENAU.bbox)).toBe(true);
    expect(inBBox(ITAJAI, ITAJAI.bbox)).toBe(true);
    expect(inBBox(BLUMENAU, VALE_BBOX)).toBe(true);
    expect(inBBox(ITAJAI, VALE_BBOX)).toBe(true);
    // caixas justas não se sobrepõem (discriminam as cidades)
    expect(inBBox(BLUMENAU, ITAJAI.bbox)).toBe(false);
    expect(inBBox(ITAJAI, BLUMENAU.bbox)).toBe(false);
  });

  it("o Plus Code de exemplo de cada cidade decodifica dentro da própria caixa", () => {
    for (const a of ANCHORS) {
      const pt = decodePlusCode(a.plusExample);
      expect(pt, `${a.name}: ${a.plusExample}`).not.toBeNull();
      expect(inBBox(pt!, a.bbox), `${a.name} dentro da caixa`).toBe(true);
    }
  });

  it("anchorForPoint / scopeLabel identificam a cidade", () => {
    expect(anchorForPoint(BLUMENAU)?.name).toBe("Blumenau");
    expect(anchorForPoint(ITAJAI)?.name).toBe("Itajaí");
    expect(anchorForPoint({ lat: 0, lng: 0 })).toBeNull();
    expect(scopeLabel(BLUMENAU)).toBe("Blumenau");
    // No vão ENTRE as caixas → "Vale do Itajaí", não cidade específica.
    //
    // O vão mudou de lugar quando as caixas foram corrigidas para conter os
    // municípios de verdade: Itajaí passou a ir até −48,877 (para alcançar
    // Laranjeiras) e Blumenau começa em −48,95. O ponto antigo do teste,
    // −48,87, HOJE É ITAJAÍ — e é assim que tem de ser.
    expect(scopeLabel({ lat: -26.9, lng: -48.91 })).toBe("Vale do Itajaí");
    expect(scopeLabel({ lat: -26.9, lng: -48.87 })).toBe("Itajaí");
  });
});

describe("atalhos de cauda local", () => {
  it("Plus Code curto recupera a cidade pelo prefixo (585G Blumenau / 585H Itajaí)", () => {
    const blu = decodePlusCodeLocal("3WJM+6H");
    expect(blu?.anchor).toBe("Blumenau");
    expect(blu && inBBox(blu, BLUMENAU.bbox)).toBe(true);

    const ita = decodePlusCodeLocal("38RQ+V7");
    expect(ita?.anchor).toBe("Itajaí");
    expect(ita && inBBox(ita, ITAJAI.bbox)).toBe(true);
  });

  it("Plus Code já completo (8 antes do +) não é tratado como cauda local", () => {
    expect(decodePlusCodeLocal("585G3WJM+6H")).toBeNull();
  });

  it("cauda de Geohash recupera a cidade pelo prefixo regional", () => {
    // "6gjng7rpj" é Blumenau; a cauda "g7rpj" deve produzir uma leitura lá.
    const hits = decodeGeohashLocal("g7rpj");
    expect(hits.some((h) => h.anchor === "Blumenau")).toBe(true);
    for (const h of hits) {
      const a = h.anchor === "Blumenau" ? BLUMENAU.bbox : ITAJAI.bbox;
      expect(inBBox(h, a)).toBe(true);
    }
  });

  /**
   * A REGRESSÃO QUE ESTE TESTE PRENDE
   *
   * A cauda de geohash antepunha UM prefixo por cidade e parava no primeiro
   * acerto. Blumenau se parte em quatro células, então em 62,6% dos pontos a
   * bancada devolvia a leitura de OUTRA célula — dentro da caixa, com nota, e
   * com 27 km de erro médio. Zero rejeição: ela nunca calava.
   *
   * Este teste refaz a conta no ponto que o antigo `geohashCity` não alcança.
   */
  it("cauda de Geohash não perde o ponto que cai fora da célula declarada", () => {
    // Norte de Blumenau — célula "6gjp", não "6gjn".
    const alvo = { lat: -26.7183, lng: -49.2127 };
    const cauda = encodeGeohash(alvo.lat, alvo.lng, 8).slice(4);
    const hits = decodeGeohashLocal(cauda);

    const achou = hits.some(
      (h) => Math.abs(h.lat - alvo.lat) < 0.02 && Math.abs(h.lng - alvo.lng) < 0.02,
    );
    expect(achou).toBe(true);
  });

  it("os prefixos vêm da caixa, não de um literal — Blumenau não cabe em um só", () => {
    const p = geohashPrefixes(BLUMENAU.bbox);
    expect(p.length).toBeGreaterThan(1);
    expect(p).toContain("6gjn");
    expect(p).toContain("6gjp");
  });

  /**
   * A ambiguidade é IRREDUTÍVEL e o número está aqui para não ser esquecido:
   * a célula de 4 chars (~39 × 19,5 km) é MENOR que a caixa (52 × 26 km), então
   * a caixa não desempata. Se algum dia isto voltar a 1, alguém estreitou a
   * caixa ou trocou a precisão — e aí a leitura volta a mentir.
   */
  it("uma cauda de geohash não identifica ponto: sempre mais de uma leitura", () => {
    const hits = decodeGeohashLocal(encodeGeohash(-26.9, -49.07, 8).slice(4));
    expect(hits.length).toBeGreaterThan(1);
  });
});

/**
 * A caixa da âncora tem de conter o município — conferido contra o dado, não
 * contra a memória de quem escreveu o número.
 *
 * ── O QUE ISTO PRENDE ───────────────────────────────────────────────────────
 * A `bbox` é o VALIDADOR do atalho de cauda: código parcial só vira ponto se o
 * ponto reconstruído cair dentro. Quando ela é curta demais, o efeito não é
 * "não sei" — é a resposta ERRADA, porque sobra o Geohash global frouxo no fim
 * da cascata.
 *
 * Foi o que aconteceu com o Plus Code gabaritado da madrugada de 2024,
 * `25JR+P8` (Laranjeiras, Itajaí): a caixa parava 8 km a leste do bairro, os
 * dois ramos devolviam null, e a bancada respondia ANTÁRTIDA.
 *
 * Este teste refaz a medição a cada execução. Se o dado embarcado crescer para
 * fora da caixa — um bairro novo no cadastro, um CEP novo —, ele reprova aqui,
 * e não numa prova de madrugada.
 */
describe("a caixa contém o município", () => {
  const dentroDeMargem = (v: number, min: number, max: number) => v >= min && v <= max;

  it("os 84.539 lotes de Blumenau cabem na caixa de Blumenau", async () => {
    const lotes = JSON.parse(
      readFileSync(resolve(__dirname, "../../../seed-data/lotes-blumenau.json"), "utf8"),
    ) as { rows: (string | number | null)[][] };

    const fora = lotes.rows.filter((r) => {
      const [lat, lng] = [r[6], r[7]];
      if (typeof lat !== "number" || typeof lng !== "number") return false;
      return !inBBox({ lat, lng }, BLUMENAU.bbox);
    });
    expect(fora.length, `${fora.length} lotes fora da caixa de Blumenau`).toBe(0);
  });

  it("o código gabaritado de 2024 resolve — era o teste que faltava", () => {
    // `PLANO-2026-08.md` previa estes códigos como "os casos de regressão que
    // faltam para provar que o F2 funcionou". Antes desta caixa, reprovavam.
    const laranjeiras = { lat: -26.968187, lng: -48.809188 };
    expect(inBBox(laranjeiras, ITAJAI.bbox), "25JR+P8 caiu fora de Itajaí").toBe(true);

    const blumenauCentro = { lat: -26.9194, lng: -49.0661 };
    expect(inBBox(blumenauCentro, BLUMENAU.bbox)).toBe(true);
  });

  it("as duas caixas continuam sem se tocar — senão o atalho não sabe qual cidade", () => {
    const separadas =
      BLUMENAU.bbox.lonMax <= ITAJAI.bbox.lonMin || ITAJAI.bbox.lonMax <= BLUMENAU.bbox.lonMin;
    expect(separadas, "as caixas se sobrepõem: a atribuição de cidade vira sorteio").toBe(true);
    expect(dentroDeMargem(BLUMENAU.lat, BLUMENAU.bbox.latMin, BLUMENAU.bbox.latMax)).toBe(true);
    expect(dentroDeMargem(ITAJAI.lat, ITAJAI.bbox.latMin, ITAJAI.bbox.latMax)).toBe(true);
  });
});

/**
 * A CAUDA DE UTM — o oposto exato da cauda de geohash.
 *
 * A de geohash não valida nada porque a célula do prefixo é MENOR que a caixa
 * da cidade. A de UTM valida com folga porque a célula do fuso 22J tem
 * 590 × 885 km contra os 89 × 89 km da caixa do Vale — 66 vezes maior.
 */
describe("cauda de UTM", () => {
  it("lê o par E/N sem o fuso e cai em Blumenau", () => {
    const p = parseUTMLocal("692000 7021000");
    expect(p).toBeTruthy();
    expect(p && inBBox(p, BLUMENAU.bbox)).toBe(true);
  });

  it("aceita as formas que uma prova escreve", () => {
    for (const s of [
      "692000 7021000",
      "692000E 7021000N",
      "692000, 7021000",
      " 692000  7021000 ",
    ]) {
      expect(parseUTMLocal(s), s).toBeTruthy();
    }
  });

  it("recusa o que não tem a forma — seis dígitos e sete, nessa ordem", () => {
    for (const s of ["69200 7021000", "692000 702100", "692000", "abc def", "6920000 7021000"]) {
      expect(parseUTMLocal(s), s).toBeNull();
    }
  });

  /**
   * A rejeição é o número que autoriza o atalho a existir. Medida sobre pares
   * sorteados dentro do próprio fuso 22J — o caso difícil, não sobre lixo.
   */
  it("rejeita mais de 95% dos pares válidos do fuso 22J", () => {
    let x = 88675123;
    const r = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
    const N = 60_000;
    let acende = 0;
    for (let i = 0; i < N; i++) {
      const e = Math.floor(166_000 + r() * (834_000 - 166_000));
      const n = Math.floor(6_400_000 + r() * (7_500_000 - 6_400_000));
      if (parseUTMLocal(`${e} ${n}`)) acende++;
    }
    // Medido em 300.000 pares: 1,06% acende, ou seja 98,94% de rejeição.
    expect(acende / N).toBeLessThan(0.05);
  });

  it("o fuso vem da âncora, não de um literal solto no código", () => {
    expect(ZONA_UTM_DO_VALE).toBe(BLUMENAU.utmZone);
    expect(FUSO_DO_VALE).toBe(22);
  });
});
