import { COUNTRIES, matchCode } from "@/features/reference/countries";
import type { CodeHit } from "@/features/reference/phone-codes";
import { describe, expect, it } from "vitest";
import { runDecoders } from "../run";
import type { DecodeContext } from "../types";
import { decoders as pais } from "./pais";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const only: DecodeContext = { ...ctx, only: "pais" };
const decode = (input: string, c: DecodeContext = ctx) => pais.decode(input, c);
const codes = (input: string, c: DecodeContext = ctx) =>
  decode(input, c).map((x) => (x.data as CodeHit[]).map((h) => h.code));

describe("País (ISO 3166) — a tabela", () => {
  it("tem as 249 entradas oficialmente atribuídas, sem código repetido", () => {
    expect(COUNTRIES).toHaveLength(249);
    expect(new Set(COUNTRIES.map((c) => c.a2)).size).toBe(249);
    expect(new Set(COUNTRIES.map((c) => c.a3)).size).toBe(249);
    expect(new Set(COUNTRIES.map((c) => c.num)).size).toBe(249);
    for (const c of COUNTRIES) {
      expect(c.a2).toMatch(/^[A-Z]{2}$/);
      expect(c.a3).toMatch(/^[A-Z]{3}$/);
      expect(c.num).toMatch(/^\d{3}$/);
      expect(c.name.length).toBeGreaterThan(2);
      if (c.tld) expect(c.tld).toMatch(/^\.[a-z]{2}$/);
      if (c.car) expect(c.car).toMatch(/^[A-Z]{1,3}$/);
    }
    // ccTLD emprestado do vizinho faria ".fr" devolver dois países.
    const tlds = COUNTRIES.map((c) => c.tld).filter(Boolean);
    expect(new Set(tlds).size).toBe(tlds.length);
    expect(matchCode(".fr").map((m) => m.country.a2)).toEqual(["FR"]);
  });

  it("guarda as divergências COI/FIFA que a prova cobra", () => {
    const by = (a2: string) => COUNTRIES.find((c) => c.a2 === a2);
    // Âncoras conferidas na lista de CONs do COI e na de membros da FIFA.
    expect(by("DE")).toMatchObject({ a3: "DEU", ioc: "GER", fifa: "GER", num: "276" });
    expect(by("CH")).toMatchObject({ a3: "CHE", ioc: "SUI", fifa: "SUI" });
    expect(by("PT")).toMatchObject({ a3: "PRT", ioc: "POR", fifa: "POR", tld: ".pt" });
    expect(by("NL")).toMatchObject({ a3: "NLD", ioc: "NED", fifa: "NED" });
    // Eslovênia é o caso em que COI e FIFA discordam entre si.
    expect(by("SI")).toMatchObject({ a3: "SVN", ioc: "SLO", fifa: "SVN" });
    // Níger e Nigéria: a troca clássica.
    expect(by("NE")).toMatchObject({ a3: "NER", ioc: "NIG", fifa: "NIG" });
    expect(by("NG")).toMatchObject({ a3: "NGA", ioc: "NGR", fifa: "NGA" });
    // Sem comitê olímpico e sem federação: vazio, não "igual ao alpha-3".
    expect(by("VA")).toMatchObject({ ioc: "", fifa: "", car: "V" });
    // O Brasil é o caso trivial: as três tabelas dizem BRA.
    expect(by("BR")).toMatchObject({ a3: "BRA", ioc: "BRA", fifa: "BRA", capital: "Brasília" });
  });

  it("um código pode valer para países diferentes", () => {
    // ROU: alpha-3 da Romênia e placa do Uruguai (República Oriental del …).
    const rou = matchCode("ROU").map((m) => m.country.a2);
    expect(rou).toEqual(["RO", "UY"]);
    // WAL: País de Gales na FIFA, Serra Leoa na placa.
    expect(matchCode("WAL").map((m) => m.country.a2)).toContain("SL");
    expect(matchCode("WAL").find((m) => m.nation)?.nation).toBe("País de Gales");
  });
});

