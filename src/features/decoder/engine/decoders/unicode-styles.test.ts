import {
  UNICODE_STYLES,
  UNICODE_STYLE_BY_ID,
  normalizeUnicodeStyles,
} from "@/features/reference/unicode-styles";
import { describe, expect, it } from "vitest";
import { decoders as registry } from "../registry";
import { partition, runDecoders } from "../run";
import type { DecodeContext } from "../types";
import { decoders as unicodeStyles } from "./unicode-styles";

const ctx = (only?: string): DecodeContext => ({
  key: "",
  streets: null,
  ceps: null,
  ...(only ? { only } : {}),
});
const run = (input: string, only?: string) => unicodeStyles.decode(input, ctx(only));
const outs = (input: string, only?: string) => run(input, only).map((c) => c.output);
const aplicar = (id: string, texto: string) => UNICODE_STYLE_BY_ID.get(id)?.apply(texto);

describe("Texto estilizado — as âncoras", () => {
  // Âncoras literais do enunciado, digitadas como code points para não
  // dependerem de o editor preservar o plano astral no copiar e colar.
  it('𝐇𝐄𝐋𝐋𝐎 (Mathematical Bold, U+1D407…) vira "HELLO"', () => {
    const negrito = "\u{1D407}\u{1D404}\u{1D40B}\u{1D40B}\u{1D40E}";
    expect(negrito).toBe("𝐇𝐄𝐋𝐋𝐎");
    expect(outs(negrito)).toEqual(["HELLO"]);
    expect(run(negrito)[0].label).toBe("Negrito matemático");
  });

  it('🇧🇷 vira "BR" — a bandeira é o código ISO 3166', () => {
    const bandeira = "\u{1F1E7}\u{1F1F7}";
    expect(bandeira).toBe("🇧🇷");
    expect(outs(bandeira)).toEqual(["BR"]);
    expect(run(bandeira)[0].notes).toContain("ISO 3166");
  });

  it('"ʇǝxʇo" de cabeça para baixo entrega "texto"', () => {
    expect(outs("ʇǝxʇo")).toContain("texto");
  });

  it('"café" não gera candidato nenhum — acento não é estilo', () => {
    expect(outs("café")).toEqual([]);
  });
});

describe("Texto estilizado — os blocos matemáticos", () => {
  // Cada âncora abaixo foi conferida contra o code point inicial do bloco no
  // Unicode; os "buracos" são as letras que o padrão já tinha publicado em
  // Letterlike Symbols (ℎ, ℬ, ℭ, ℂ…) e não duplicou no bloco novo.
  it("negrito, itálico e negrito itálico", () => {
    expect(aplicar("negrito", "Gincana 2026")).toBe("𝐆𝐢𝐧𝐜𝐚𝐧𝐚 𝟐𝟎𝟐𝟔");
    expect(outs("𝐆𝐢𝐧𝐜𝐚𝐧𝐚 𝟐𝟎𝟐𝟔")).toEqual(["Gincana 2026"]);
    expect(outs(aplicar("italico", "Blumenau") ?? "")).toEqual(["Blumenau"]);
    expect(outs(aplicar("negrito-italico", "Blumenau") ?? "")).toEqual(["Blumenau"]);
  });

  it("o itálico usa ℎ (U+210E) no lugar do code point reservado", () => {
    expect(aplicar("italico", "h")).toBe("ℎ");
    expect(outs("𝑐ℎ𝑎𝑣𝑒")).toEqual(["chave"]);
  });

  it("script e script negrito, com os buracos ℬ ℰ ℱ ℋ ℐ ℒ ℳ ℛ", () => {
    expect(aplicar("script", "BEL")).toBe("ℬℰℒ");
    expect(outs("ℬℰℒ")).toEqual(["BEL"]);
    expect(outs(aplicar("script", "resposta") ?? "")).toEqual(["resposta"]);
    expect(outs(aplicar("script-negrito", "resposta") ?? "")).toEqual(["resposta"]);
  });

  it("fraktur (gótica) e fraktur negrito", () => {
    expect(aplicar("fraktur", "CHIRZ")).toBe("ℭℌℑℜℨ");
    expect(outs(aplicar("fraktur", "gincana") ?? "")).toEqual(["gincana"]);
    expect(outs(aplicar("fraktur-negrito", "gincana") ?? "")).toEqual(["gincana"]);
  });

  it("vazado (double-struck), com os buracos ℂ ℍ ℕ ℙ ℚ ℝ ℤ", () => {
    expect(aplicar("vazado", "CHNPQRZ")).toBe("ℂℍℕℙℚℝℤ");
    expect(outs(aplicar("vazado", "prova 7") ?? "")).toEqual(["prova 7"]);
  });

  it("as quatro variantes sem serifa e a monoespaçada", () => {
    for (const id of ["sans", "sans-negrito", "sans-italico", "sans-negrito-italico", "mono"]) {
      expect(outs(aplicar(id, "itajai") ?? "")).toEqual(["itajai"]);
    }
  });
});

