import { describe, expect, it } from "vitest";
import {
  constIndex,
  letterAt,
  pairIndex,
  parseIndexSpecs,
  romanValue,
  tripleIndex,
  zipIndex,
} from "./zip";

describe("letterAt (contagem)", () => {
  it("acentuado vale UM caractere: 'Capitão Caverna'[10] = V (GIA-05, E Agora)", () => {
    // C a p i t ã o | C a v  → o "ã" ocupa a 6ª casa; com stripDiacritics daria A.
    expect(letterAt("Capitão Caverna", 10)).toBe("v");
  });

  it("ignora espaços e pontuação ao contar (GIA-34, 'ivan naatz'[8] = T)", () => {
    expect(letterAt("ivan naatz", 8)).toBe("t");
    expect(letterAt("Laranja Escuro", 11)).toBe("u"); // GIA-39, código 015
  });

  it("conta do fim quando pedido — e índice negativo é o mesmo pedido", () => {
    expect(letterAt("Questão de Tempo", 5, true)).toBe("T"); // 14 letras, 10ª do início
    expect(letterAt("Questão de Tempo", -5)).toBe("T");
  });

  it("conta todo caractere quando 'apenas letras' está desligado", () => {
    expect(letterAt("a b", 2, false, false)).toBe(" ");
  });

  it("índice fora da fonte devolve string vazia", () => {
    expect(letterAt("abc", 9)).toBe("");
    expect(letterAt("abc", 0)).toBe("");
  });
});

describe("zipIndex (N fontes × 1 índice cada)", () => {
  it("GIA-29 Romanos: 6 imperadores + I V II IV IV III → LOUROS", () => {
    const imperadores = [
      "Lucius Verus",
      "Commodus",
      "Augustus",
      "Hadrian",
      "Antoninus Pius",
      "Vespasian",
    ];
    const r = zipIndex(imperadores, [1, 5, 2, 4, 4, 3]);
    expect(r.result.toUpperCase()).toBe("LOUROS");
    expect(r.misses).toBe(0);
  });

  it("GIA-34 CRJA: 13 candidatos × 13 índices → TITULOELEITOR", () => {
    // RESOLUCOES.md:993 — só fecha ignorando os espaços ("ivan naatz"[8],
    // "ana paula"[6], "odair t"[6]) e com o "ê" de Stênio valendo 1.
    const candidatos = [
      "Stênio",
      "Ismael",
      "ivan naatz",
      "ana paula",
      "wilson",
      "valmor",
      "rosane",
      "dalirio",
      "decio",
      "osni",
      "odair t",
      "vilson",
      "dari",
    ];
    const r = zipIndex(candidatos, [2, 1, 8, 6, 3, 5, 6, 3, 2, 4, 6, 5, 3]);
    expect(r.result.toUpperCase()).toBe("TITULOELEITOR");
  });

  it("GIA-39 Faber-Castell: 12 cores → o gabarito diverge numa célula", () => {
    const cores = [
      "Laranja Escuro",
      "Marrom",
      "Lilás",
      "Bordô",
      "Violeta",
      "Amarelo Canário",
      "Areia",
      "Verde Claro",
      "Marrom Claro",
      "Ocre",
      "Prata",
      "Cinza Quente",
    ];
    const r = zipIndex(cores, [11, 6, 3, 1, 2, 8, 4, 6, 8, 4, 4, 5]);
    // O acervo declara UMA BICICLETA, mas a 3ª célula (038 = Lilás, 3ª letra)
    // dá L, não A — erro do gabarito, não da contagem. Fixamos o que a regra
    // produz; as outras 11 células (4 delas com espaço no nome) fecham.
    expect(r.result.toUpperCase()).toBe("UMLBICICLETA");
  });

  it("descarta a sobra quando as listas têm tamanhos diferentes", () => {
    expect(zipIndex(["alfa", "beta", "gama"], [1, 2]).result).toBe("ae");
  });
});

describe("constIndex (mesmo índice em todas as fontes)", () => {
  it("GIA-30 Sinfonia: 5ª letra DE TRÁS PRA FRENTE de 6 músicas do Vlad V → TEATRO", () => {
    // A palavra final é derivação (o acervo registra só a regra "5ª de trás
    // para frente"), mas a regra é do acervo e as 6 letras fecham.
    const musicas = [
      "Questão de Tempo",
      "Agora Eu Sei",
      "Siga o Som",
      "O Chamado da Montanha",
      "A Espada e o Dragão",
      "Plantar, Colher",
    ];
    expect(constIndex(musicas, 5, true).result.toUpperCase()).toBe("TEATRO");
  });

  it("conta do início quando fromEnd é falso", () => {
    expect(constIndex(["alfa", "beta"], 1).result).toBe("ab");
  });

  it("marca as fontes curtas demais como falhas", () => {
    const r = constIndex(["alfa", "oi"], 4);
    expect(r.result).toBe("a");
    expect(r.misses).toBe(1);
  });
});

