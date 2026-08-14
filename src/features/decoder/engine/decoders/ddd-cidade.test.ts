import {
  CITY_ROWS,
  HOMONYM_UF,
  foldCityName,
  formatPhone,
  lookupCityDDD,
} from "@/features/reference/city-ddd";
import type { CodeHit } from "@/features/reference/phone-codes";
import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as cityDdd } from "./ddd-cidade";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const decode = (input: string) => cityDdd.decode(input, ctx);
const out = (input: string) => decode(input)[0]?.output;

describe("Cidade → DDD", () => {
  it("âncora GIA-40: as cinco cidades montam o telefone da Ilhatur", () => {
    // Enunciado "Enxergar sem ver": a tabela escondida atrás da imagem dá as
    // coordenadas dessas cinco cidades; os DDDs (47/32/21/51/44) montam
    // 47 3221-5144, o telefone da Ilhatur.
    const c = decode("Blumenau, Juiz de Fora, Teresópolis, Porto Alegre, Maringá")[0];
    expect(c).toBeDefined();
    expect(c.output).toBe("4732215144");
    expect(c.chainValue).toBe("4732215144");
    expect(c.notes).toContain("(47) 3221-5144");
    expect(c.render).toBe("code-list");
    expect(c.forcedScore).toBe(0.85);
    const hits = c.data as CodeHit[];
    expect(hits.map((h) => h.code)).toEqual(["47", "32", "21", "51", "44"]);
    // A UF vai visível para o usuário flagrar homônimo.
    expect(hits[2].name).toBe("Teresópolis (RJ)");
  });

  it("Teresópolis é 21, não o 24 do vizinho Petrópolis", () => {
    // O erro que motivou a tabela própria: reverse-geocode por cidade-cabeça
    // responde 24 (Petrópolis) para a serra fluminense inteira.
    expect(out("Teresópolis, Petrópolis")).toBe("2124");
  });

  it("dobra acentos e caixa", () => {
    expect(out("Maringá, Blumenau")).toBe("4447");
    expect(out("MARINGA, BLUMENAU")).toBe("4447");
    expect(out("maringa, blumenau")).toBe("4447");
    expect(out("Timbó, Sao Bento do Sul")).toBe("4747");
  });

  it("espaço simples nunca separa — 'Juiz de Fora' é uma cidade, não três", () => {
    expect(out("Juiz de Fora")).toBe("32");
    expect(out("Rio do Sul, Rio do Oeste")).toBe("4747");
    // Colado sem separador, vira um nome inexistente e o portão fecha.
    expect(decode("Blumenau Joinville")).toEqual([]);
  });

  it("aceita vírgula, ponto e vírgula, quebra de linha e coluna colada", () => {
    expect(out("Blumenau; Curitiba")).toBe("4741");
    expect(out("Blumenau\nCuritiba")).toBe("4741");
    expect(out("Blumenau    Curitiba")).toBe("4741");
  });

  it("portão: tudo ou nada — um token que não é cidade derruba a leitura", () => {
    expect(decode("Blumenau, Xanadu")).toEqual([]);
    expect(decode("As imagens mostram formas, cores e momentos")).toEqual([]);
    expect(decode("47, 32, 21")).toEqual([]);
  });

  it("portão: palavra solta que também é município não dispara", () => {
    // Aurora (SC), Batalha (PI), Descanso (SC) e Estrela (RS) existem, mas
    // sozinhas são só palavras — texto decifrado cairia nelas o tempo todo.
    expect(decode("Aurora")).toEqual([]);
    expect(decode("Batalha")).toEqual([]);
    expect(decode("Blumenau")).toEqual([]);
    // Com UF explícita a intenção é inequívoca.
    expect(out("Blumenau/SC")).toBe("47");
    expect(out("Aurora (SC)")).toBe("47");
  });

  it("homônimo: Palmas é a capital do Tocantins; /PR desambigua", () => {
    const to = decode("Palmas, Blumenau")[0];
    expect(to.output).toBe("6347");
    expect((to.data as CodeHit[])[0].name).toBe("Palmas (TO)");
    expect(out("Palmas/PR, Blumenau")).toBe("4647");
  });

  it("Vale do Itajaí inteiro no 47, e a armadilha vizinha no 48", () => {
    expect(out("Gaspar, Indaial, Timbó, Ibirama, Brusque, Ituporanga")).toBe("474747474747");
    // Itapema é 47 e Tijucas, a 20 km, é 48 — o DDD não segue a geografia.
    expect(out("Itapema, Tijucas")).toBe("4748");
  });

  it("uma cidade sozinha marca pouco; a lista que fecha telefone marca alto", () => {
    expect(decode("Juiz de Fora")[0].forcedScore).toBe(0.45);
    expect(decode("Blumenau, Curitiba")[0].forcedScore).toBe(0.75);
    // Seis cidades passam de telefone: volta ao patamar de lista.
    expect(decode("Blumenau, Curitiba, Recife, Salvador, Natal, Belém")[0].forcedScore).toBe(0.75);
  });
});

describe("índice CITY_DDD", () => {
  // biome-ignore format: a lista dos 67 DDDs em uso, em blocos por região.
  const VALID = new Set([
    "11","12","13","14","15","16","17","18","19",
    "21","22","24","27","28",
    "31","32","33","34","35","37","38",
    "41","42","43","44","45","46","47","48","49",
    "51","53","54","55",
    "61","62","63","64","65","66","67","68","69",
    "71","73","74","75","77","79",
    "81","82","83","84","85","86","87","88","89",
    "91","92","93","94","95","96","97","98","99",
  ]);

  it("todo DDD da tabela existe de verdade", () => {
    const invalidos = CITY_ROWS.filter((r) => !VALID.has(r.ddd)).map((r) => `${r.city}=${r.ddd}`);
    expect(invalidos).toEqual([]);
  });

  it("nenhuma cidade repetida dentro da mesma UF", () => {
    const seen = new Set<string>();
    const dup: string[] = [];
    for (const r of CITY_ROWS) {
      const k = `${r.city}|${r.uf}`;
      if (seen.has(k)) dup.push(k);
      seen.add(k);
    }
    expect(dup).toEqual([]);
  });

  it("toda colisão de nome entre UFs está decidida à mão", () => {
    const porNome = new Map<string, Set<string>>();
    for (const r of CITY_ROWS) {
      const k = foldCityName(r.city);
      porNome.set(k, (porNome.get(k) ?? new Set()).add(r.uf));
    }
    const colisoes = [...porNome].filter(([, ufs]) => ufs.size > 1).map(([nome]) => nome);
    // Sem decisão explícita, o nome nu cairia na ordem da tabela — silenciosamente.
    expect(colisoes.filter((n) => !(n in HOMONYM_UF))).toEqual([]);
  });

  it("formata telefone só com 10 ou 11 dígitos", () => {
    expect(formatPhone("4732215144")).toBe("(47) 3221-5144");
    expect(formatPhone("47932215144")).toBe("(47) 93221-5144");
    expect(formatPhone("474747")).toBeNull();
  });

  it("DDD não se deriva da UF: Porto União é SC com o 42 do Paraná", () => {
    const pu = lookupCityDDD("Porto União, União da Vitória");
    expect(pu?.map((m) => `${m.uf} ${m.ddd}`)).toEqual(["SC 42", "PR 42"]);
    // E a mesma UF aparece com DDDs diferentes.
    const sc = new Set(CITY_ROWS.filter((r) => r.uf === "SC").map((r) => r.ddd));
    expect([...sc].sort()).toEqual(["42", "47", "48", "49"]);
  });
});
