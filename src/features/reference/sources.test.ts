import { describe, expect, it } from "vitest";
import {
  SOURCES,
  SOURCE_STATUS_HINT,
  SOURCE_STATUS_LABEL,
  SOURCE_STATUS_ORDER,
  type SourceStatus,
  sourcesByStatus,
} from "./sources";

const byId = new Map(SOURCES.map((s) => [s.id, s]));
const get = (id: string) => {
  const s = byId.get(id);
  if (!s) throw new Error(`fonte ausente: ${id}`);
  return s;
};

describe("catálogo de bases", () => {
  it("todo campo obrigatório está preenchido e o id é um slug único", () => {
    const seen = new Set<string>();
    for (const s of SOURCES) {
      expect(s.id, `id de ${s.name}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(seen.has(s.id), `id repetido: ${s.id}`).toBe(false);
      seen.add(s.id);
      for (const [field, value] of [
        ["name", s.name],
        ["indexes", s.indexes],
        ["use", s.use],
        ["urlLabel", s.urlLabel],
      ] as const) {
        expect(value.trim(), `${s.id}.${field}`).not.toBe("");
      }
      expect(s.url, `${s.id}.url`).toMatch(/^https?:\/\//);
      // rótulo curto porque a Cola precisa caber em ~375 px
      expect(s.urlLabel.length, `${s.id}.urlLabel curto`).toBeLessThanOrEqual(40);
    }
  });

  it("toda base que não é aberta explica o que trava (o gate é o valor da ficha)", () => {
    for (const s of SOURCES) {
      if (s.status === "aberta") continue;
      expect(s.note?.trim(), `${s.id} sem nota de gate`).toBeTruthy();
    }
  });

  it("os selos são só os quatro previstos, e todos têm rótulo e legenda", () => {
    const allowed = new Set<SourceStatus>(SOURCE_STATUS_ORDER);
    expect(SOURCE_STATUS_ORDER).toEqual(["aberta", "consulta-manual", "bloqueada", "adiada"]);
    for (const status of SOURCE_STATUS_ORDER) {
      expect(SOURCE_STATUS_LABEL[status]).toBeTruthy();
      expect(SOURCE_STATUS_HINT[status]).toBeTruthy();
    }
    for (const s of SOURCES) expect(allowed.has(s.status), `${s.id}: ${s.status}`).toBe(true);
  });
});

describe("agrupamento por selo", () => {
  it("cobre todas as bases, na ordem dos selos e sem grupo vazio", () => {
    const groups = sourcesByStatus();
    expect(groups.flatMap((g) => g.items)).toHaveLength(SOURCES.length);
    expect(groups.map((g) => g.status)).toEqual(
      SOURCE_STATUS_ORDER.filter((st) => SOURCES.some((s) => s.status === st)),
    );
    for (const g of groups) {
      expect(g.items.length, `grupo ${g.status} vazio`).toBeGreaterThan(0);
      expect(g.label).toBe(SOURCE_STATUS_LABEL[g.status]);
    }
  });

  it("preserva a ordem interna de SOURCES dentro do grupo", () => {
    const abertas = sourcesByStatus().find((g) => g.status === "aberta");
    expect(abertas?.items.map((s) => s.id)).toEqual(
      SOURCES.filter((s) => s.status === "aberta").map((s) => s.id),
    );
  });

  it("uma lista filtrada não inventa grupo", () => {
    expect(sourcesByStatus([get("tse")]).map((g) => g.status)).toEqual(["consulta-manual"]);
  });
});

describe("âncoras do acervo", () => {
  // Provas conferidas em GIA-2026.md ("Códigos burocráticos e catálogos do
  // mundo real") e nas resoluções de cada prova.
  const EXPECTED: [id: string, anchors: string[]][] = [
    ["gs1", ["GIA-07"]],
    ["faber-castell", ["GIA-39"]],
    ["portal-covid-blumenau", ["GIA-12"]],
    ["cbmsc", ["GIA-23"]],
    ["cidade-iluminada", ["GIA-25"]],
    ["oktoberfest", ["GIA-33"]],
    ["tse", ["GIA-34"]],
    ["siatu-vm", ["GIA-20", "GIA-34"]],
    ["hathitrust", ["GIA-42"]],
    ["anatel-fique-ligado", ["ITC-2023"]],
  ];

  it.each(EXPECTED)("%s ancora em %s", (id, anchors) => {
    expect(get(id).anchors).toEqual(anchors);
  });

  it("toda âncora tem forma de prova do acervo", () => {
    for (const s of SOURCES) {
      for (const a of s.anchors ?? []) {
        expect(a, `${s.id}: ${a}`).toMatch(/^(GIA-\d{2}|ITC-\d{4})$/);
      }
    }
  });
});

describe("links oficiais conferidos na resolução da própria prova", () => {
  it("TSE aponta para o SIG Eleição citado na GIA-34", () => {
    expect(get("tse").url).toBe(
      "https://sig.tse.jus.br/ords/dwapr/r/seai/sig-eleicao-resultados/home",
    );
  });

  it("CBMSC aponta para a página de mapas citada na GIA-23", () => {
    expect(get("cbmsc").url).toBe("https://www.cbm.sc.gov.br/index.php/estrutura/mapas");
  });

  it("Oktoberfest aponta para o site da festa, não para o PDF do ano (é efêmero)", () => {
    const s = get("oktoberfest");
    expect(s.url).toBe("https://oktoberfestblumenau.com.br");
    expect(s.url).not.toMatch(/\.pdf$/i);
    expect(s.note).toMatch(/2025/);
  });

  it("Anatel aponta para o Fique Ligado usado no caderno do ITC-2023", () => {
    expect(get("anatel-fique-ligado").url).toMatch(
      /^https:\/\/sistemas\.anatel\.gov\.br\/fiqueligado/,
    );
  });
});

describe("decisões registradas — não regredir", () => {
  /**
   * ESTE CASO FOI REESCRITO, e a razão importa.
   *
   * A versão anterior travava o Cidade Iluminada como `bloqueada` porque a nota
   * dizia "reCAPTCHA + login". A **política** que ela protege continua valendo
   * inteira: não se burla captcha nem login de terceiro. O que mudou foi o
   * fato — aquilo vale para abrir chamado no portal; a consulta do mapa é
   * anônima, e a configuração de Blumenau servida pela própria Exati traz
   * `USAR_CAPTCHA: 0`. Os 45.285 postes vieram do mesmo endereço público que o
   * mapa do site usa, em ritmo educado.
   *
   * O teste passa a exigir que a nota **explique a correção**, para ninguém
   * reler o histórico e concluir que a regra foi afrouxada.
   */
  it("Cidade Iluminada está aberta, e a nota explica por que a regra não mudou", () => {
    const s = get("cidade-iluminada");
    expect(s.status).toBe("aberta");
    expect(s.note).toMatch(/USAR_CAPTCHA|anônima/i);
    expect(s.note).toMatch(/não houve bypass|não burlar|continua valendo/i);
  });

  it("SIATU fica adiada, com o motivo técnico e o caminho de dados abertos", () => {
    const s = get("siatu-vm");
    expect(s.status).toBe("adiada");
    expect(s.note).toMatch(/VIEWSTATE|WebForms/);
    expect(s.note).toMatch(/CORS/);
    expect(s.note).toMatch(/LAI|dados abertos/);
  });

  it("TSE é consulta manual — reconhecer e linkar, nunca raspar", () => {
    expect(get("tse").status).toBe("consulta-manual");
  });

  it("Faber-Castell é consulta manual e declara que Pantone não entra", () => {
    const s = get("faber-castell");
    expect(s.status).toBe("consulta-manual");
    expect(s.note).toMatch(/Pantone/);
    expect(s.note).toMatch(/12 cores/);
  });

  // `cidade-iluminada` saiu desta lista porque a barreira não existe (ver
  // acima); as demais continuam guardadas.
  it("nenhuma base com gate aparece como aberta", () => {
    for (const id of ["siatu-vm", "tse", "correios-rastreio", "fipe"]) {
      expect(get(id).status, id).not.toBe("aberta");
    }
  });

  it("as bases que já respondem na bancada estão todas listadas como abertas", () => {
    const abertas = SOURCES.filter((s) => s.status === "aberta").map((s) => s.id);
    expect(abertas).toEqual([
      "ruas-blumenau",
      "ceps-sc",
      "municipios-ibge",
      "aeroportos",
      "pix-ispb",
      "gs1",
      // A bancada passou a responder plaqueta de poste (aba Postes, 45.285
      // pontos pela API). A ordem aqui é a do arquivo, e o Cidade Iluminada
      // ficou no bloco que era o das bloqueadas.
      "cidade-iluminada",
    ]);
  });

  it("as ressalvas honestas dos datasets embarcados continuam escritas", () => {
    // municípios do IBGE não trazem lat/lng: coordenada → cidade não sai daqui
    expect(get("municipios-ibge").note).toMatch(/[Ss]em coordenada/);
    // CEP é só de SC — a GIA-31 fecha num CEP de MG
    expect(get("ceps-sc").note).toMatch(/SC/);
    expect(get("ceps-sc").note).toMatch(/38414-561/);
    // PIX depende do backend
    expect(get("pix-ispb").note).toMatch(/backend/);
  });

  it("os descartados sob demanda dizem por que não viram dataset", () => {
    expect(get("fipe").note).toMatch(/m[eê]s/i);
    expect(get("correios-rastreio").note).toMatch(/autenticada/);
    expect(get("anatel-fique-ligado").note).toMatch(/lote|bulk/i);
  });
});