describe("País (ISO 3166) — leitura de código", () => {
  it("alpha-2 → a tabela inteira", () => {
    const [c] = decode("BR");
    expect(c.render).toBe("code-list");
    expect(codes("BR")[0]).toEqual(["BR", "BRA", "076", ".br"]);
    expect((c.data as CodeHit[])[0].detail).toBe("alpha-2 · placa · Brasília · América do Sul");
    expect(c.label).toBe("alpha-2");
  });

  it("COI → país, e a tabela mostra o alpha-3 que a prova pede", () => {
    const [c] = decode("GER");
    expect(c.output).toBe("Alemanha");
    expect(c.label).toBe("COI");
    expect(codes("GER")[0]).toEqual(["DE", "DEU", "276", ".de", "GER", "D"]);
    expect(c.chainValue).toBe("276");
  });

  it("numérico exige três dígitos — 076 resolve, 76 não", () => {
    expect(decode("076")[0].output).toBe("Brasil");
    expect(decode("76")).toEqual([]);
    // No modo "uma cifra só" quem escolheu foi o usuário.
    expect(decode("76", only)[0].output).toBe("Brasil");
  });

  it("ccTLD com ponto resolve, e o domínio inteiro também", () => {
    expect(decode(".pt")[0].output).toBe("Portugal");
    expect(decode("uol.com.br")[0].output).toBe("Brasil");
  });

  it("lista de códigos: todos precisam ser código", () => {
    const [c] = decode("BR PT AO");
    expect(c.output).toBe("Brasil · Portugal · Angola");
    expect(c.chainValue).toBe("076 620 024");
    expect(decode("BR PT ZZ")).toEqual([]);
    expect(decode("BR e Portugal")).toEqual([]);
    // O enunciado escreve o confronto com hífen.
    expect(decode("BRA-ARG")[0].output).toBe("Brasil · Argentina");
  });

  it("mostra a leitura alternativa quando o código serve a dois países", () => {
    const out = decode("ROU");
    expect(out.map((c) => c.output)).toEqual(["Romênia", "Uruguai"]);
    // A leitura do ISO vem na frente da placa.
    expect(out[0].forcedScore as number).toBeGreaterThan(out[1].forcedScore as number);
    expect(out[1].label).toBe("placa");
  });

  it("nome, apelido e capital entram como entrada", () => {
    expect(decode("Portugal")[0].output).toContain("PRT");
    expect(decode("Holanda")[0].output).toContain("NED");
    const cap = decode("Brasília")[0];
    expect(cap.label).toBe("capital");
    expect(cap.output).toContain("076");
    // Nome tem que casar inteiro: pedaço solto dentro de frase não vale.
    expect(decode("fui ao Chile ontem")).toEqual([]);
  });
});

describe("País (ISO 3166) — portão anti-ruído", () => {
  const noise = [
    "89066730", // CEP
    "111.444.777-35", // CPF
    "47 3221 5144", // telefone
    "-26.9194, -48.6714", // coordenada
    "12/03/2024", // data
    "SGVsbG8gbXVuZG8=", // Base64
    "a resposta esta na praca da bandeira", // prosa
    "84 79 80 79", // números de duas casas (A1Z26)
    "7 5 15 20 21 4 5", // números atômicos
    "ATENCAO EQUIPE", // caixa alta
    "AB CD", // duas letras que não são país (CD é, AB não)
    "12-03-2024", // data com hífen (o hífen separa, mas 12 não é código)
    "35.999.999/0001-11", // CNPJ
    "R$ 1.250,00", // dinheiro
    "AC-DC", // sigla em caixa alta que quase parece dois códigos
  ];

  for (const input of noise) {
    it(`não dispara em "${input}"`, () => {
      expect(decode(input)).toEqual([]);
    });
  }

  it("uma letra só não dispara fora do modo 'uma cifra só'", () => {
    expect(decode("D")).toEqual([]);
    expect(decode("D", only)[0].output).toBe("Alemanha");
  });

  it("minúsculas não disparam: 'br' é palavra, 'BR' é código", () => {
    expect(decode("br")).toEqual([]);
    expect(decode("BR")).toHaveLength(1);
  });

  it("no fan-out completo, o país não invade entrada de outra base", () => {
    const hits = (input: string) =>
      runDecoders(input, ctx).results.filter((r) => r.decoderId === "pais");
    expect(hits("89066730")).toHaveLength(0);
    expect(hits("47 3221 5144")).toHaveLength(0);
    expect(hits("84 79 80 79")).toHaveLength(0);
    expect(hits("BRA")).toHaveLength(1);
  });
});
