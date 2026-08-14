import { describe, expect, it } from "vitest";
import { type Valor, compile, run, truthy } from "./expr";

/** Avalia e devolve o valor — o teste fica legível e a falha aponta a expressão. */
function v(fonte: string, vars: Record<string, Valor> = {}): Valor {
  const r = run(fonte, { vars });
  if (!r.ok) throw new Error(`${fonte} → ${r.erro.mensagem} (pos ${r.erro.pos})`);
  return r.valor;
}

/** A condição como o motor de regras a usa: verdadeira ou falsa. */
const cond = (fonte: string, vars: Record<string, Valor> = {}) => truthy(v(fonte, vars));

function erro(fonte: string, vars: Record<string, Valor> = {}) {
  const r = run(fonte, { vars });
  if (r.ok) throw new Error(`${fonte} devia ter falhado, deu ${String(r.valor)}`);
  return r.erro;
}

describe("aritmética e precedência", () => {
  it("multiplicação antes de soma, e o parêntese manda", () => {
    expect(v("2 + 3 * 4")).toBe(14);
    expect(v("(2 + 3) * 4")).toBe(20);
  });

  it("potência é associativa à direita e mais forte que o menos unário", () => {
    expect(v("2 ^ 3 ^ 2")).toBe(512);
    expect(v("-2 ^ 2")).toBe(-4);
    expect(v("2 ^ -1")).toBe(0.5);
  });

  it("resto é sempre positivo — é o que a contagem de posição espera", () => {
    expect(v("resto(-1, 3)")).toBe(2);
    expect(v("7 % 3")).toBe(1);
  });

  it("divisão por zero vira mensagem, não Infinity silencioso", () => {
    expect(erro("1 / 0").mensagem).toBe("divisão por zero");
  });

  it("soma número com número; junta texto com o resto", () => {
    expect(v("1 + 2")).toBe(3);
    expect(v('"A" + 1')).toBe("A1");
  });
});

describe("comparação e lógica", () => {
  it("compara número com número mesmo quando um veio como texto", () => {
    expect(cond('2 = "2"')).toBe(true);
    expect(cond("n > 3", { n: 5 })).toBe(true);
    expect(cond("n >= 5 e n <= 5", { n: 5 })).toBe(true);
  });

  it("compara texto sem acento e sem caixa", () => {
    expect(cond('"café" = "CAFE"')).toBe(true);
    expect(cond('"a" != "b"')).toBe(true);
    expect(cond('"a" <> "b"')).toBe(true);
  });

  it("aceita e/ou/não, os símbolos e os apelidos em inglês", () => {
    expect(cond("verdadeiro e nao falso")).toBe(true);
    expect(cond("true && !false")).toBe(true);
    expect(cond("falso ou verdadeiro")).toBe(true);
    expect(cond("false or true")).toBe(true);
    expect(cond("NÃO falso")).toBe(true);
  });

  it("em: lista com separador, lista colada e array de verdade", () => {
    expect(cond('"a" em "A,E,I,O,U"')).toBe(true);
    expect(cond('"e" em "AEIOU"')).toBe(true);
    expect(cond('"x" em "AEIOU"')).toBe(false);
    expect(cond("v em lista", { v: "3", lista: [1, 2, 3] })).toBe(true);
  });

  it("célula sem número é falsa, célula vazia também", () => {
    expect(truthy(Number.NaN)).toBe(false);
    expect(cond("n", { n: Number.NaN })).toBe(false);
    expect(cond("v", { v: "  " })).toBe(false);
    expect(cond("v", { v: "A" })).toBe(true);
  });
});

