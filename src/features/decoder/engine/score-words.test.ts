import { afterEach, describe, expect, it } from "vitest";
import { coverage, maiorPedaco, realWords, scorePlaintext, setWordSet } from "./score";

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

  // O teto da segmentação (GLUED_MAX = 64) protege o custo por tecla, mas
  // desistir acima dele criava um degrau invisível: 64 caracteres pontuavam no
  // topo e 65 pontuavam como lixo. Agora ele trunca em vez de zerar.
  it("não desiste do texto colado que passa do teto de 64", () => {
    setWordSet(LISTA);
    const noTeto = "PARACUMPRIRESSAPROVAVOCES".repeat(2).slice(0, 64);
    const umAMais = "PARACUMPRIRESSAPROVAVOCES".repeat(3).slice(0, 65);
    setWordSet(null);
    const baseAcima = scorePlaintext(umAMais);
    setWordSet(LISTA);
    expect(scorePlaintext(noTeto)).toBeGreaterThan(0);
    expect(scorePlaintext(umAMais)).toBeGreaterThan(baseAcima);
  });
});

/**
 * O DEGRAU DO `GLUED_MAX`, e os dois campos que o tornam visível.
 *
 * `gluedCoverage` trunca a segmentação em 64 caracteres para proteger o custo
 * por tecla — decisão certa. O efeito colateral é que o numerador congela e o
 * denominador continua crescendo: quem lê `covered/total` vê a mesma resposta
 * piorar sozinha conforme o texto fica mais longo.
 *
 * `analisado` é o denominador honesto. `covered/total` fica intocado de
 * propósito — o realce depende dele e o degrau dele já foi calibrado.
 */
describe("cobertura de texto colado longo", () => {
  const PALAVRAS = new Set([
    "aresposta",
    "resposta",
    "monumento",
    "pioneiros",
    "praca",
    "prefeitura",
    "blumenau",
    "santa",
    "catarina",
    "casa",
    "amor",
    "roja",
    "rova",
    "cuda",
  ]);
  const COLADO = "arespostaeomonumentoaospioneirosnapracadaprefeituradeblumenauemsantacatarina";

  it("`covered/total` piora com o comprimento; `covered/analisado` não", () => {
    setWordSet({ has: (w: string) => PALAVRAS.has(w) });
    const curto = coverage(COLADO.slice(0, 64));
    const longo = coverage(COLADO);

    // O numerador é o mesmo — a segmentação parou no mesmo ponto.
    expect(longo.covered).toBe(curto.covered);
    // E é exatamente aqui que a leitura antiga mente.
    expect(longo.covered / longo.total).toBeLessThan(curto.covered / curto.total - 0.1);
    // A razão sobre o analisado fica plana, que é o que se espera de um teto.
    expect(longo.covered / longo.analisado).toBeCloseTo(curto.covered / curto.analisado, 5);
  });

  it("`analisado` é igual a `total` quando não há truncamento", () => {
    setWordSet({ has: (w: string) => PALAVRAS.has(w) });
    const c = coverage("casa amor praca blumenau");
    expect(c.analisado).toBe(c.total);
  });

  it("`analisado` nunca é zero num texto com letras — 0/0 viraria “não sei”", () => {
    setWordSet({ has: () => false });
    const c = coverage("xyz abc de");
    expect(c.total).toBeGreaterThan(0);
    expect(c.analisado).toBe(c.total);
  });

  /**
   * O maior pedaço separa resposta de acidente onde a razão não separa:
   * "rojarovacudanoxz" é lixo costurado de quatro cacos de 4 letras e cobre 12
   * de 16 — razão 0,75, que passaria em qualquer portão por razão.
   */
  it("`maiorPedaco` distingue quatro cacos de 4 de uma palavra de verdade", () => {
    setWordSet({ has: (w: string) => PALAVRAS.has(w) });
    expect(maiorPedaco("rojarovacuda")).toBeLessThan(6);
    expect(maiorPedaco("arespostaeomonumento")).toBeGreaterThanOrEqual(6);
  });

  it("`maiorPedaco` é 0 sem vocabulário — nunca inventa evidência", () => {
    setWordSet(null);
    expect(maiorPedaco("arespostaeomonumento")).toBe(0);
  });
});
