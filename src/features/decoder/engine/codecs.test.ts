import { describe, expect, it } from "vitest";
import { codecDecoders } from "./codecs";
import type { DecodeContext } from "./types";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const find = (id: string) => codecDecoders.find((d) => d.id === id)!;
const outputs = (id: string, input: string) =>
  find(id)
    .decode(input, ctx)
    .map((c) => c.output);
const encode = (id: string, input: string) => find(id).encode?.(input, ctx);

describe("codec decoders", () => {
  it("decodes Base64", () => {
    expect(outputs("base64", "SGVsbG8=")).toContain("Hello");
    expect(outputs("base64", "Qm9tIGRpYQ==")).toContain("Bom dia");
  });

  it("decodes hexadecimal", () => {
    expect(outputs("hex", "48 65 6c 6c 6f")).toContain("Hello");
  });

  it("decodes 8-bit binary", () => {
    expect(outputs("binary", "01001000 01101001")).toContain("Hi");
  });

  it("decodes decimal ASCII codes", () => {
    expect(outputs("decimal", "72 73")).toContain("HI");
  });

  it("decodes Morse", () => {
    expect(outputs("morse", ".... .. / -- ..- -. -.. ---")).toContain("HI MUNDO");
  });

  it("decodes URL percent-encoding", () => {
    expect(outputs("url", "ol%C3%A1%20mundo")).toContain("olá mundo");
  });

  it("reverses text", () => {
    expect(outputs("reverse", "abc")).toContain("cba");
  });

  it("rejects invalid input (no candidate)", () => {
    expect(outputs("base64", "!!!not base64!!!")).toHaveLength(0);
    expect(outputs("binary", "0102")).toHaveLength(0);
  });
});

describe("codec encoders (round-trip)", () => {
  // encode(text) deve produzir algo que decode() volta a ler como o texto.
  const roundTrip = ["base64", "base32", "hex", "binary", "decimal", "octal", "url", "html"];
  for (const id of roundTrip) {
    it(`${id}: encode → decode = original`, () => {
      const text = "Olá <b> & 42!"; // inclui caracteres escapáveis p/ HTML/URL
      const enc = encode(id, text);
      expect(enc, `${id} encode produziu null`).toBeTruthy();
      expect(outputs(id, enc!)).toContain(text);
    });
  }

  it("morse: codifica e decodifica (maiúsculas)", () => {
    expect(encode("morse", "HI MUNDO")).toBe(".... .. / -- ..- -. -.. ---");
    expect(outputs("morse", encode("morse", "SOS")!)).toContain("SOS");
  });

  it("braille: codifica e decodifica (minúsculas)", () => {
    const enc = encode("braille", "abc")!;
    expect(enc).toBe("⠁⠃⠉");
    expect(outputs("braille", enc)).toContain("abc");
  });

  it("rot47 e reverse são involuções", () => {
    expect(encode("rot47", encode("rot47", "Teste 123")!)).toBe("Teste 123");
    expect(encode("reverse", "abc")).toBe("cba");
  });

  it("todo codec expõe o inverso encode", () => {
    expect(codecDecoders.every((d) => typeof d.encode === "function")).toBe(true);
  });
});

/**
 * Onda 0 — a bancada calava ou mentia em duas entradas que ela sabe ler.
 */
describe("Morse colado de PDF", () => {
  it("aceita ponto médio e travessão — a entrada não é mais recusada inteira", () => {
    // O mesmo "SOS" que o teclado produz, só que como sai de um PDF.
    expect(outputs("morse", "\u00b7\u00b7\u00b7 \u2014\u2014\u2014 \u00b7\u00b7\u00b7")).toContain(
      "SOS",
    );
  });

  it("mistura de ASCII e tipográfico na mesma entrada", () => {
    expect(outputs("morse", "\u00b7-\u00b7 ..- \u00b7-")).toContain("RUA");
  });

  it("o portão NÃO afrouxou: prosa com travessão continua recusada", () => {
    expect(outputs("morse", "a prova \u2014 procure a placa")).toHaveLength(0);
  });
});

describe("Braille com prefixo", () => {
  it("⠼ lê número, e não as dez primeiras letras", () => {
    // Antes saía "?abc" — e o "?" era descartado, entregando "abc" como resposta.
    expect(outputs("braille", "⠼⠁⠃⠉")).toContain("123");
  });

  it("⠚ vale 0 dentro do modo número", () => {
    expect(outputs("braille", "⠼⠁⠚")).toContain("10");
  });

  it("⠠ deixa a próxima letra maiúscula, e só ela", () => {
    expect(outputs("braille", "⠠⠃⠇⠥")).toContain("Blu");
  });

  it("letra continua letra sem prefixo — o caminho antigo não mudou", () => {
    expect(outputs("braille", "⠁⠃⠉")).toContain("abc");
  });

  it("célula desconhecida continua virando ? e reprovando a saída", () => {
    expect(outputs("braille", "⣿⣿⣿")).toHaveLength(0);
  });
});

/**
 * ONDA 6 — os quatro codecs de assinatura literal.
 *
 * Cada um mediu 100,00% de rejeição nos dois corpora, e os dois primeiros
 * entram com um portão a mais que a implementação de referência não tem: o
 * defeito alheio virou caso de teste, para não ser copiado por descuido.
 */