describe("Texto estilizado — os blocos de exibição", () => {
  it("fullwidth cobre o ASCII imprimível inteiro e o espaço ideográfico", () => {
    expect(aplicar("fullwidth", "Rua 7")).toBe("Ｒｕａ　７");
    expect(outs("Ｒｕａ　７")).toEqual(["Rua 7"]);
    expect(outs("ＣＥＰ　８９０６６－７３０")).toEqual(["CEP 89066-730"]);
  });

  it("circulado e circulado negativo, incluindo o zero", () => {
    expect(aplicar("circulado", "Ab10")).toBe("Ⓐⓑ①⓪");
    expect(outs("Ⓐⓑ①⓪")).toEqual(["Ab10"]);
    expect(outs("🅐🅑🅒")).toEqual(["ABC"]);
    expect(outs("❶❷❸")).toEqual(["123"]);
  });

  it("parênteses e quadrado (positivo e negativo)", () => {
    expect(outs("⒜⒝⒞")).toEqual(["abc"]);
    expect(outs("🄐🄑🄒")).toEqual(["ABC"]);
    expect(outs("🄰🄱🄲")).toEqual(["ABC"]);
    expect(outs("🅰🅱🅲")).toEqual(["ABC"]);
  });

  it("versalete (small caps) — sem versalete de x, fica o x comum", () => {
    // O "X" fica de fora: não existe versalete de x no Unicode.
    expect(aplicar("versalete", "Prova X")).toBe("ᴘʀᴏᴠᴀ X");
    expect(outs("ᴘʀᴏᴠᴀ x")).toEqual(["prova x"]);
  });

  it("sobrescrito e subscrito", () => {
    expect(aplicar("sobrescrito", "prova 12")).toBe("ᵖʳᵒᵛᵃ ¹²");
    expect(outs("ᵖʳᵒᵛᵃ ¹²")).toEqual(["prova 12"]);
    expect(outs("ₚᵣₒᵥₐ ₁₂")).toEqual(["prova 12"]);
  });

  it("indicador regional: uma prova de bandeiras vira uma lista de siglas", () => {
    expect(aplicar("indicador-regional", "BR")).toBe("🇧🇷");
    expect(outs("🇧🇷 🇦🇷 🇺🇾 🇵🇾")).toEqual(["BR AR UY PY"]);
  });
});

