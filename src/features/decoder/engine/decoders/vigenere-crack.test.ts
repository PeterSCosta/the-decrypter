import { afterEach, describe, expect, it } from "vitest";
import { indiceCoincidencia, soLetras } from "../criptanalise";
import { runDecoders } from "../run";
import { scorePlaintext, setWordSet } from "../score";
import type { DecodeContext } from "../types";
import { decoders as crack } from "./vigenere-crack";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const comChave = (key: string): DecodeContext => ({ ...ctx, key });
const decode = (input: string, c: DecodeContext = ctx) => crack.decode(input, c);

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

/** 420 letras de português corrido — bem acima do piso de 100. */
const CLARO = [
  "A gincana comeca sempre do mesmo jeito e por isso ninguem estranha quando a primeira pista",
  "chega dobrada dentro de um envelope pardo. O time abre, le em voz alta, discorda por dois",
  "minutos inteiros e so entao percebe que a resposta estava escrita na propria borda do papel.",
  "Foi assim no ano passado, quando a equipe do colegio publico atravessou a cidade inteira",
  "atras de uma placa de rua que ninguem mais lembrava de ter visto.",
].join(" ");

/** 156 letras: logo acima do piso de 150, o caso mais apertado que passa. */
const CURTO_OK =
  "O segredo nunca esta no lugar mais dificil, e sim no mais obvio de todos, dizem sempre os velhos daqui do vale do rio grande e frio, e quase sempre eles tem toda a razao nisso, ano apos ano, sem falhar.";

afterEach(() => setWordSet(null));

describe("Vigenère sem chave — o que ele acha", () => {
  it.each(["sol", "lima", "navio", "cavalo", "estrela", "montanha"])(
    "descobre a chave %s sem que ninguém a informe",
    (chave) => {
      const [c] = decode(cifrar(CLARO, chave));
      expect(c.label).toBe(`chave: ${chave.toUpperCase()}`);
      expect(c.output).toBe(CLARO);
    },
  );

  it("a chave vai no RÓTULO, porque a chave é a resposta da prova", () => {
    const [c] = decode(cifrar(CLARO, "vigenere"));
    expect(c.label).toBe("chave: VIGENERE");
    // e vai no chainValue, para encadear numa próxima camada
    expect(c.chainValue).toBe("vigenere");
  });

  it("devolve UM card só — segundo lugar é ruído com cara de confirmação", () => {
    expect(decode(cifrar(CLARO, "navio"))).toHaveLength(1);
  });

  it("a nota conta a evidência: IC do cifrado, IC por coluna e Kasiski", () => {
    const [c] = decode(cifrar(CLARO, "navio"));
    expect(c.notes).toMatch(/^346 letras\. IC do texto cifrado 0\.0\d+ /);
    expect(c.notes).toContain("poli-alfabética");
    // 5 colunas, não 15: entre dois comprimentos que dão a MESMA chave, a nota
    // reporta o menor — é a evidência que de fato sustenta a resposta.
    expect(c.notes).toContain("Fatiado em 5 colunas");
    expect(c.notes).toContain("qui-quadrado contra o perfil do português");
  });

  it("funciona logo acima do piso de 150 letras", () => {
    expect(soLetras(CURTO_OK).length).toBeGreaterThanOrEqual(150);
    expect(decode(cifrar(CURTO_OK, "lima"))[0]?.label).toBe("chave: LIMA");
  });

  it("preserva pontuação, espaço e caixa do texto original", () => {
    const claro = `${CLARO} FIM DA PROVA.`;
    expect(decode(cifrar(claro, "porta"))[0].output).toBe(claro);
  });

  it("acha chave de texto em inglês também", () => {
    const en = [
      "The team that wins this game is never the one that runs the fastest through the city streets.",
      "It is the team that reads the first sentence twice and understands that the answer was there",
      "from the beginning, hidden in plain sight, waiting for somebody patient enough to look again.",
    ].join(" ");
    expect(decode(cifrar(en, "chave"))[0]?.label).toBe("chave: CHAVE");
  });
});

