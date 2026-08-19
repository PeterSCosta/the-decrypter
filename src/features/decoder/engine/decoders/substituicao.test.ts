import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { setWordSet } from "../score";
import { carregarQuadgramas } from "../substituicao";
import type { DecodeContext } from "../types";
import { stripDiacritics } from "../util";
import { decoders as substituicao } from "./substituicao";

/**
 * A tabela de quadrigramas (161 KB) entra por `import()` sob demanda — no
 * navegador quem dispara é o próprio decoder, e o `use-decoder` refaz a rodada
 * quando ela chega. Aqui o teste carrega antes, senão todo caso mediria o
 * estado "tabela ainda não chegou", em que o decoder devolve vazio de propósito.
 */
beforeAll(async () => {
  await carregarQuadgramas();
});

/**
 * Este arquivo mede o PORTÃO, não a cifra.
 *
 * A subida de encosta devolve, para QUALQUER texto de letras, a leitura mais
 * pronunciável que existe naquele espaço de chaves — então o risco deste
 * decoder não é errar, é errar com nota alta. O que está aqui embaixo é a
 * bateria de coisas que NÃO são substituição, jogadas contra ele.
 *
 * O vocabulário é o de verdade (`public/data/words-*.txt`, 451 mil palavras) e
 * não um `Set` de brinquedo, porque o falso positivo que interessa nasce
 * justamente da lista grande: com 451 mil palavras, um trecho de 4 letras cair
 * no dicionário por acaso é comum — e foi assim que a primeira versão deixou o
 * inglês em claro cruzar o corte com 0,493.
 */

const A = 97;
const ctx = {} as DecodeContext;
const roda = (input: string) => substituicao.decode(input, ctx);
/** O corte do `partition` — o que separa "resposta" de "hipótese na gaveta". */
const CORTE = 0.35;

let VOCAB: Set<string>;

beforeAll(() => {
  VOCAB = new Set<string>();
  for (const arquivo of ["words-pt.txt", "words-en.txt"]) {
    const caminho = resolve(process.cwd(), "public/data", arquivo);
    for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
      const w = stripDiacritics(linha.trim()).toLowerCase();
      if (/^[a-z]{4,15}$/.test(w)) VOCAB.add(w);
    }
  }
});

afterEach(() => setWordSet(null));

