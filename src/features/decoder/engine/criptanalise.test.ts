import { describe, expect, it } from "vitest";
import {
  IC_ALEATORIO,
  IC_INGLES,
  IC_PORTUGUES,
  PERFIL_EN,
  PERFIL_PT,
  colapsarChave,
  contagemDeLetras,
  decifrarVigenere,
  frequencias,
  icPorColuna,
  indiceCoincidencia,
  kasiski,
  quebrarVigenere,
  quiQuadradoLetras,
  quiQuadradoNgramas,
  retratoDoTexto,
  soLetras,
  verossimilhancaBigrama,
} from "./criptanalise";

/** Cifra Vigenère (o inverso exato do `decifrarVigenere`), para montar os casos. */
function cifrar(texto: string, chave: string): string {
  const k = soLetras(chave);
  let out = "";
  let ki = 0;
  for (const ch of texto) {
    const c = ch.charCodeAt(0);
    const mai = c >= 65 && c <= 90;
    const min = c >= 97 && c <= 122;
    if (mai || min) {
      const base = mai ? 65 : 97;
      out += String.fromCharCode(((c - base + (k.charCodeAt(ki % k.length) - 97)) % 26) + base);
      ki++;
    } else out += ch;
  }
  return out;
}

/** Português corrido de verdade — 640 letras. Nenhum trecho veio dos corpora do perfil. */
const PT_LONGO = [
  "A gincana comeca sempre do mesmo jeito e por isso ninguem estranha quando a primeira pista",
  "chega dobrada dentro de um envelope pardo. O time abre, le em voz alta, discorda por dois",
  "minutos inteiros e so entao percebe que a resposta estava escrita na propria borda do papel.",
  "Foi assim no ano passado, quando a equipe do colegio publico atravessou a cidade inteira",
  "atras de uma placa de rua que ninguem mais lembrava de ter visto. O segredo, dizem os mais",
  "velhos, nunca esta no lugar mais dificil e sim no mais obvio de todos.",
].join(" ");

/**
 * Inglês corrido — 620 letras. A primeira versão tinha 227 e o teste do IC caiu:
 * a amostra media 0,082, ACIMA do português, porque em 227 letras a variância do
 * IC ainda engole a diferença entre os idiomas (0,0656 contra 0,073). Não era
 * bug do código, era amostra curta demais para a afirmação — e trocar a
 * afirmação em vez da amostra teria escondido isso.
 */
const EN_LONGO = [
  "The team that wins this game is never the one that runs the fastest through the city streets.",
  "It is the team that reads the first sentence twice and understands that the answer was there",
  "from the beginning, hidden in plain sight, waiting for somebody patient enough to look again.",
  "Every year the organisers promise that the final puzzle will be simpler than the one before,",
  "and every year somebody spends the whole afternoon counting letters on a wall that had nothing",
  "to do with the question. The trick is to stop and ask what the person who wrote it wanted you",
  "to notice first, because a good puzzle always tells you how to solve it if you are willing to",
  "read the instructions instead of guessing at them.",
].join(" ");

describe("soLetras", () => {
  it("dobra acento, baixa a caixa e joga fora o resto", () => {
    expect(soLetras("Ação, 42 — Ôlá!")).toBe("acaoola");
  });
});