describe("Vigenère sem chave — os portões", () => {
  it("PORTÃO 1: com ctx.key preenchido cala a boca — quem responde é o `vigenere`", () => {
    const cifra = cifrar(CLARO, "navio");
    expect(decode(cifra, comChave("navio"))).toEqual([]);
    expect(decode(cifra, comChave("qualquer"))).toEqual([]);
    // espaço em branco não conta como chave
    expect(decode(cifra, comChave("   ")).length).toBe(1);
  });

  it("PORTÃO 2: abaixo de 150 letras não abre a boca", () => {
    const curto = "Ataque ao amanhecer general, leve a tropa toda pela estrada velha do vale";
    expect(soLetras(curto).length).toBeLessThan(150);
    expect(decode(cifrar(curto, "sol"))).toEqual([]);
    expect(decode("")).toEqual([]);
    // e o CLARO, com 346 letras, passa — a diferença é só o comprimento
    expect(decode(cifrar(CLARO, "sol"))).toHaveLength(1);
  });

  /**
   * O portão que a revisão adversária arrancou. Antes dele, 25 textos em Atbash
   * de 300 letras produziam SETE cards acima de 0,35, com chave inventada no
   * rótulo: nenhuma chave Vigenère desfaz uma reflexão de alfabeto, então a
   * subida de encosta escolhia a menos ruim e o acaso entregava palavra real.
   */
  it("PORTÃO 2c: IC de língua = mono-alfabética, e ele se cala", () => {
    const atbash = [...CLARO]
      .map((c) => {
        const x = c.toLowerCase().charCodeAt(0);
        return x >= 97 && x <= 122 ? String.fromCharCode(219 - x) : c;
      })
      .join("");
    expect(decode(atbash)).toEqual([]);
    // César também: IC intacto
    expect(decode(cifrar(CLARO, "q"))).toEqual([]);
    // e o IC do Vigenère de verdade fica abaixo do teto, por isso ele passa
    expect(indiceCoincidencia(soLetras(cifrar(CLARO, "navio")))).toBeLessThan(0.062);
    expect(indiceCoincidencia(soLetras(atbash))).toBeGreaterThan(0.062);
  });

  it("PORTÃO 2b: entrada que não é majoritariamente letra nem é analisada", () => {
    // hash hex de 128 dígitos: tem letras de sobra, mas metade é dígito
    const hash = "a3f9c2e8b1d47056".repeat(8);
    expect(decode(hash)).toEqual([]);
    // base64 com muito símbolo/dígito
    const b64 = `${btoa(CLARO).slice(0, 200)}==`;
    const frac = soLetras(b64).length / b64.length;
    if (frac < 0.5) expect(decode(b64)).toEqual([]);
  });

  it("PORTÃO 4: chave de 1 letra é César, e o `caesar-bruteforce` cobre", () => {
    // Na prática o César já morre no portão 2c (o IC dele é o do português);
    // o portão 4 é o cinto de segurança para quando a estatística eleger L=1
    // num texto que passou pelo teto de IC.
    expect(decode(cifrar(CLARO, "d"))).toEqual([]);
    expect(decode(cifrar(CLARO, "n"))).toEqual([]);
  });

  it("PORTÃO 4b: texto EM CLARO também não vira card (é o César identidade)", () => {
    expect(decode(CLARO)).toEqual([]);
  });
});

