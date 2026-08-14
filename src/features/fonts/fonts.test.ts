import { describe, expect, it } from "vitest";
import {
  DETECTION_FALLBACKS,
  GRID_BANDS,
  SYMBOL_FONTS,
  SYMBOL_GREEK,
  type WidthProbe,
  copyableFor,
  findSymbolFont,
  fontShorthand,
  greekFor,
  greekToLatin,
  latinToGreek,
  looksGreek,
  referenceCells,
  statusFromProbes,
} from "./fonts";

const SYMBOL = findSymbolFont("symbol")!;
const WINGDINGS = findSymbolFont("wingdings")!;

describe("catálogo de fontes de símbolo", () => {
  it("não repete id e toda família já vem citada para CSS", () => {
    const ids = SYMBOL_FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of SYMBOL_FONTS) expect(f.family.startsWith('"')).toBe(true);
  });

  it("só a Symbol promete equivalente Unicode — dingbat não tem tabela honesta", () => {
    const comEquivalente = SYMBOL_FONTS.filter((f) => f.hasUnicodeEquivalent).map((f) => f.id);
    expect(comEquivalente).toEqual(["symbol"]);
  });

  it("toda fonte diz de onde vem, que é o que explica a ausência na máquina", () => {
    for (const f of SYMBOL_FONTS) expect(f.source.length).toBeGreaterThan(10);
  });
});

describe("detecção de disponibilidade (a parte pura)", () => {
  const probes = (pares: [number, number][]): WidthProbe[] =>
    pares.map(([base, withFont], i) => ({
      fallback: DETECTION_FALLBACKS[i] ?? "monospace",
      base,
      withFont,
    }));

  it("larguras iguais = o navegador caiu no fallback = fonte ausente", () => {
    expect(
      statusFromProbes(
        probes([
          [420.5, 420.5],
          [400, 400],
          [380, 380],
        ]),
      ),
    ).toBe("ausente");
  });

  it("uma largura divergente já basta para dizer instalada", () => {
    expect(
      statusFromProbes(
        probes([
          [420.5, 420.5],
          [400, 331.25],
          [380, 380],
        ]),
      ),
    ).toBe("disponivel");
  });

  it("sem sonda nenhuma o veredito é 'não deu para verificar', nunca 'ausente'", () => {
    // Em jsdom o canvas não devolve contexto: a ferramenta admite em vez de mentir.
    expect(statusFromProbes([])).toBe("indeterminado");
    expect(statusFromProbes(probes([[Number.NaN, Number.NaN]]))).toBe("indeterminado");
  });

  it("diferença de subpixel não conta como fonte instalada", () => {
    expect(statusFromProbes(probes([[400, 400.01]]))).toBe("ausente");
  });

  it("o shorthand do canvas põe o tamanho antes da família", () => {
    expect(fontShorthand(SYMBOL.family, 72)).toBe('72px "Symbol"');
  });
});

describe("grade de referência", () => {
  it("são as três faixas que se casam com a imagem: A–Z, a–z e 0–9", () => {
    expect(GRID_BANDS.map((b) => b.id)).toEqual(["maiusculas", "minusculas", "digitos"]);
    expect(GRID_BANDS.map((b) => b.chars.length)).toEqual([26, 26, 10]);
    expect(GRID_BANDS[0].chars.join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    expect(GRID_BANDS[1].chars.join("")).toBe("abcdefghijklmnopqrstuvwxyz");
    expect(GRID_BANDS[2].chars.join("")).toBe("0123456789");
  });

  it("na Symbol cada célula carrega a letra grega de verdade", () => {
    const cells = referenceCells(SYMBOL, GRID_BANDS[0]);
    expect(cells[0]).toMatchObject({ char: "A", equivalent: "Α", name: "alfa" });
    expect(cells[22]).toMatchObject({ char: "W", equivalent: "Ω", name: "ômega" });
  });

  it("os dígitos da Symbol não viram grego — a fonte só troca as letras", () => {
    const cells = referenceCells(SYMBOL, GRID_BANDS[2]);
    expect(cells.every((c) => c.equivalent === null)).toBe(true);
  });

  it("na Wingdings a célula não inventa equivalente: o glifo só existe na fonte", () => {
    const cells = referenceCells(WINGDINGS, GRID_BANDS[0]);
    expect(cells.every((c) => c.equivalent === null && c.name === null)).toBe(true);
    expect(cells.map((c) => c.char).join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });
});

describe("Symbol — o encoding grego da Adobe", () => {
  it("cobre A–Z e a–z sem repetir tecla nem glifo", () => {
    expect(SYMBOL_GREEK).toHaveLength(52);
    expect(new Set(SYMBOL_GREEK.map((m) => m.latin)).size).toBe(52);
    expect(new Set(SYMBOL_GREEK.map((m) => m.greek)).size).toBe(52);
  });

  it("as teclas que não são o som óbvio: C=Χ, Q=Θ, W=Ω, X=Ξ, Y=Ψ", () => {
    expect(latinToGreek("CQWXY")).toBe("ΧΘΩΞΨ");
  });

  it("J, V, j e v são variantes de forma — é o erro clássico de quem transcreve", () => {
    expect(latinToGreek("JVjv")).toBe("ϑςϕϖ");
    for (const k of ["J", "V", "j", "v"]) expect(greekFor(k)?.quirk).toBeTruthy();
  });

  it("digitar SOMA na Symbol mostra ΣΟΜΑ", () => {
    expect(latinToGreek("SOMA")).toBe("ΣΟΜΑ");
  });

  it("o que não é letra passa intacto: dígito, espaço, pontuação e acento", () => {
    // O `v` sai ϖ (pi variante) e o `j` sai ϕ: as duas armadilhas no mesmo texto.
    expect(latinToGreek("Prova 22 · Itajaí")).toBe("Προϖα 22 · Ιταϕαí");
  });

  it("o caminho de volta devolve as teclas que foram digitadas", () => {
    for (const m of SYMBOL_GREEK) expect(greekToLatin(m.greek)).toBe(m.latin);
    expect(greekToLatin(latinToGreek("Itajai"))).toBe("Itajai");
  });

  it("grego copiado da web vem acentuado — o acento sai antes do mapa", () => {
    // ΜΑΘΗΜΑ com tônico no Α; a Symbol não tem acento, então ele é ruído.
    expect(greekToLatin("Αθήνα")).toBe("Aqhna");
  });

  it("formas alternativas que a Symbol não usa ainda assim são reconhecidas", () => {
    expect(greekToLatin("ϱϵ")).toBe("re");
  });

  it("a direção do painel se decide pelo conteúdo, não por botão", () => {
    expect(looksGreek("ΣΟΜΑ")).toBe(true);
    expect(looksGreek("SOMA")).toBe(false);
    expect(looksGreek("")).toBe(false);
    expect(looksGreek("22 · ---")).toBe(false);
    // Meia dúzia de letras latinas no meio do grego não invertem a leitura.
    expect(looksGreek("prova ΣΟΜΑ ΔΕΛΤΑ")).toBe(true);
  });
});

describe("o que o botão de copiar entrega", () => {
  it("na Symbol copia o grego, que é caractere de verdade", () => {
    expect(copyableFor(SYMBOL, "SOMA")).toBe("ΣΟΜΑ");
  });

  it("na Wingdings copia as LETRAS — o desenho não é caractere e não se copia", () => {
    expect(copyableFor(WINGDINGS, "SOMA")).toBe("SOMA");
  });
});