describe("indiceCoincidencia", () => {
  it("português corrido fica na faixa medida (0,073–0,077)", () => {
    const ic = indiceCoincidencia(PT_LONGO);
    expect(ic).toBeGreaterThan(0.065);
    expect(ic).toBeLessThan(0.09);
  });

  it("inglês corrido fica abaixo do português, e na faixa medida (0,063–0,066)", () => {
    const en = indiceCoincidencia(EN_LONGO);
    expect(en).toBeLessThan(indiceCoincidencia(PT_LONGO));
    expect(en).toBeGreaterThan(0.055);
    expect(en).toBeLessThan(0.075);
  });

  it("letra uniforme cai perto de 1/26", () => {
    // 26 letras, cada uma 40 vezes: o IC exato de uma distribuição uniforme.
    let s = "";
    for (let i = 0; i < 26; i++) s += String.fromCharCode(97 + i).repeat(40);
    expect(indiceCoincidencia(s)).toBeCloseTo(((40 * 39) / (1040 * 1039)) * 26, 5);
    expect(indiceCoincidencia(s)).toBeLessThan(IC_ALEATORIO + 0.001);
  });

  it("uma letra só é o máximo, 1", () => {
    expect(indiceCoincidencia("aaaaaaaaaa")).toBe(1);
  });

  it("menos de duas letras não tem par para sortear", () => {
    expect(indiceCoincidencia("a")).toBe(0);
    expect(indiceCoincidencia("123")).toBe(0);
  });

  it("Vigenère derruba o IC, e quanto maior a chave mais derruba", () => {
    const claro = indiceCoincidencia(PT_LONGO);
    const c3 = indiceCoincidencia(cifrar(PT_LONGO, "sol"));
    const c8 = indiceCoincidencia(cifrar(PT_LONGO, "montanha"));
    expect(c3).toBeLessThan(claro);
    expect(c8).toBeLessThan(c3 + 0.005);
    expect(c8).toBeLessThan(0.055);
  });

  it("César NÃO mexe no IC — é a assinatura que separa mono de poli-alfabética", () => {
    const rot = [...PT_LONGO]
      .map((ch) => {
        const c = ch.toLowerCase().charCodeAt(0);
        return c >= 97 && c <= 122 ? String.fromCharCode(((c - 97 + 7) % 26) + 97) : ch;
      })
      .join("");
    expect(indiceCoincidencia(rot)).toBeCloseTo(indiceCoincidencia(PT_LONGO), 10);
  });
});

describe("icPorColuna", () => {
  it("no comprimento certo o IC das colunas volta ao do idioma", () => {
    const cifra = cifrar(PT_LONGO, "navio");
    const certo = icPorColuna(cifra, 5);
    expect(certo).toBeGreaterThan(0.06);
    for (const errado of [2, 3, 4, 6, 7, 8, 9]) {
      expect(icPorColuna(cifra, errado)).toBeLessThan(certo);
    }
  });

  it("múltiplo do comprimento certo também sobe — é por isso que a chave colapsa", () => {
    const cifra = cifrar(PT_LONGO, "sol");
    expect(icPorColuna(cifra, 6)).toBeGreaterThan(0.06);
    expect(icPorColuna(cifra, 9)).toBeGreaterThan(0.06);
    expect(icPorColuna(cifra, 5)).toBeLessThan(0.055);
  });

  it("comprimento 1 é o IC do texto inteiro", () => {
    expect(icPorColuna(PT_LONGO, 1)).toBeCloseTo(indiceCoincidencia(PT_LONGO), 10);
  });
});

describe("kasiski", () => {
  it("acha a repetição plantada e vota no período dela", () => {
    // "abcxyz" a cada 12 letras: toda distância é múltiplo de 12, logo de 3, 4, 6.
    const bloco = "abcxyzqqqqqq";
    const texto = bloco.repeat(8);
    const r = kasiski(texto, { ngrama: 3, maxComprimento: 16 });
    expect(r.totalDistancias).toBeGreaterThan(0);
    expect(r.repeticoes.some((x) => x.ngrama === "abc")).toBe(true);
    const votos = new Map(r.votos.map((v) => [v.comprimento, v.votos]));
    for (const div of [2, 3, 4, 6, 12]) expect(votos.get(div)).toBeGreaterThan(0);
    // 5 não divide 12: nenhuma distância deste texto vota nele.
    expect(votos.get(5)).toBe(0);
  });

  it("texto sem repetição de trigrama não vota em nada", () => {
    const r = kasiski("abcdefghijklmnopqrstuvwxyz", { ngrama: 3 });
    expect(r.totalDistancias).toBe(0);
    expect(r.repeticoes).toHaveLength(0);
  });

  it("devolve as posições e as distâncias de cada repetição", () => {
    const r = kasiski("thexxxxxxthe", { ngrama: 3 });
    const the = r.repeticoes.find((x) => x.ngrama === "the");
    expect(the?.posicoes).toEqual([0, 9]);
    expect(the?.distancias).toEqual([9]);
  });
});