describe("Texto estilizado — de cabeça para baixo", () => {
  it("aplicar gira os glifos E a ordem", () => {
    expect(aplicar("invertido", "texto")).toBe("oʇxǝʇ");
    expect(aplicar("invertido", "gincana 4")).toBe("ㄣ ɐuɐɔuᴉƃ");
  });

  it("as duas leituras entram, porque o texto colado pode vir dos dois jeitos", () => {
    const girado = aplicar("invertido", "blumenau") ?? "";
    expect(outs(girado)).toContain("blumenau");
    // sem girar a ordem, o mesmo texto lê ao contrário — é o par honesto
    expect(outs(girado)).toContain("uanemulb");
  });

  it("os rótulos dizem qual leitura é qual", () => {
    const rotulos = run(aplicar("invertido", "blumenau") ?? "").map((c) => c.label);
    expect(rotulos).toEqual([
      "De cabeça para baixo — ordem invertida",
      "De cabeça para baixo — mantendo a ordem",
    ]);
  });

  it("aceita o ı (U+0131) que outros geradores usam no lugar do ᴉ", () => {
    expect(outs("ɐuɐɔuıƃ")).toContain("gincana");
  });

  it("as letras ASCII giradas voltam (q↔b, u↔n, d↔p) — mas só se o estilo bater", () => {
    // "prova" girado é "ɐʌoɹd": o d final é o p, e a leitura correta inverte.
    expect(aplicar("invertido", "prova")).toBe("ɐʌoɹd");
    expect(outs("ɐʌoɹd")).toContain("prova");
  });
});

describe("Texto estilizado — o portão anti-ruído", () => {
  // A sonda que importa: a bancada vê estas entradas o dia inteiro.
  const SONDA = [
    "89066730", // CEP
    "111.444.777-35", // CPF
    "47 3221 5144", // telefone
    "-26.9194, -48.6614", // coordenada
    "14/08/2026", // data
    "Qmx1bWVuYXU=", // Base64
    "o rato roeu a roupa do rei de roma", // prosa
    "84 79 80 79", // A1Z26 / ASCII decimal
    "GINCANA", // caixa alta solta
    ".- -... -.-.", // morse
    "01001000 01001001", // binário
  ];

  it("cala em toda a sonda", () => {
    for (const s of SONDA) expect(outs(s)).toEqual([]);
  });

  it("prosa acentuada em português não dispara — á, ç, ã não são estilo", () => {
    for (const s of [
      "café",
      "ação",
      "não é a resposta da prova, é só uma frase acentuada",
      "coração, atenção e informação",
      "Itajaí Challenge",
    ]) {
      expect(outs(s)).toEqual([]);
    }
  });

  it("um glifo exótico solto é coincidência, não estilo", () => {
    expect(outs("Λ")).toEqual([]); // grego no meio do caminho
    expect(outs("a área é 30 m²")).toEqual([]); // superscript honesto (< 3 acertos)
    expect(outs("o valor de ℎ na física")).toEqual([]);
  });

  it("dois glifos perdidos num parágrafo não vencem a cobertura mínima", () => {
    expect(outs("o rato roeu a roupa do rei de roma ⓐⓑ")).toEqual([]);
  });

  it("blocos de outros decoders passam batido", () => {
    expect(outs("⠃⠇⠥⠍⠑⠝⠁⠥")).toEqual([]); // braille
    expect(outs("籋籵籾籶籮籷籪籾")).toEqual([]); // ROT8000
    expect(outs("中文测试文本内容")).toEqual([]); // CJK
    expect(outs("日本語のテキストです")).toEqual([]);
    expect(outs("Ελληνικά κείμενα εδώ")).toEqual([]);
    expect(outs("привет как дела друг")).toEqual([]);
  });

  it("emoji comum não é indicador regional", () => {
    expect(outs("\u{1F600}\u{1F601}\u{1F602}")).toEqual([]);
  });

  it("no modo uma-cifra-só a cobertura sai da frente", () => {
    expect(outs("o rato roeu a roupa do rei de roma ⓐⓑ", "unicode-styles")).toEqual([
      "o rato roeu a roupa do rei de roma ab",
    ]);
  });
});

