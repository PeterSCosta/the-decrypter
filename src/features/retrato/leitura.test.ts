import { describe, expect, it } from "vitest";
import {
  ENCAIXE_ALTO,
  MIN_LETRAS_VEREDITO,
  lerRetrato,
  perfilDeColuna,
  periodoProvavel,
  retratoDoTexto,
} from "./leitura";

/**
 * O QUE ESTE TESTE PRENDE.
 *
 * O cálculo já é testado em `criptanalise.test.ts` — aqui o que está em jogo é a
 * AFIRMAÇÃO: "IC natural sem perfil de idioma significa substituição
 * monoalfabética". Se ela estiver errada, a aba mente com números de verdade do
 * lado, que é a pior combinação possível.
 */

/**
 * As cifras vivem AQUI, e não vêm do `ciphers.ts`, porque lá elas são objetos
 * `Decoder` (com `decode(input, ctx)`), não funções. Escrever as duas em cinco
 * linhas é mais honesto que montar um contexto falso só para cifrar.
 */
const soLetra = (t: string) => t.replace(/[^a-zA-Z]/g, "").toUpperCase();

function cifraCesar(texto: string, n: number): string {
  return soLetra(texto).replace(/[A-Z]/g, (c) =>
    String.fromCharCode(((c.charCodeAt(0) - 65 + n + 26) % 26) + 65),
  );
}

function cifraVigenere(texto: string, chave: string): string {
  const k = soLetra(chave);
  let i = 0;
  return soLetra(texto).replace(/[A-Z]/g, (c) => {
    const d = k.charCodeAt(i++ % k.length) - 65;
    return String.fromCharCode(((c.charCodeAt(0) - 65 + d) % 26) + 65);
  });
}

/** Atalho: a aba sempre lê o retrato COM o texto ao lado. */
const ler = (t: string) => lerRetrato(retratoDoTexto(t), t);

/** Português corrido, longo o bastante para o motor afirmar idioma (≥150 letras). */
const PT = [
  "A resposta desta prova esta escondida no monumento aos pioneiros que fica na praca",
  "da prefeitura de Blumenau. Procure a placa de bronze na base do monumento e conte",
  "quantas letras tem o nome do primeiro colono citado na inscricao. Esse numero e a",
  "chave da proxima etapa, e voce vai precisar dele antes da meia noite de sabado.",
].join(" ");

/** Sorteio determinístico (xorshift semeado): o teste não pode variar. */
function ruido(n: number): string {
  let x = 2463534242;
  const rnd = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  return Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(rnd() * 26))).join("");
}

describe("leitura do retrato", () => {
  it("texto claro em português é reconhecido como claro", () => {
    const l = ler(PT);
    expect(l.veredito).toBe("claro");
    expect(l.confiavel).toBe(true);
    expect(l.titulo).toContain("português");
  });

  /**
   * A afirmação central da aba: César embaralha o PERFIL e não mexe no IC.
   * É por isso que a bancada consegue dizer "é substituição" sem decifrar nada.
   */
  it("César é lido como substituição monoalfabética, não como polialfabética", () => {
    const l = ler(cifraCesar(PT, 7));
    expect(l.veredito).toBe("monoalfabetica");
    expect(l.sugestao).toContain("César");
  });

  /**
   * O CASO QUE DERRUBOU A PRIMEIRA VERSÃO DESTA LEITURA.
   *
   * Ela tinha um `ENCAIXE_BAIXO = 0,4`: abaixo disso era "não é texto", entre
   * 0,4 e 0,7 era "polialfabética". Medido, o encaixe global de um Vigenère fica
   * entre **0,07 e 0,22** — mais perto do ruído (0,03) que de qualquer corte.
   * Nenhum limiar global separa os dois: o erro era de espécie, não de valor.
   */
  it("Vigenère é lido como polialfabética, e a chave é nomeada", () => {
    for (const chave of ["SOL", "GINCANA", "BLUMENAUSCBR"]) {
      const l = ler(cifraVigenere(PT, chave));
      expect(l.veredito, chave).toBe("polialfabetica");
      expect(l.titulo, chave).toMatch(/chave de \d+ letras?/);
    }
  });

  it("o período reportado é o MENOR que acende, não o de maior encaixe", () => {
    // Chave de 3: as colunas 6, 9 e 12 também acendem, e reportar 12 seria
    // dizer a verdade da forma menos útil possível.
    expect(ler(cifraVigenere(PT, "SOL")).titulo).toContain("chave de 3");
  });

  it("ruído aleatório não vira cifra — nenhuma coluna acende", () => {
    expect(ler(ruido(400)).veredito).toBe("nao-e-texto");
  });

  /**
   * O QUE A ABA SE RECUSA A DIZER — e é a metade que impede a mentira.
   * Abaixo de 150 letras o próprio motor não afirma idioma, porque foi medido
   * que não há corte que separe.
   */
  it("amostra curta não recebe veredito, e a tela diz isso", () => {
    const l = ler("A resposta esta na praca da prefeitura");
    expect(l.veredito).toBe("curto");
    expect(l.confiavel).toBe(false);
    expect(l.titulo).toContain("Amostra curta");
  });

  it("o piso da amostra é o mesmo do motor — não há dois números", () => {
    expect(ler(soLetra(PT).slice(0, MIN_LETRAS_VEREDITO - 1)).veredito).toBe("curto");
  });

  it("toda leitura confiável traz o porquê e a sugestão preenchidos", () => {
    for (const t of [PT, cifraCesar(PT, 3), cifraVigenere(PT, "CHAVE"), ruido(400)]) {
      const l = ler(t);
      expect(l.porque.length, l.titulo).toBeGreaterThan(20);
      expect(l.sugestao.length, l.titulo).toBeGreaterThan(20);
    }
  });
});

describe("período por coluna", () => {
  it("acha o comprimento da chave num Vigenère", () => {
    for (const [chave, esperado] of [
      ["SOL", 3],
      ["GINCANA", 7],
      ["BLUMENAUSCBR", 12],
    ] as const) {
      const p = periodoProvavel(cifraVigenere(PT, chave));
      expect(p, chave).toBeTruthy();
      expect(esperado % (p?.n ?? 1), `${chave} → ${p?.n}`).toBe(0);
    }
  });

  it("não acha período nenhum em ruído — é o que separa dos dois casos acima", () => {
    expect(periodoProvavel(ruido(400))).toBeNull();
  });

  it("o encaixe da coluna certa é alto de verdade, não marginal", () => {
    expect(periodoProvavel(cifraVigenere(PT, "GINCANA"))?.encaixe).toBeGreaterThan(ENCAIXE_ALTO);
  });

  it("devolve a lista inteira, não só o vencedor", () => {
    expect(perfilDeColuna(PT, 12)).toHaveLength(12);
  });
});