describe("Punycode", () => {
  /** Vetores conferidos contra o parser de IDN do próprio Node. */
  it("decodifica os vetores reais", () => {
    const vetores: [string, string][] = [
      ["xn--jos-dma", "josé"],
      ["xn--maana-pta", "mañana"],
      ["xn--bcher-kva", "bücher"],
      ["xn--80akhbyknj4f", "испытание"],
      ["xn--brasil-gva", "brasilé"],
    ];
    for (const [cod, esperado] of vetores)
      expect(outputs("punycode", cod), cod).toContain(esperado);
  });

  it("decodifica um domínio inteiro, rótulo a rótulo", () => {
    expect(outputs("punycode", "xn--brasil-gva.com.br")).toContain("brasilé.com.br");
  });

  /**
   * O DEFEITO ALHEIO QUE NÃO SE COPIA: a implementação de referência devolve
   * card VAZIO a 0,75 para o prefixo sozinho. Card em branco no topo é pior que
   * card nenhum — quem lê acha que a bancada resolveu e não mostrou.
   */
  it("o prefixo sozinho NÃO vira card vazio", () => {
    expect(outputs("punycode", "xn--")).toHaveLength(0);
  });

  it("domínio comum não dispara", () => {
    expect(outputs("punycode", "blumenau.sc.gov.br")).toHaveLength(0);
  });
});

describe("Quoted-Printable", () => {
  it("decodifica os `=XX`", () => {
    expect(outputs("quoted-printable", "A resposta esta na pra=C3=A7a")).toContain(
      "A resposta esta na praça",
    );
  });

  /**
   * O SEGUNDO DEFEITO ALHEIO: decodificar com `charCodeAt(i) & 0xff` corrompe o
   * não-ASCII que JÁ ESTAVA CERTO na entrada. Aqui a decodificação é sobre
   * bytes, então o `é` que veio inteiro sobrevive junto com o `=C3=B3timo`.
   */
  it("não corrompe o não-ASCII que já estava certo", () => {
    expect(outputs("quoted-printable", "Blumenau é =C3=B3timo")).toContain("Blumenau é ótimo");
  });

  it("junta a quebra suave de linha", () => {
    expect(outputs("quoted-printable", "pra=\r\n=C3=A7a")).toContain("praça");
  });

  it("texto sem `=XX` não dispara", () => {
    expect(outputs("quoted-printable", "a = b, c = d")).toHaveLength(0);
  });
});

describe("MIME encoded-word", () => {
  it("decodifica a forma B (Base64)", () => {
    expect(outputs("mime-word", "=?UTF-8?B?QSByZXNwb3N0YSBlc3TDoSBuYSBwcmHDp2E=?=")).toContain(
      "A resposta está na praça",
    );
  });

  it("decodifica a forma Q, onde `_` é espaço", () => {
    expect(outputs("mime-word", "=?UTF-8?Q?A_resposta_est=C3=A1_na_pra=C3=A7a?=")).toContain(
      "A resposta está na praça",
    );
  });

  it("texto normal não dispara", () => {
    expect(outputs("mime-word", "Assunto: a prova de sabado")).toHaveLength(0);
  });
});

describe("Escapes de código-fonte", () => {
  it("decodifica \\uXXXX e \\xNN", () => {
    expect(outputs("escapes", "\\u0050\\u006f\\u006e\\u0074\\u0065")).toContain("Ponte");
    expect(outputs("escapes", "\\x50\\x6f\\x6e\\x74\\x65")).toContain("Ponte");
  });

  it("decodifica %uXXXX", () => {
    expect(outputs("escapes", "%u0050%u006f%u006e%u0074%u0065")).toContain("Ponte");
  });

  it("texto sem escape não dispara", () => {
    expect(outputs("escapes", "C:\\Users\\peter")).toHaveLength(0);
  });
});

/**
 * OS INVERSOS DOS QUATRO — a bancada trata codec como bidirecional por
 * definição, e o teste `todo codec expõe o inverso` guarda essa regra.
 */
describe("Onda 6 — ida e volta", () => {
  it("Punycode codifica igual ao parser de IDN do Node", () => {
    const vetores: [string, string][] = [
      ["josé", "xn--jos-dma"],
      ["mañana", "xn--maana-pta"],
      ["bücher", "xn--bcher-kva"],
      ["испытание", "xn--80akhbyknj4f"],
      ["brasilé.com.br", "xn--brasil-gva.com.br"],
    ];
    for (const [texto, esperado] of vetores)
      expect(encode("punycode", texto), texto).toBe(esperado);
  });

  it("rótulo já ASCII não ganha `xn--`", () => {
    expect(encode("punycode", "blumenau.sc.gov.br")).toBeNull();
  });

  it("os quatro voltam ao original", () => {
    for (const [id, texto] of [
      ["punycode", "brasilé.com.br"],
      ["quoted-printable", "praça"],
      ["mime-word", "A praça"],
      ["escapes", "Ponte"],
    ] as const) {
      const codificado = encode(id, texto);
      expect(codificado, id).toBeTruthy();
      expect(outputs(id, codificado as string), id).toContain(texto);
    }
  });
});