describe("Texto estilizado — na bancada inteira", () => {
  it("ganha o topo do fan-out com a frase normalizada", () => {
    const negrito = aplicar("negrito", "a resposta desta prova e blumenau") ?? "";
    const { results } = runDecoders(negrito, ctx());
    expect(results[0].decoderId).toBe("unicode-styles");
    expect(results[0].output).toBe("a resposta desta prova e blumenau");
    expect(partition(results).likely[0].decoderId).toBe("unicode-styles");
  });

  it("não força pontuação — quem ranqueia é o scorer", () => {
    const [c] = run("𝐇𝐄𝐋𝐋𝐎");
    expect(c.forcedScore).toBeUndefined();
    expect(c.chainValue).toBe("HELLO");
    expect(c.notes).toContain("code points");
  });

  it("normalizado, o texto volta a encadear: 🇧🇷 estilizado vira entrada de outro decoder", () => {
    const cep = aplicar("circulado", "89066730") ?? "";
    const { results } = runDecoders(cep, ctx());
    const meu = results.find((r) => r.decoderId === "unicode-styles");
    expect(meu?.chainValue).toBe("89066730");
  });

  it("não polui o fan-out das entradas comuns", () => {
    for (const s of ["Qmx1bWVuYXU=", "o rato roeu a roupa do rei", "89066730", "café"]) {
      const { results } = runDecoders(s, ctx());
      expect(results.some((r) => r.decoderId === "unicode-styles")).toBe(false);
    }
  });

  it("entra no registro automático", () => {
    expect(registry.some((d) => d.id === "unicode-styles")).toBe(true);
  });

  it("encode estiliza em negrito (a aba Fontes tem o resto)", () => {
    expect(unicodeStyles.encode?.("Blumenau", ctx())).toBe("𝐁𝐥𝐮𝐦𝐞𝐧𝐚𝐮");
  });
});

describe("Tabelas — o contrato com a aba Fontes", () => {
  it("todo estilo tem id único, nome, bloco e apply", () => {
    const ids = new Set<string>();
    for (const e of UNICODE_STYLES) {
      expect(e.id).toMatch(/^[a-z0-9-]+$/);
      expect(e.nome.length).toBeGreaterThan(0);
      expect(e.bloco.length).toBeGreaterThan(0);
      expect(typeof e.apply).toBe("function");
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
    }
    expect(ids.size).toBe(UNICODE_STYLES.length);
  });

  it("ida e volta: aplicar e normalizar devolve o ASCII de origem", () => {
    for (const e of UNICODE_STYLES) {
      const fonte = e.id === "indicador-regional" ? "GINCANA" : "gincana 2026";
      const estilizado = e.apply(fonte);
      expect(estilizado).not.toBe(fonte);
      const norm = normalizeUnicodeStyles(estilizado);
      expect(norm, `estilo ${e.id} não foi detectado`).not.toBeNull();
      const lido = e.inverteOrdem
        ? [...(norm?.texto ?? "")].reverse().join("")
        : (norm?.texto ?? "");
      // Blocos incompletos (só maiúscula) sobem a caixa; comparar em minúscula.
      expect(lido.toLowerCase(), `estilo ${e.id} não fecha a volta`).toBe(fonte.toLowerCase());
    }
  });

  it("apply deixa intacto o que o bloco não cobre", () => {
    expect(aplicar("circulado", "olá!")).toBe("ⓞⓛá!");
  });

  it("normalizar devolve os estilos detectados, do mais presente ao menos", () => {
    const misto = `${aplicar("negrito", "gincana")}${aplicar("circulado", "12")}`;
    const norm = normalizeUnicodeStyles(misto);
    expect(norm?.texto).toBe("gincana12");
    expect(norm?.estilos[0].id).toBe("negrito");
    expect(norm?.estilos.map((e) => e.id)).toContain("circulado");
  });

  it("texto sem estilo nenhum devolve null", () => {
    for (const s of ["gincana 2026", "café com ação", ""]) {
      expect(normalizeUnicodeStyles(s)).toBeNull();
    }
  });
});