describe("pairIndex (A{n}L{m} e 33.9)", () => {
  // Caso CANÔNICO: a GIA-35 (Quem Peleia) usa o estatuto da Festa do Cavalo,
  // que não está no acervo — aqui só se prova a mecânica artigo→letra.
  const artigos = ["Do nome e da sede", "Dos associados", "Da diretoria"];

  it("escolhe a fonte pelo primeiro número e a letra pelo segundo", () => {
    const r = pairIndex(artigos, parseIndexSpecs("A2L3 A1L1 A3L2") ?? []);
    expect(r.result).toBe("sDa");
  });

  it("par fora do alcance não derruba o resto", () => {
    const r = pairIndex(artigos, parseIndexSpecs("9.1 1.1") ?? []);
    expect(r.result).toBe("D");
    expect(r.misses).toBe(1);
  });
});

describe("parseIndexSpecs (a porta de entrada)", () => {
  it("aceita algarismos romanos misturados com arábicos", () => {
    expect(parseIndexSpecs("I V II IV IV III")?.map((s) => s.position)).toEqual([1, 5, 2, 4, 4, 3]);
    expect(parseIndexSpecs("3, 7; 12")?.map((s) => s.position)).toEqual([3, 7, 12]);
  });

  it("o sinal de menos pede a contagem do fim", () => {
    expect(parseIndexSpecs("-5")).toEqual([{ position: 5, fromEnd: true }]);
  });

  it("lê o par artigo→letra e o par pontuado do mapa", () => {
    expect(parseIndexSpecs("A3L6")).toEqual([{ source: 3, position: 6, fromEnd: false }]);
    expect(parseIndexSpecs("33.9")).toEqual([{ source: 33, position: 9, fromEnd: false }]);
  });

  it("recusa a chave inteira se um pedaço não for índice — nada de meia leitura", () => {
    expect(parseIndexSpecs("")).toBeNull();
    expect(parseIndexSpecs("LIMA")).toBeNull();
    expect(parseIndexSpecs("3 abc 5")).toBeNull();
    expect(parseIndexSpecs("0")).toBeNull();
  });

  it("palavra que só tem letras romanas mas não é romano válido é recusada", () => {
    for (const w of ["MIL", "CIVIL", "LIVID", "IIII"]) expect(romanValue(w)).toBeNull();
    expect(romanValue("MIX")).toBe(1009); // romano válido: passa, mas não acha letra
  });

  /**
   * O acervo da Gincana Cidade de Blumenau escreve o par com HÍFEN, e antes
   * disto a chave inteira caía em `null` — o decoder não acendia. Ver
   * `docs/ACERVO-ARROMBA-PROVAS.md` §2.2 (prova 32 SALGADINHO).
   */
  it("lê o par escrito com hífen, marcando-o como ambíguo", () => {
    expect(parseIndexSpecs("7-3")).toEqual([
      { source: 7, position: 3, fromEnd: false, viaHifen: true },
    ]);
    expect(parseIndexSpecs("494-9 432-8")?.map((s) => [s.source, s.position])).toEqual([
      [494, 9],
      [432, 8],
    ]);
  });

  it("lê a trinca fonte→palavra→letra da cifra de livro", () => {
    expect(parseIndexSpecs("8-4-3")).toEqual([{ source: 8, sub: 4, position: 3, fromEnd: false }]);
    expect(parseIndexSpecs("8-4-3|26-8-4")?.map((s) => [s.source, s.sub, s.position])).toEqual([
      [8, 4, 3],
      [26, 8, 4],
    ]);
  });

  it("o hífen novo não engole o índice negativo nem o par com letra", () => {
    // "-5" não tem dígito à esquerda do hífen: continua sendo contagem do fim.
    expect(parseIndexSpecs("-5")).toEqual([{ position: 5, fromEnd: true }]);
    // "A3L6" continua saindo SEM a marca de ambiguidade — ele não é ambíguo.
    expect(parseIndexSpecs("A3L6")).toEqual([{ source: 3, position: 6, fromEnd: false }]);
  });
});

describe("tripleIndex (cifra de livro: fonte → palavra → letra)", () => {
  const fontes = ["nada aqui", "o rio corre", "sem uso"];

  it("desce os três níveis: linha 2, palavra 3, letra 4 de 'corre' = R", () => {
    const r = tripleIndex(fontes, [{ source: 2, sub: 3, position: 4, fromEnd: false }]);
    expect(r.result).toBe("r");
    expect(r.misses).toBe(0);
  });

  it("nível do meio fora da linha é miss, não letra de outro lugar", () => {
    const r = tripleIndex(fontes, [{ source: 2, sub: 9, position: 1, fromEnd: false }]);
    expect(r.result).toBe("");
    expect(r.misses).toBe(1);
  });

  it("lida com a mesma chave lida como par — as duas leituras diferem", () => {
    const spec = [{ source: 2, sub: 3, position: 4, fromEnd: false }];
    // Como trinca: palavra 3 ("corre"), letra 4 → "r".
    expect(tripleIndex(fontes, spec).result).toBe("r");
    // Como par, o `sub` é ignorado: 4ª letra da linha 2 inteira ("oriocorre") → "o".
    expect(pairIndex(fontes, spec).result).toBe("o");
  });
});