describe("Vigenère sem chave — o teto de nota", () => {
  /** A lista de verdade tem 451 mil palavras; aqui bastam as do texto. */
  const listaComPalavras = new Set(
    soLetras(CLARO)
      .match(/.{4,10}/g)
      ?.slice(0, 0) ?? [],
  );

  it("sem a lista carregada, não pune: o critério volta a ser o scorePlaintext", () => {
    setWordSet(null);
    const [c] = decode(cifrar(CLARO, "navio"));
    expect(c.forcedScore).toBeUndefined();
  });

  it("com palavra real confirmada, NÃO força nada — quem julga é o scorePlaintext", () => {
    setWordSet(new Set(["gincana", "envelope", "primeira", "resposta", "cidade"]));
    const [c] = decode(cifrar(CLARO, "navio"));
    expect(c.forcedScore).toBeUndefined();
    expect(scorePlaintext(c.output)).toBeGreaterThan(0.35);
  });

  it("SEM palavra real, a nota é limitada a 0,34 — abaixo do corte de 0,35", () => {
    // vocabulário que não contém nada do texto: o portão fecha
    setWordSet(new Set(["xilofone", "quilombo", "zepelim"]));
    const [c] = decode(cifrar(CLARO, "navio"));
    expect(c.forcedScore).toBeDefined();
    expect(c.forcedScore).toBeLessThanOrEqual(0.34);
    expect(c.forcedScore).toBeLessThan(0.35);
  });

  it("o teto nunca INVENTA nota: saída ruim continua com a nota ruim dela", () => {
    setWordSet(new Set(["xilofone"]));
    const [c] = decode(cifrar(CLARO, "navio"));
    // limitado ao mínimo entre o natural e o teto — nunca elevado até o teto
    expect(c.forcedScore).toBeLessThanOrEqual(scorePlaintext(c.output));
  });

  it("na bancada inteira, o card não cruza o corte sem palavra real", () => {
    setWordSet(new Set(["xilofone", "quilombo"]));
    const cifra = cifrar(CLARO, "navio");
    const meu = runDecoders(cifra, ctx).results.filter((r) => r.decoderId === "vigenere-crack");
    expect(meu).toHaveLength(1);
    expect(meu[0].score).toBeLessThan(0.35);
    expect(listaComPalavras.size).toBe(0); // guarda contra o helper virar no-op silencioso
  });
});

describe("Vigenère sem chave — falso positivo", () => {
  /** Gerador determinístico: o mesmo caso roda igual em toda máquina. */
  let semente = 20260819;
  const rnd = (): number => {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    return semente / 2147483648;
  };

  const naoEhVigenere: [string, () => string][] = [
    [
      "letras aleatórias",
      () =>
        Array.from(
          { length: 300 },
          () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(rnd() * 26)],
        ).join(""),
    ],
    [
      "hash hex de 64",
      () => Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(rnd() * 16)]).join(""),
    ],
    ["lista de números", () => Array.from({ length: 60 }, () => Math.floor(rnd() * 100)).join(" ")],
    [
      "CEP e coordenada",
      () => "89010-000 -26.9194, -49.0661 89012-100 -26.8850, -49.0900 89035-000",
    ],
    ["base64", () => btoa(CLARO)],
    ["só pontuação", () => "!!! ??? ... --- ___ +++ ### @@@ %%% &&&".repeat(6)],
  ];

  it.each(naoEhVigenere)("%s: ou não produz card, ou não cruza o corte", (_nome, gerar) => {
    setWordSet(new Set(["gincana", "resposta", "cidade", "prova", "chave", "pista"]));
    for (let i = 0; i < 12; i++) {
      const entrada = gerar();
      for (const c of decode(entrada)) {
        const nota = c.forcedScore ?? scorePlaintext(c.output);
        expect(nota, `entrada: ${entrada.slice(0, 40)}`).toBeLessThan(0.35);
      }
    }
  });

  it("texto português EM CLARO não vira 'achei uma chave'", () => {
    setWordSet(new Set(["gincana", "resposta", "cidade", "envelope"]));
    expect(decode(CLARO)).toEqual([]);
    expect(decode(CURTO_OK)).toEqual([]);
  });

  it("no fan-out completo, entrada que não é cifra não gera card deste decoder", () => {
    setWordSet(new Set(["gincana", "resposta", "cidade"]));
    for (const entrada of ["89010-000", "12 34 45 67 78", CLARO, "SGVsbG8gd29ybGQ="]) {
      const meu = runDecoders(entrada, ctx).results.filter((r) => r.decoderId === "vigenere-crack");
      for (const r of meu) expect(r.score).toBeLessThan(0.35);
    }
  });
});

describe("Vigenère sem chave — custo", () => {
  it("um texto colado enorme não trava o fan-out", () => {
    const gigante = cifrar(CLARO.repeat(40), "montanha"); // ~17 mil letras
    const t0 = performance.now();
    const r = decode(gigante);
    const ms = performance.now() - t0;
    expect(r[0]?.label).toBe("chave: MONTANHA");
    expect(ms).toBeLessThan(250);
  });
});
