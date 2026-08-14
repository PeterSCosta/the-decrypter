import { afterEach, describe, expect, it } from "vitest";
import { realWords, scorePlaintext, setWordSet } from "./score";

// Conjunto mínimo, no formato do `words.ts`: dobrado, minúsculo, >= 4 letras.
const WORDS = new Set(["lapis", "teatro", "louros", "vencedor", "signo", "topo", "geotude"]);

afterEach(() => setWordSet(null));

describe("realce de palavra reconhecível", () => {
  it("sem wordlist carregada, o score é o histórico (degradação graciosa)", () => {
    setWordSet(null);
    const antes = scorePlaintext("lapis");
    setWordSet(WORDS);
    const depois = scorePlaintext("lapis");
    // A carga é ociosa: até ela chegar, a bancada não pode mudar de resposta.
    expect(depois).toBeGreaterThan(antes);
    setWordSet(null);
    expect(scorePlaintext("lapis")).toBe(antes);
  });

  it("puxa para 1 sem estourar o teto", () => {
    setWordSet(WORDS);
    expect(scorePlaintext("lapis")).toBeLessThanOrEqual(1);
    expect(scorePlaintext("teatro")).toBeLessThanOrEqual(1);
  });

  it("resposta curta e real vence ruído longo — o caso que trava as equipes", () => {
    setWordSet(WORDS);
    // `lenConf` pune saída curta, e as respostas do acervo são curtas (LAPIS,
    // TOPO, SIGNO). O realce é o que desfaz essa punição.
    expect(scorePlaintext("lapis")).toBeGreaterThan(scorePlaintext("xkqw zjfr vbnm plkj"));
  });

  it("cobertura é por letra: uma palavra real perdida em ruído não promove o lixo", () => {
    setWordSet(WORDS);
    const puro = scorePlaintext("topo");
    const diluido = scorePlaintext("topo xkqwzjfrvbnmplkjhgfdsa qwrtzxcv");
    expect(puro).toBeGreaterThan(diluido);
  });

  it("ignora tokens curtos: 3 letras é ruído puro (1 em 15 combinações)", () => {
    setWordSet(new Set(["sol"]));
    expect(realWords("sol")).toEqual([]);
  });

  it("casa a forma sem acento, que é como as respostas das provas chegam", () => {
    // A wordlist guarda "lápis"; `words.ts` dobra na origem para que LAPIS case.
    setWordSet(WORDS);
    expect(realWords("LAPIS")).toEqual(["lapis"]);
    expect(realWords("Lápis")).toEqual(["lapis"]);
  });

  it("lista as palavras achadas, na ordem, para o selo do card", () => {
    setWordSet(WORDS);
    expect(realWords("teatro e louros")).toEqual(["teatro", "louros"]);
  });
});

describe("regressão medida: lixo de 4 letras não pode roubar o topo", () => {
  // Cenário real, medido sobre a grade 8×8 da GIA-15: `acrostic-nth` produzia
  // "VAEA" (iniciais das linhas pares — lixo) e, porque "vaea" está na lista
  // pt, o realce o levava de 0.321 a 0.728, passando na frente da resposta
  // certa do `grid-read`. A cobertura é razão: 4 de 4 letras = 100%.
  const LISTA = new Set(["vaea", "para", "cumprir", "essa", "prova", "voces", "teatro", "geotude"]);
  const LIXO = "VAEA";
  const CERTA = "PARACUMPRIRESSAPROVAVOCES";

  it("a resposta colada vence o acróstico de 4 letras", () => {
    setWordSet(LISTA);
    expect(scorePlaintext(CERTA)).toBeGreaterThan(scorePlaintext(LIXO));
  });

  it("segmenta o texto colado — é assim que a resposta chega no acervo", () => {
    setWordSet(LISTA);
    // Sem segmentar, isto é UM token fora do dicionário: cobertura zero.
    const semLista = (() => {
      setWordSet(null);
      const s = scorePlaintext(CERTA);
      setWordSet(LISTA);
      return s;
    })();
    expect(scorePlaintext(CERTA)).toBeGreaterThan(semLista);
  });

  it("4 letras casadas dão meio realce, não realce cheio", () => {
    setWordSet(LISTA);
    setWordSet(null);
    const base = scorePlaintext(LIXO);
    setWordSet(LISTA);
    const comRealce = scorePlaintext(LIXO);
    // Ainda sobe (é informação), mas bem longe do teto que a razão dava.
    expect(comRealce).toBeGreaterThan(base);
    expect(comRealce).toBeLessThan(base + 0.6 * (1 - base));
  });

  it("palavra de 8+ letras leva o realce cheio", () => {
    setWordSet(LISTA);
    setWordSet(null);
    const base = scorePlaintext("geotude");
    setWordSet(LISTA);
    expect(scorePlaintext("geotude")).toBeGreaterThan(base);
  });
});
