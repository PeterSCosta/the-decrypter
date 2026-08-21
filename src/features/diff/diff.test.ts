import { parsePositions } from "@/features/positions/extract";
import { describe, expect, it } from "vitest";
import {
  MAX_CHARS,
  buildStrips,
  changedChars,
  diffWords,
  formatCounts,
  hunkLetterCounts,
  hunkLetters,
  hunkWords,
  segments,
  tokenize,
} from "./diff";

describe("comparação normalizada, exibição original", () => {
  it("acento e caixa não contam como diferença", () => {
    const r = diffWords("A ponte Hercílio Luz", "a PONTE hercilio luz");
    expect(r.hunks).toHaveLength(0);
  });

  it("a tira devolve a grafia acentuada do texto, não a normalizada", () => {
    // O corpus responde "Hercílio Luz" com acento — uma tira dobrada não cola em lugar nenhum.
    const r = diffWords("a rua Hercílio Luz", "a rua Sete Setembro");
    expect(hunkWords(r, "a")).toEqual(["Hercílio Luz"]);
    expect(hunkWords(r, "b")).toEqual(["Sete Setembro"]);
  });

  it("pontuação não vira trecho: só palavra conta", () => {
    const r = diffWords("chegou, enfim!", "chegou enfim");
    expect(r.hunks).toHaveLength(0);
  });
});

describe("tira (a) — palavras trocadas · Quer Provar Isto? (ITC 2022, P12 Et.1)", () => {
  // Sinopse do IMDB reproduzida na prova, copiada da resolução do caderno 2022:
  // "as únicas duas palavras que não estão no original são 'EYELASH' (Cilio) e
  // 'LIGHT' (Luz)" → Rua Hercílio Luz. O acervo guarda o texto ADULTERADO e o
  // par trocado; as contrapartes do lado original abaixo são marcadores nossos
  // (o original do IMDB não está no acervo) — o que se afirma aqui é a tira (a).
  const prova =
    "The team scouts the apparent hub for the aliens' food supply, only to come " +
    "face-to-face with a full-fledged invasion eyelash. Meanwhile, Auggie's attempt " +
    "to sell out his son to the police is complicated by Murn's mysterious light contact.";
  const original = prova.replace("eyelash", "force").replace("light", "new");

  it("entrega EYELASH e LIGHT, na ordem, e nada mais", () => {
    const r = diffWords(prova, original);
    expect(hunkWords(r, "a")).toEqual(["eyelash", "light"]);
  });

  it("a tira (b) traz as originais correspondentes, alinhadas trecho a trecho", () => {
    const r = diffWords(prova, original);
    const strips = buildStrips(r);
    expect(strips.changed).toHaveLength(2);
    expect(strips.original).toEqual(["force", "new"]);
  });
});

describe("tira (c) — letras que mudaram · Bronquinha (acervo 2016-05, Et.1)", () => {
  // Mecânica registrada no catálogo: "achar as palavras grafadas errado no texto;
  // a letra trocada para corrigir cada uma forma anagrama de SOCIESC (local)".
  // O acervo de 2016 conserva a LÓGICA, não o texto — os pares abaixo reconstroem
  // a mecânica: cada linha tem uma palavra errada e a letra que a corrige.
  const errado = ["cachurro", "koração", "sosiedade", "cedade", "elifante", "brazil", "pexcoço"];
  const certo = ["cachorro", "coração", "sociedade", "cidade", "elefante", "brasil", "pescoço"];
  const linhas = (ws: string[]) => ws.map((w, i) => `erro ${i + 1} ${w}`).join("\n");

  it("a letra que corrige cada palavra forma anagrama de SOCIESC", () => {
    const r = diffWords(linhas(errado), linhas(certo));
    const letras = hunkLetters(r, "b").join("");
    expect(letras).toHaveLength(7);
    expect([...letras.toUpperCase()].sort().join("")).toBe([..."SOCIESC"].sort().join(""));
  });

  it("o lado do texto guarda a letra errada — o outro lado do mesmo par", () => {
    const r = diffWords("erro 1 sosiedade", "erro 1 sociedade");
    expect(hunkLetters(r, "a")).toEqual(["s"]);
    expect(hunkLetters(r, "b")).toEqual(["c"]);
  });

  it("changedChars ignora espaço e pontuação no par", () => {
    expect(changedChars("bem-vindo!", "bem vindo")).toEqual({ a: "", b: "" });
  });
});