describe("frequencias", () => {
  it("conta letra, bigrama e trigrama", () => {
    expect(frequencias("aabaa", 1, 3)).toEqual([
      { gram: "a", contagem: 4, pct: 80 },
      { gram: "b", contagem: 1, pct: 20 },
    ]);
    const bi = frequencias("abab", 2, 5);
    expect(bi[0].gram).toBe("ab");
    expect(bi[0].contagem).toBe(2);
    expect(bi[0].pct).toBeCloseTo((2 / 3) * 100, 10);
    expect(frequencias("abcabc", 3, 1)[0].gram).toBe("abc");
  });

  it("a letra mais comum do português corrido é o A", () => {
    expect(frequencias(PT_LONGO, 1, 1)[0].gram).toBe("a");
  });

  it("texto sem letra devolve lista vazia", () => {
    expect(frequencias("12345", 1)).toEqual([]);
    expect(frequencias("ab", 3)).toEqual([]);
  });
});

describe("qui-quadrado e perfis", () => {
  it("os dois perfis somam 100%", () => {
    const soma = (p: readonly number[]) => p.reduce((a, b) => a + b, 0);
    expect(soma(PERFIL_PT)).toBeCloseTo(1, 3);
    expect(soma(PERFIL_EN)).toBeCloseTo(1, 3);
  });

  it("o perfil pt tem mais A e O; o en tem mais T e H", () => {
    const idx = (c: string) => c.charCodeAt(0) - 97;
    expect(PERFIL_PT[idx("a")]).toBeGreaterThan(PERFIL_EN[idx("a")]);
    expect(PERFIL_PT[idx("o")]).toBeGreaterThan(PERFIL_EN[idx("o")]);
    expect(PERFIL_EN[idx("t")]).toBeGreaterThan(PERFIL_PT[idx("t")]);
    expect(PERFIL_EN[idx("h")]).toBeGreaterThan(PERFIL_PT[idx("h")]);
  });

  it("texto em português casa melhor com pt; em inglês, com en", () => {
    expect(quiQuadradoLetras(PT_LONGO, "pt").qui).toBeLessThan(
      quiQuadradoLetras(PT_LONGO, "en").qui,
    );
    expect(quiQuadradoLetras(EN_LONGO, "en").qui).toBeLessThan(
      quiQuadradoLetras(EN_LONGO, "pt").qui,
    );
  });

  it("no idioma certo o χ² reduzido fica perto de 1; no errado, bem acima", () => {
    expect(quiQuadradoLetras(PT_LONGO, "pt").qui).toBeLessThan(3);
    expect(quiQuadradoLetras(PT_LONGO, "en").qui).toBeGreaterThan(3);
    expect(quiQuadradoLetras(EN_LONGO, "en").qui).toBeLessThan(3);
    expect(quiQuadradoLetras(EN_LONGO, "pt").qui).toBeGreaterThan(3);
  });

  it("o bigrama separa os idiomas neste tamanho de amostra", () => {
    expect(quiQuadradoNgramas(PT_LONGO, 2, "pt").qui).toBeLessThan(
      quiQuadradoNgramas(PT_LONGO, 2, "en").qui,
    );
    expect(quiQuadradoNgramas(EN_LONGO, 2, "en").qui).toBeLessThan(
      quiQuadradoNgramas(EN_LONGO, 2, "pt").qui,
    );
  });

  /**
   * O trigrama NÃO separa em 400–600 letras, e o teste registra isso em vez de
   * escondê-lo: medido no corpus cego, ele só chega a 98% com 1.600 letras e a
   * 100% com 3.200. Com pouco texto toda célula tem esperado abaixo de 5, o
   * agrupamento leva tudo para o balde e sobra menos de um grau de liberdade —
   * então a função devolve `celulas: 0`, e não um número que parece resposta.
   */
  it("o trigrama se recusa a responder quando não há texto para o teste valer", () => {
    expect(quiQuadradoNgramas(PT_LONGO, 3, "pt").celulas).toBeLessThan(2);
    expect(quiQuadradoNgramas(PT_LONGO, 3, "pt").qui).toBe(Number.POSITIVE_INFINITY);
  });

  it("com texto longo o bastante, o trigrama passa a separar", () => {
    const longo = PT_LONGO.repeat(9); // ~3.800 letras, onde a medição dá 100%
    const r = quiQuadradoNgramas(longo, 3, "pt");
    expect(r.celulas).toBeGreaterThan(20);
    expect(r.qui).toBeLessThan(quiQuadradoNgramas(longo, 3, "en").qui);
  });

  it("texto cifrado fica LONGE dos dois idiomas", () => {
    const cifra = cifrar(PT_LONGO, "montanha");
    expect(quiQuadradoLetras(cifra, "pt").qui).toBeGreaterThan(
      quiQuadradoLetras(PT_LONGO, "pt").qui * 3,
    );
    expect(quiQuadradoLetras(cifra, "en").qui).toBeGreaterThan(
      quiQuadradoLetras(EN_LONGO, "en").qui * 3,
    );
  });

  it("texto curto demais não recebe veredito nenhum", () => {
    expect(quiQuadradoLetras("abc", "pt").celulas).toBeLessThan(2);
    expect(quiQuadradoLetras("", "pt").qui).toBe(Number.POSITIVE_INFINITY);
    expect(quiQuadradoNgramas("ab", 3, "pt").qui).toBe(Number.POSITIVE_INFINITY);
  });

  it("verossimilhança de bigrama também separa os idiomas", () => {
    expect(verossimilhancaBigrama(PT_LONGO, "pt")).toBeGreaterThan(
      verossimilhancaBigrama(PT_LONGO, "en"),
    );
    expect(verossimilhancaBigrama(EN_LONGO, "en")).toBeGreaterThan(
      verossimilhancaBigrama(EN_LONGO, "pt"),
    );
    // e o texto cifrado é pior que o claro nos dois modelos
    const cifra = cifrar(PT_LONGO, "navio");
    expect(verossimilhancaBigrama(cifra, "pt")).toBeLessThan(
      verossimilhancaBigrama(PT_LONGO, "pt"),
    );
  });
});