describe("biblioteca de funções", () => {
  const linha = { linha: [1, 2, 3, 10], linhatxt: ["A", "E", "b", ""] };

  it("agrega a linha inteira", () => {
    expect(v("soma(linha)", linha)).toBe(16);
    expect(v("media(1, 2, 3)")).toBe(2);
    expect(v("min(linha)", linha)).toBe(1);
    expect(v("max(linha)", linha)).toBe(10);
  });

  it("conta com padrão é o que dá 'linha com mais de 2 vogais'", () => {
    expect(v("conta(linhaTxt)", linha)).toBe(3);
    expect(v('conta(linhaTxt, "[aeiou]")', linha)).toBe(2);
    expect(cond('conta(linhaTxt, "[aeiou]") > 1', linha)).toBe(true);
  });

  it("números: raiz, absoluto, par, ímpar, primo e quadrado perfeito", () => {
    expect(v("raiz(9)")).toBe(3);
    expect(v("abs(-4)")).toBe(4);
    expect(cond("par(4)")).toBe(true);
    expect(cond("impar(-3)")).toBe(true);
    expect(cond("primo(7)")).toBe(true);
    expect(cond("primo(9)")).toBe(false);
    expect(cond("primo(1)")).toBe(false);
    expect(cond("quadrado(16)")).toBe(true);
    expect(cond("quadrado(15)")).toBe(false);
  });

  it("texto: contém/começa/termina ignoram acento e caixa", () => {
    expect(cond('contem("CAFÉ", "afe")')).toBe(true);
    expect(cond('comeca("Ácido", "aci")')).toBe(true);
    expect(cond('termina("Ácido", "DO")')).toBe(true);
    expect(v('maiusc("olá")')).toBe("OLÁ");
    expect(v('minusc("OLÁ")')).toBe("olá");
    expect(v('tam("casa")')).toBe(4);
  });

  it("classes de célula e a posição no alfabeto", () => {
    expect(cond('vogal("É")')).toBe(true);
    expect(cond('consoante("x")')).toBe(true);
    expect(cond('digito("7")')).toBe(true);
    expect(cond('letra("ç")')).toBe(true);
    expect(cond('vazio(" ")')).toBe(true);
    expect(v('ord("b")')).toBe(2);
    expect(v('ord("É")')).toBe(5);
    expect(v('num("1,5")')).toBe(1.5);
  });

  it("casa aceita expressão regular", () => {
    expect(cond('casa(v, "^[A-Z]$")', { v: "Q" })).toBe(true);
    expect(cond('casa(v, "^\\\\d+$")', { v: "123" })).toBe(true);
    expect(erro('casa("a", "[")').mensagem).toContain("expressão regular inválida");
  });

  it("os apelidos em inglês valem o mesmo", () => {
    expect(v("sum(1, 2)")).toBe(3);
    expect(v("count(lista)", { lista: ["a", "", "b"] })).toBe(2);
    expect(cond("even(2) and prime(3)")).toBe(true);
    expect(v('upper("ab")')).toBe("AB");
  });

  it("acento e caixa no nome não atrapalham", () => {
    expect(v("MÉDIA(2, 4)")).toBe(3);
    expect(v("NCOLS", { ncols: 8 })).toBe(8);
  });
});

describe("erros legíveis, com a posição", () => {
  it("aponta onde a expressão terminou no meio", () => {
    const e = erro("1 + ");
    expect(e.mensagem).toBe("a expressão terminou no meio");
    expect(e.pos).toBe(4);
  });

  it("aponta o operador que não devia estar ali", () => {
    expect(erro("2 + * 3").pos).toBe(4);
    expect(erro("2 + * 3").mensagem).toBe("esperava um valor");
  });

  it("cobra o parêntese e as aspas que faltam", () => {
    expect(erro("(1 + 2").mensagem).toBe("falta fechar o parêntese");
    expect(erro("1)").mensagem).toBe("sobrou coisa depois do fim da expressão");
    expect(erro('"abc').mensagem).toBe("falta fechar as aspas do texto");
    expect(erro("soma(1, 2").mensagem).toContain("falta fechar o parêntese");
  });

  it("diz o que não conhece, em vez de estourar", () => {
    expect(erro("xyz").mensagem).toBe('não conheço "xyz"');
    expect(erro("fazer(1)").mensagem).toBe('não conheço a função "fazer"');
    expect(erro("@").mensagem).toBe('não entendi o caractere "@"');
  });

  it("compile devolve o erro como dado, sem lançar", () => {
    const c = compile("1 +");
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.erro.pos).toBe(3);
  });
});

describe("segurança — a linguagem não alcança o navegador", () => {
  it("não existe constructor, globalThis, window nem process", () => {
    for (const alvo of ["constructor", "globalThis", "window", "process", "eval"]) {
      expect(erro(alvo).mensagem).toContain("não conheço");
    }
  });

  it("colchete e ponto de acesso a propriedade nem entram no tokenizador", () => {
    expect(erro('v["constructor"]', { v: "a" }).mensagem).toContain("não entendi o caractere");
    expect(erro("v.constructor", { v: "a" }).mensagem).toContain("não entendi o caractere");
  });

  it("só enxerga as variáveis e funções entregues na chamada", () => {
    expect(cond("v = 1", { v: 1 })).toBe(true);
    expect(erro("v").mensagem).toBe('não conheço "v"');
  });
});