describe("tira (d) — contagem de letras · Lições de Mãe (ITC 2022, P10 Et.1)", () => {
  // Resolução: "as palavras em caixa alta da primeira linha eram modificadas do
  // original… para que a contagem de letras em maiúscula na linha superior,
  // quando utilizada na linha abaixo (totalmente em caixa alta) resultasse numa
  // letra específica" — 15, 8, 18, 8, 8, 9, 11, 19, 10, 19, 12, 13 → Dona Florinda.
  // O texto de A é o enunciado real; o site itatiaia.com.br de onde ele saiu não
  // está no acervo, então cada trecho em caixa alta vira um marcador no lado B.
  const trechos = [
    ["Minha mãe me ensinou a", "CUIDAR DO SORRISO"],
    ["Minha mãe me ensinou", "A RETIDÃO"],
    ["Minha mãe me ensinou", "A LÓGICA E HIERARQUIA"],
    ["Minha mãe me ensinou o que", "É MOTIVAR"],
    ["Minha mãe me ensinou sobre", "A FIRMEZA"],
    ["Minha mãe me ensinou sobre", "A GENÉTICA"],
    ["Minha mãe me ensinou a", "CONTRADIÇÃO"],
    ["Minha mãe me ensinou", "SOBRE AS EXPECTATIVAS"],
    ["Minha mãe me ensinou sobre", "A SABEDORIA"],
    ["Minha mãe me ajudou", "NA COORDENAÇÃO MOTORA"],
    ["Minha mãe me ensinou a importância", "DA MATEMÁTICA"],
    ["Minha mãe me ensinou", "SOBRE RELIGIÃO"],
  ];
  const prova = trechos.map(([pre, caps]) => `${pre} ${caps}…`).join("\n");
  const original = trechos.map(([pre], i) => `${pre} trecho${i + 1}…`).join("\n");

  it("a série de contagens é 15 8 18 8 8 9 11 19 10 19 12 13", () => {
    const r = diffWords(prova, original);
    expect(hunkLetterCounts(r, "a")).toEqual([15, 8, 18, 8, 8, 9, 11, 19, 10, 19, 12, 13]);
  });

  it("a tira sai formatada e a aba Posições lê a série sem retoque", () => {
    const r = diffWords(prova, original);
    const tira = formatCounts(hunkLetterCounts(r, "a"));
    expect(tira).toBe("15 8 18 8 8 9 11 19 10 19 12 13");
    expect(parsePositions(tira)).toEqual([15, 8, 18, 8, 8, 9, 11, 19, 10, 19, 12, 13]);
  });
});

describe("trechos vizinhos e guardas", () => {
  it("palavras trocadas em sequência formam UM trecho só", () => {
    // "CUIDAR DO SORRISO" precisa contar 15, não 6 · 2 · 7.
    const r = diffWords("ensinou a CUIDAR DO SORRISO hoje", "ensinou a higiene hoje");
    expect(r.hunks).toHaveLength(1);
    expect(hunkWords(r, "a")).toEqual(["CUIDAR DO SORRISO"]);
    expect(hunkLetterCounts(r, "a")).toEqual([15]);
  });

  it("palavra só num lado também é trecho (inserção/remoção)", () => {
    const r = diffWords("a rua da ponte", "a ponte");
    expect(hunkWords(r, "a")).toEqual(["rua da"]);
    expect(hunkWords(r, "b")).toEqual([""]);
    expect(hunkLetterCounts(r, "b")).toEqual([0]);
  });

  it("corta em 20.000 caracteres por lado e avisa", () => {
    const grande = "lorem ipsum ".repeat(3000);
    expect(grande.length).toBeGreaterThan(MAX_CHARS);
    const r = diffWords(grande, "lorem ipsum");
    expect(r.truncatedA).toBe(true);
    expect(r.truncatedB).toBe(false);
    expect(r.tokensA.length).toBeLessThanOrEqual(MAX_CHARS);
  });

  it("trecho grande demais não vira matriz de caractere — tudo mudou e pronto", () => {
    // Dois documentos sem nada em comum viram UM trecho só: o LCS de caractere
    // sobre ele estouraria a memória, então a tira devolve os dois lados inteiros.
    const a = "alfa ".repeat(400).trim();
    const b = "bravo ".repeat(400).trim();
    const letras = hunkLetters(diffWords(a, b), "a").join("");
    expect(letras).toBe("alfa".repeat(400));
  });

  it("texto vazio de um lado não explode", () => {
    expect(diffWords("", "").hunks).toHaveLength(0);
    expect(hunkWords(diffWords("alfa beta", ""), "a")).toEqual(["alfa beta"]);
  });
});

describe("segments (realce na leitura)", () => {
  it("marca só as palavras do trecho, preservando o texto entre elas", () => {
    const texto = "a rua Hercílio Luz, 293";
    const r = diffWords(texto, "a rua Sete Setembro, 293");
    const segs = segments(texto, r.tokensA, r.changedA);
    expect(segs.map((s) => s.text).join("")).toBe(texto);
    expect(segs.filter((s) => s.changed).map((s) => s.text)).toEqual(["Hercílio Luz"]);
  });

  it("tokenize guarda onde a palavra começa e termina", () => {
    const [t] = tokenize("  olá!");
    expect(t).toMatchObject({ raw: "olá", norm: "ola", start: 2, end: 5 });
  });
});

/**
 * A forma da prova 26 do acervo da GCB (PROVINHA MAIS OU MENAS): o texto traz
 * erros propositais ("mais" por "mas"), e o que vale é a POSIÇÃO de cada erro na
 * contagem de palavras, não a palavra. Ver `docs/ACERVO-ARROMBA-PROVAS.md` §2.2.
 */
describe("tira (e): posição das palavras trocadas", () => {
  it("devolve o ordinal 1-based de cada palavra trocada, em ordem", () => {
    const alterado = "um dois mais quatro cinco seis menas oito";
    const original = "um dois mas quatro cinco seis menos oito";
    const strips = buildStrips(diffWords(alterado, original));
    // "mais" é a 3ª palavra e "menas" é a 7ª.
    expect(strips.ordinals).toEqual([3, 7]);
  });

  it("a tira cola direto no campo de posições — é o mesmo formato", () => {
    const strips = buildStrips(diffWords("a b mais d", "a b mas d"));
    expect(parsePositions(formatCounts(strips.ordinals))).toEqual(strips.ordinals);
  });

  it("texto sem troca nenhuma devolve tira vazia, não zero", () => {
    expect(buildStrips(diffWords("igual igual", "igual igual")).ordinals).toEqual([]);
  });
});