describe("retratoDoTexto", () => {
  it("reconhece português corrido", () => {
    const r = retratoDoTexto(PT_LONGO);
    expect(r.idioma).toBe("pt");
    expect(r.encaixeIc).toBeGreaterThan(0.8);
    expect(r.letra[0].gram).toBe("a");
    expect(r.letras).toBe(soLetras(PT_LONGO).length);
  });

  it("reconhece inglês corrido", () => {
    expect(retratoDoTexto(EN_LONGO).idioma).toBe("en");
  });

  it("não chuta idioma para texto cifrado com chave longa", () => {
    const r = retratoDoTexto(cifrar(PT_LONGO, "montanha"));
    expect(r.idioma).toBeNull();
    expect(r.encaixeIc).toBeLessThan(0.4);
  });

  it("IC alto com idioma nulo é a assinatura de substituição simples", () => {
    // Atbash: mono-alfabética, então o IC continua o do português…
    const atbash = [...PT_LONGO]
      .map((ch) => {
        const c = ch.toLowerCase().charCodeAt(0);
        return c >= 97 && c <= 122 ? String.fromCharCode(122 - (c - 97)) : ch;
      })
      .join("");
    const r = retratoDoTexto(atbash);
    expect(r.encaixeIc).toBeGreaterThan(0.8); // …IC de língua…
    expect(r.idioma).toBeNull(); // …mas nenhum perfil de letra casa.
  });
});

describe("colapsarChave", () => {
  it("reduz a chave periódica à sua raiz", () => {
    expect(colapsarChave("abcabc")).toBe("abc");
    expect(colapsarChave("aaaa")).toBe("a");
    expect(colapsarChave("solsolsol")).toBe("sol");
  });
  it("deixa em paz a que não é periódica", () => {
    expect(colapsarChave("navio")).toBe("navio");
    expect(colapsarChave("abcab")).toBe("abcab");
    expect(colapsarChave("")).toBe("");
  });
});