function alfabeto(semente: number): number[] {
  let s = semente >>> 0 || 1;
  const rnd = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  const a = [...Array(26).keys()];
  for (let i = 25; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const cifrar = (texto: string, alfa: number[]) =>
  [...texto]
    .map((ch) => {
      const c = ch.charCodeAt(0) - A;
      return c >= 0 && c < 26 ? String.fromCharCode(A + alfa[c]) : ch;
    })
    .join("");

function vigenere(texto: string, chave: string): string {
  let out = "";
  let k = 0;
  for (const ch of texto) {
    const c = ch.charCodeAt(0) - A;
    if (c >= 0 && c < 26) {
      out += String.fromCharCode(A + ((c + chave.charCodeAt(k % chave.length) - A) % 26));
      k++;
    } else out += ch;
  }
  return out;
}

/** Transposição colunar: mexe na ORDEM, então preserva IC e frequências. */
function transpor(texto: string, colunas: number): string {
  const s = texto.replace(/[^a-z]/g, "");
  let out = "";
  for (let c = 0; c < colunas; c++) for (let i = c; i < s.length; i += colunas) out += s[i];
  return out;
}

function aleatorias(n: number, semente: number): string {
  let s = semente >>> 0;
  let out = "";
  for (let i = 0; i < n; i++) {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    out += String.fromCharCode(A + Math.floor((s / 4294967296) * 26));
  }
  return out;
}

const CLARO =
  "a resposta desta etapa esta escondida embaixo da ponte de ferro que fica perto da " +
  "estacao central da cidade e para chegar ate ela a equipe precisa seguir pela avenida " +
  "principal ate o cruzamento com a rua das flores onde existe uma placa antiga";

const CLARO2 =
  "quando o relogio da igreja marcar meio dia siga para a praca central e conte os " +
  "degraus da escada que leva ate a porta lateral do museu municipal onde o proximo " +
  "envelope foi escondido pela comissao organizadora";

const INGLES =
  "the committee reviewed the annual report and decided that the proposal should be " +
  "accepted before the end of the current fiscal year without any further discussion";

const RUAS =
  "rua sao paulo rua quinze de novembro rua doutor amadeu da luz rua padre jacobs " +
  "avenida brasil rua hermann hering rua bahia rua sete de setembro rua martin luther";

describe("substituição monoalfabética: acha a resposta", () => {
  it("decifra um texto cifrado de verdade e passa do corte", () => {
    setWordSet(VOCAB);
    const [card] = roda(cifrar(CLARO, alfabeto(4242)));
    expect(card).toBeDefined();
    expect(card.output).toBe(CLARO);
    expect(card.forcedScore).toBeGreaterThan(CORTE);
  });

  it("decifra também quando a resposta chega COLADA, sem espaço", () => {
    setWordSet(VOCAB);
    const colado = CLARO.replace(/ /g, "");
    const [card] = roda(cifrar(colado, alfabeto(4242)));
    expect(card).toBeDefined();
    expect(card.output).toBe(colado);
    // `realWords` só enxerga token inteiro: sem a segmentação do texto colado,
    // esta resposta certa mediria cobertura 0 e morreria na gaveta.
    expect(card.forcedScore).toBeGreaterThan(CORTE);
  });

  it("decifra em CAIXA ALTA, que é como a resposta costuma chegar", () => {
    setWordSet(VOCAB);
    const [card] = roda(cifrar(CLARO, alfabeto(4242)).toUpperCase());
    expect(card).toBeDefined();
    expect(card.output).toBe(CLARO.toUpperCase());
    expect(card.forcedScore).toBeGreaterThan(CORTE);
  });

  it("a mesma entrada dá sempre o mesmo card (nada de piscar por tecla)", () => {
    setWordSet(VOCAB);
    const entrada = cifrar(CLARO, alfabeto(77));
    const a = roda(entrada);
    const b = roda(entrada);
    expect(b[0].output).toBe(a[0].output);
    expect(b[0].forcedScore).toBe(a[0].forcedScore);
    expect(b[0].label).toBe(a[0].label);
  });
});

describe("substituição monoalfabética: os portões", () => {
  it("texto curto demais nem entra na corrida", () => {
    setWordSet(VOCAB);
    const curto = CLARO.slice(0, 80);
    expect(curto.replace(/[^a-z]/g, "").length).toBeLessThan(100);
    expect(roda(cifrar(curto, alfabeto(4242)))).toEqual([]);
  });

  it("dígito na entrada é A1Z26/ASCII/CEP, não substituição", () => {
    setWordSet(VOCAB);
    expect(roda(`${cifrar(CLARO, alfabeto(1))} 12 5 20`)).toEqual([]);
  });

  it("alfabeto pobre demais não é prosa cifrada", () => {
    setWordSet(VOCAB);
    expect(roda("abababab ".repeat(20))).toEqual([]);
  });

  it("texto já em claro sai pelo portão barato, sem pagar a subida", () => {
    setWordSet(VOCAB);
    // Vale para as duas línguas da lista. Sem este portão, colar um parágrafo
    // custava 25,4 ms POR TECLA para no fim descartar a resposta lá embaixo.
    expect(roda(CLARO)).toEqual([]);
    expect(roda(CLARO2)).toEqual([]);
    expect(roda(INGLES)).toEqual([]);
  });

  it("sem a lista de palavras carregada, o card fica na gaveta", () => {
    setWordSet(null);
    const [card] = roda(cifrar(CLARO, alfabeto(4242)));
    expect(card).toBeDefined();
    // A leitura está certa, mas não há como conferir — e o `scorePlaintext`,
    // que seria a alternativa, é justamente o que a subida sabe enganar.
    expect(card.output).toBe(CLARO);
    expect(card.forcedScore).toBeLessThan(CORTE);
  });
});

describe("substituição monoalfabética: o que NÃO pode acender", () => {
  /** Barrados antes da subida — não custam nem os 20 ms. */
  const semCard: [string, string][] = [
    ["Vigenère (chave CHAVE)", vigenere(CLARO, "chave")],
    ["Vigenère (chave LIMA)", vigenere(CLARO, "lima")],
    ["letras aleatórias coladas", aleatorias(230, 31337)],
    [
      "base64 sem dígitos",
      "SGVsbG8gd29ybGQgdGhpcyBpcyBhIHRlc3Qgb2YgYmFzZSBzaXh0eSBmb3VyIGVuY29kaW5n".repeat(2),
    ],
    ["uma palavra repetida", "prova ".repeat(30)],
    ["inglês em claro", INGLES],
    ["lista de ruas em claro", RUAS],
    [
      "lista de nomes próprios",
      "joao maria pedro ana carlos beatriz rafael luiza gabriel fernanda ricardo juliana marcos",
    ],
  ];

  for (const [nome, entrada] of semCard) {
    it(`${nome}: nem entra na corrida`, () => {
      setWordSet(VOCAB);
      expect(roda(entrada)).toEqual([]);
    });
  }

  /** Estes passam pelos portões baratos; é a cobertura que os segura. */
  const naGaveta: [string, string, number][] = [
    ["transposição colunar de 7", transpor(CLARO, 7), 24],
    ["transposição colunar de 5", transpor(CLARO2, 5), 17],
    ["ruas cifradas", cifrar(RUAS, alfabeto(8)), 11],
    ["inglês cifrado", cifrar(INGLES, alfabeto(21)), 4],
    ["Vigenère de chave 2 (quase César)", vigenere(CLARO, "ab"), 2],
  ];

  for (const [nome, entrada, coberturaEsperada] of naGaveta) {
    it(`${nome}: cala, ou sai no piso longe do corte`, () => {
      setWordSet(VOCAB);
      const [card] = roda(entrada);

      /**
       * O piso subiu de 100 para 200 letras (ver `MIN_LETRAS`), e com isso
       * parte destas entradas passou de "card na gaveta" para NENHUM card. As
       * duas saídas são aceitáveis, e a segunda é melhor: quem não tem texto
       * para sustentar a estatística não deveria nem ocupar linha.
       *
       * O que este teste continua prendendo é o que importa — nenhuma delas
       * cruza o corte — e, quando o card existe, a cobertura que o mantém
       * embaixo.
       */
      if (!card) return;
      expect(card.forcedScore).toBeLessThan(CORTE);
      // A cobertura é a razão de ficar na gaveta, e é o número que não pode
      // regredir: 24% é o pior falso positivo da bateria, contra 64% do pior
      // verdadeiro. Os 40 pontos de vão são o que sustenta o corte de 45%.
      const medida = Number(card.notes?.match(/cobre só (\d+)%/)?.[1]);
      expect(medida).toBe(coberturaEsperada);
      expect(medida).toBeLessThan(45);
    });
  }

  it("a transposição colunar é o falso positivo mais perigoso, e é o guardado aqui", () => {
    setWordSet(VOCAB);
    // Transposição preserva IC e frequências, então passa em todo portão
    // barato; a leitura devolvida é pronunciável e cheia de trechos de 4 letras
    // que estão no dicionário. Com o piso de pedaço em 4 ela media 53% e só não
    // subia por sorte do `scorePlaintext`. Sorte não é portão.
    const [card] = roda(transpor(CLARO, 7));
    expect(card.forcedScore).toBe(0.32);
    expect(card.notes).toMatch(/a subida sempre devolve algo pronunciável/);
  });
});
