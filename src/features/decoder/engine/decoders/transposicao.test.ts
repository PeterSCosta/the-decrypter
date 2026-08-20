import { describe, expect, it } from "vitest";
import { setWordSet } from "../score";
import type { DecodeCandidate, DecodeContext } from "../types";
import { decoders } from "./transposicao";

const ctx = { key: "", streets: null, ceps: null } as DecodeContext;
const dec = Array.isArray(decoders) ? decoders[0] : decoders;
const saidas = (t: string) => dec.decode(t, ctx).map((c: DecodeCandidate) => String(c.output));

/** Vocabulário mínimo no formato do `words.ts`: dobrado, minúsculo, ≥4 letras. */
const PT = new Set([
  "ponte",
  "ferro",
  "norte",
  "blumenau",
  "conecta",
  "dois",
  "lados",
  "itajai",
  "resposta",
  "monumento",
  "praca",
  "prefeitura",
  "procure",
  "placa",
  "bronze",
]);
const comVocabulario = () => setWordSet({ has: (w: string) => PT.has(w) });

/** Cifra: escreve por linhas em `cols` colunas e lê por colunas. */
function scytale(texto: string, cols: number): string {
  const s = texto.replace(/[^A-Za-z]/g, "").toUpperCase();
  let out = "";
  for (let c = 0; c < cols; c++) for (let i = c; i < s.length; i += cols) out += s[i];
  return out;
}

const CLARO = "OPONTEDEFERRONORTEDEBLUMENAUCONECTAOSDOISLADOSITAJAI";