describe("decifrarVigenere", () => {
  it("desfaz a cifra e preserva caixa, pontuação e espaço", () => {
    const claro = "Ataque ao amanhecer, general!";
    expect(decifrarVigenere(cifrar(claro, "lima"), "lima")).toBe(claro);
  });
  it("dobra acento (o alfabeto da cifra é a–z)", () => {
    expect(decifrarVigenere(cifrar("acao", "sol"), "sol")).toBe("acao");
    expect(decifrarVigenere("acao", "")).toBe("acao");
  });
  it("a chave só anda em cima de letra", () => {
    // com pontuação no meio, o resultado é o mesmo que sem ela
    const a = decifrarVigenere(cifrar("abcdef", "xy"), "xy");
    const b = decifrarVigenere(cifrar("abc-def", "xy"), "xy");
    expect(a).toBe("abcdef");
    expect(b).toBe("abc-def");
  });
});

describe("quebrarVigenere", () => {
  const CHAVES = ["sol", "lima", "navio", "cavalo", "estrela", "montanha"];

  it.each(CHAVES)("acha a chave %s sozinho, sem informar o comprimento", (chave) => {
    const r = quebrarVigenere(cifrar(PT_LONGO, chave));
    expect(r[0].chave).toBe(chave);
    expect(r[0].idioma).toBe("pt");
    expect(decifrarVigenere(cifrar(PT_LONGO, chave), r[0].chave)).toBe(PT_LONGO);
  });

  it("acha a chave em texto INGLÊS e marca o idioma", () => {
    const r = quebrarVigenere(cifrar(EN_LONGO, "porta"));
    expect(r[0].chave).toBe("porta");
    expect(r[0].idioma).toBe("en");
  });

  it("colapsa a chave quando elege um múltiplo do comprimento", () => {
    const r = quebrarVigenere(cifrar(PT_LONGO, "sol"));
    expect(r[0].chave).toBe("sol");
    expect(r[0].comprimentoTestado % 3).toBe(0);
  });

  it("texto em claro devolve chave de uma letra — que é o César identidade", () => {
    const r = quebrarVigenere(PT_LONGO);
    expect(r[0].chave).toBe("a");
  });

  it("César vira chave de uma letra, não de várias", () => {
    const r = quebrarVigenere(cifrar(PT_LONGO, "d"));
    expect(r[0].chave).toBe("d");
  });

  it("texto curto demais não produz candidato", () => {
    expect(quebrarVigenere("abc")).toEqual([]);
    expect(quebrarVigenere("")).toEqual([]);
  });

  it("respeita o teto de letras analisadas sem mudar a resposta", () => {
    const cifra = cifrar(PT_LONGO.repeat(4), "navio");
    expect(quebrarVigenere(cifra, { maxLetras: 300 })[0].chave).toBe("navio");
  });

  it("os candidatos vêm ordenados, melhor primeiro", () => {
    const r = quebrarVigenere(cifrar(PT_LONGO, "navio"));
    expect(r.length).toBeGreaterThan(1);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].nota).toBeGreaterThanOrEqual(r[i].nota);
  });

  it("a evidência do candidato bate com o que ele afirma", () => {
    const r = quebrarVigenere(cifrar(PT_LONGO, "navio"))[0];
    expect(r.icMedio).toBeCloseTo(icPorColuna(cifrar(PT_LONGO, "navio"), r.comprimentoTestado), 10);
    expect(r.encaixe).toBeGreaterThan(0.7);
    expect(r.claro).toBe(soLetras(PT_LONGO));
  });
});

describe("contagemDeLetras", () => {
  it("são 26 casas e o total bate com as letras", () => {
    const c = contagemDeLetras("Ação!");
    expect(c).toHaveLength(26);
    expect(c.reduce((a, b) => a + b, 0)).toBe(4);
    expect(c[0]).toBe(2); // a, a  (ç → c, ã → a)
  });
});

describe("as constantes medidas", () => {
  it("mantêm a ordem que a criptanálise depende", () => {
    expect(IC_ALEATORIO).toBeCloseTo(1 / 26, 10);
    expect(IC_INGLES).toBeGreaterThan(IC_ALEATORIO);
    expect(IC_PORTUGUES).toBeGreaterThan(IC_INGLES);
  });
});
