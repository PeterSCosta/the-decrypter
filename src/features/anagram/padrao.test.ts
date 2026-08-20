import { describe, expect, it } from "vitest";
import { assinaturaDeRepeticao, buscarPorPadrao, lerPadrao } from "./padrao";

/** Vocabulário pequeno e explícito — o que este teste prende é a FORMA, não a lista. */
const VOCAB = [
  "aba",
  "ace",
  "ata",
  "ave",
  "asa",
  "ana",
  "anna",
  "otto",
  "casa",
  "ovo",
  "ana",
  "ponte",
  "pinta",
  "penta",
  "ponta",
  "acao",
  "coracao",
  "cancao",
  "nacao",
  "monumento",
  "prefeitura",
  "blumenau",
  "abcdef",
];

const achados = (p: string) => buscarPorPadrao(VOCAB, p).achados;

describe("leitura do padrão", () => {
  it("só dígitos é molde de repetição", () => {
    const l = lerPadrao("1221");
    expect(l.tipo).toBe("repeticao");
    expect(l.comprimento).toBe(4);
    expect(l.descricao).toContain("2 letras distintas");
  });

  it("letras e curingas é molde literal", () => {
    const l = lerPadrao("p?nt?");
    expect(l.tipo).toBe("molde");
    expect(l.comprimento).toBe(5);
  });

  it("com `*` o comprimento é desconhecido, e a tela precisa saber disso", () => {
    expect(lerPadrao("*cao").comprimento).toBeNull();
  });

  it("mistura de dígito com letra é inválida — não se adivinha a intenção", () => {
    expect(lerPadrao("a1b2").tipo).toBe("invalido");
    expect(lerPadrao("").tipo).toBe("invalido");
  });

  it("acento e caixa não atrapalham — o `fold` normaliza antes", () => {
    expect(lerPadrao("  P?NT?  ").tipo).toBe("molde");
    expect(lerPadrao("  P?NT?  ").comprimento).toBe(5);
  });
});

describe("assinatura de repetição", () => {
  it("numera pela ordem de aparição, então a forma é canônica", () => {
    expect(assinaturaDeRepeticao("anna")).toBe("1221");
    expect(assinaturaDeRepeticao("otto")).toBe("1221");
    // c-a-s-a: a 2ª e a 4ª são a mesma letra, a 1ª e a 3ª são distintas.
    expect(assinaturaDeRepeticao("casa")).toBe("1232");
    expect(assinaturaDeRepeticao("abcdef")).toBe("123456");
  });
});

describe("busca por molde", () => {
  it("`a??` acha as de três letras que começam com a", () => {
    expect(achados("a??")).toEqual(expect.arrayContaining(["aba", "ace", "ata", "ave", "asa"]));
    expect(achados("a??")).not.toContain("ponte");
  });

  it("`*cao` acha o sufixo, de qualquer comprimento", () => {
    const r = achados("*cao");
    expect(r).toEqual(expect.arrayContaining(["acao", "coracao", "cancao", "nacao"]));
  });

  it("`p?nt?` acha as quatro variantes de cinco letras", () => {
    expect(achados("p?nt?").sort()).toEqual(["penta", "pinta", "ponta", "ponte"]);
  });

  it("molde sem curinga acha só a palavra exata", () => {
    expect(achados("casa")).toEqual(["casa"]);
  });
});

describe("busca por repetição", () => {
  /**
   * É o caso que resolve criptograma curto: não se sabe QUE letra é qual, só
   * onde a mesma letra se repete. Um molde com `?` não captura isso.
   */
  it("`1221` acha anna e otto, e não casa", () => {
    const r = achados("1221");
    expect(r).toContain("anna");
    expect(r).toContain("otto");
    expect(r).not.toContain("casa");
  });

  it("`1232` acha casa — a 2ª e a 4ª são a mesma letra", () => {
    expect(achados("1232")).toContain("casa");
    // E não acha `anna`, cuja forma é `1221`.
    expect(achados("1232")).not.toContain("anna");
  });

  it("o padrão do usuário é canonizado — `2332` e `1221` dão o mesmo", () => {
    expect(achados("2332")).toEqual(achados("1221"));
  });

  it("classes diferentes têm de ser letras diferentes", () => {
    // `1234` são quatro letras todas distintas: "anna" não entra.
    expect(achados("1234")).not.toContain("anna");
  });

  it("respeita o comprimento", () => {
    for (const w of achados("12321")) expect(w).toHaveLength(5);
  });
});

describe("teto e ordenação", () => {
  it("ordena por comprimento e depois alfabeticamente", () => {
    const r = achados("*a*");
    for (let i = 1; i < r.length; i++) expect(r[i].length).toBeGreaterThanOrEqual(r[i - 1].length);
  });

  it("avisa quando truncou — lista cortada em silêncio é lista que mente", () => {
    const r = buscarPorPadrao(VOCAB, "*", 3);
    expect(r.achados).toHaveLength(3);
    expect(r.truncado).toBe(true);
  });

  it("não marca truncado quando coube tudo", () => {
    expect(buscarPorPadrao(VOCAB, "casa").truncado).toBe(false);
  });

  it("padrão inválido devolve lista vazia, não o vocabulário inteiro", () => {
    expect(buscarPorPadrao(VOCAB, "a1b2").achados).toEqual([]);
  });
});

describe("com o vocabulário REAL", () => {
  /**
   * O teste acima prende a forma; este prende a escala. São 451.016 palavras, e
   * a busca varre todas — se ela ficar lenta, a aba trava a thread principal.
   */
  it("varre as 451 mil palavras em menos de 300 ms", async () => {
    const { readFileSync } = await import("node:fs");
    const { decodeWordIndex } = await import("@/features/decoder/engine/words-packed");
    const buf = readFileSync("public/data/words-index.bin");
    const palavras = decodeWordIndex(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    );
    expect(palavras.length).toBeGreaterThan(400_000);

    const t0 = performance.now();
    const r = buscarPorPadrao(palavras, "p?nt?");
    const ms = performance.now() - t0;

    expect(r.achados.length).toBeGreaterThan(0);
    expect(r.achados).toContain("ponte");
    expect(ms).toBeLessThan(300);
  });
});