describe("transposição sem chave", () => {
  /**
   * O DEFEITO QUE ESTE DECODER EXISTE PARA CONSERTAR.
   *
   * Num scytale de verdade a bancada não calava: respondia `railfence` a 0,62
   * com `ONECTAODSOESLADIRODSROITAOCAIARPONTIEFEDBRONOJEDETNL`, e a resposta
   * certa **não estava na lista**.
   */
  it("acha o scytale em toda a faixa de colunas", () => {
    comVocabulario();
    for (let cols = 2; cols <= 10; cols++) {
      expect(saidas(scytale(CLARO, cols)), `${cols} colunas`).toContain(CLARO);
    }
  });

  it("emite no máximo duas variantes — o topo é o recurso escasso", () => {
    comVocabulario();
    for (let cols = 2; cols <= 10; cols++) {
      expect(dec.decode(scytale(CLARO, cols), ctx).length).toBeLessThanOrEqual(2);
    }
  });

  it("a nota fica acima do 0,62 que o railfence tira com lixo, e abaixo de base real", () => {
    comVocabulario();
    const c = dec.decode(scytale(CLARO, 5), ctx)[0];
    expect(c.forcedScore).toBeGreaterThan(0.62);
    expect(c.forcedScore).toBeLessThanOrEqual(0.82);
  });

  /**
   * O portão é de SAÍDA. Toda variante é anagrama da entrada — só a certa forma
   * palavras. Estas seis famílias são as que já derrubaram portões neste
   * repositório.
   */
  describe("não dispara no que não é transposição", () => {
    const NAO: [string, string][] = [
      ["texto claro", "APONTEDEFERRODONORTEDEBLUMENAUCONECTAOSDOISLADOS"],
      ["letras aleatórias", "XKQZWVBHJFGYPLMNRSTDCVBNMQWERTYUIOPASDFGHJKLZXCV"],
      ["dígitos", "89010000890100008901000089010000890100008901000"],
      ["base64", "SGVsbG8gbXVuZG8gZXN0ZSBlIHVtIHRlc3RlIGRlIGJhc2U2NA"],
      ["morse", ".... . .-.. .-.. --- -- ..- -. -.. ---"],
      ["uma letra repetida", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
    ];
    for (const [nome, entrada] of NAO) {
      it(nome, () => {
        comVocabulario();
        expect(saidas(entrada)).toHaveLength(0);
      });
    }
  });

  it("texto que JÁ é português não é embaralhado — sai pelo retorno antecipado", () => {
    comVocabulario();
    expect(saidas("OPONTEDEFERRONORTEDEBLUMENAUCONECTA")).toHaveLength(0);
  });

  it("abaixo de 20 letras não emite — anagrama curto forma palavra por acaso", () => {
    comVocabulario();
    expect(saidas(scytale("OPONTEDEFERRO", 3))).toHaveLength(0);
  });

  /**
   * Sem vocabulário não há como verificar, e 22 anagramas sem verificação são
   * 22 palpites. Calar é a resposta certa — e é o oposto do que o `railfence`
   * faz hoje, que é falar sempre.
   */
  it("sem vocabulário carregado, não emite nada", () => {
    setWordSet(null);
    expect(saidas(scytale(CLARO, 5))).toHaveLength(0);
  });

  /**
   * O TETO DE TRABALHO, medido.
   *
   * A preocupação registrada no plano era que ~22 variantes caíssem em cima do
   * pior caso do fan-out (44,8 ms num bloco de 60 letras). Medido: **1,05 ms**
   * no pior caso real, 3% do fan-out, e 0,02 ms em texto claro por causa do
   * retorno antecipado. Se este número disparar, alguém afrouxou um portão.
   */
  it("custa menos de 5 ms mesmo na pior entrada", () => {
    comVocabulario();
    const pior = scytale((CLARO + CLARO + CLARO + CLARO).slice(0, 225), 7);
    for (let i = 0; i < 5; i++) dec.decode(pior, ctx);
    let melhor = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      dec.decode(pior, ctx);
      melhor = Math.min(melhor, performance.now() - t0);
    }
    expect(melhor).toBeLessThan(5);
  });

  /**
   * O PORTÃO CONTRA O VOCABULÁRIO DE VERDADE.
   *
   * Os testes acima usam um conjunto de 15 palavras, e é por isso que eles
   * sozinhos não bastam: com as **451.016** palavras reais (pt + en) um anagrama
   * de 55 letras quase sempre contém alguma sequência de 5 letras da lista. A
   * primeira versão deste decoder calibrou no conjunto pequeno e, medida contra
   * o real, deixava passar **13% de variantes erradas** — e pior, calava na
   * resposta certa, porque a entrada cifrada também tinha `maior=5` e disparava
   * o retorno antecipado.
   *
   * Este teste carrega o índice real do disco. Se ele ficar lento demais para o
   * CI, o caminho é reduzir a amostra — nunca voltar ao conjunto pequeno, que é
   * o que escondeu o defeito.
   */
  it("com o vocabulário REAL: acha tudo e não inventa nada", async () => {
    const { readFileSync } = await import("node:fs");
    const { decodeWordIndex } = await import("../words-packed");
    const buf = readFileSync("public/data/words-index.bin");
    const reais = new Set(
      decodeWordIndex(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
    );
    setWordSet({ has: (w: string) => reais.has(w) });

    const CLAROS = [
      "ARESPOSTAESTANOMONUMENTOAOSPIONEIROSDAPRACADAPREFEITURA",
      "OPONTEDEFERRONORTEDEBLUMENAUCONECTAOSDOISLADOSDORIOITAJAI",
      "OTEATROCARLOSGOMESFICANARUAQUINZEDENOVEMBRONOCENTRO",
    ];
    for (const claro of CLAROS)
      for (let cols = 2; cols <= 10; cols++)
        expect(saidas(scytale(claro, cols)), `${claro.slice(0, 12)}… em ${cols}`).toContain(claro);

    // E o texto claro, que é a outra metade: não se embaralha o que já se lê.
    for (const claro of CLAROS) expect(saidas(claro), claro.slice(0, 12)).toHaveLength(0);

    const RUIDO = [
      "XKQZWVBHJFGYPLMNRSTDCVBNMQWERTYUIOPASDFGHJKLZXCVBNMQWE",
      "SGVsbG8gbXVuZG8gZXN0ZSBlIHVtIHRlc3RlIGRlIGJhc2U2NCBsb25n",
      "890100008901000089010000890100008901000089010000890100",
      "LOREMIPSUMDOLORSITAMETCONSECTETURADIPISCINGELITSEDDOEIU",
      "QWERTYUIOPASDFGHJKLZXCVBNMQWERTYUIOPASDFGHJKLZXCVBNMQWE",
    ];
    for (const r of RUIDO) expect(saidas(r), r.slice(0, 24)).toHaveLength(0);
  });

  /**
   * A GRADE IRREGULAR — o defeito que quase passou.
   *
   * Desfazer o scytale com "ler por colunas usando o número de linhas" só vale
   * quando `len % cols === 0`. Fora disso as colunas têm alturas diferentes (as
   * `len % cols` primeiras têm uma linha a mais), e o atalho desalinha tudo a
   * partir da primeira coluna curta. Medido antes do conserto: o decoder achava
   * só as colunas que dividem o comprimento exato e falhava em todas as outras.
   *
   * O teste calcula quais colunas são irregulares em vez de chutar — assim ele
   * continua valendo se alguém trocar o texto de exemplo.
   */
  it("a grade irregular é tratada — o atalho ingênuo só valia em grade perfeita", () => {
    comVocabulario();
    const irregulares = [2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => CLARO.length % n !== 0);
    expect(irregulares.length, "o texto de exemplo virou divisível por tudo").toBeGreaterThan(2);
    for (const cols of irregulares) {
      expect(saidas(scytale(CLARO, cols)), `${cols} colunas (grade irregular)`).toContain(CLARO);
    }
  });
});
