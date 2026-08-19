import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as zw } from "./zero-width";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const run = (input: string, extra: Partial<DecodeContext> = {}) =>
  zw.decode(input, { ...ctx, ...extra });
const outs = (input: string, extra?: Partial<DecodeContext>) =>
  run(input, extra).map((c) => c.output);
const rotulos = (input: string) => run(input).map((c) => c.label ?? "");
const porRotulo = (input: string, trecho: string) =>
  run(input).find((c) => (c.label ?? "").includes(trecho));

// ---------------------------------------------------------------------------
// Payloads montados no próprio teste, sempre por ponto de código — nenhum
// caractere invisível literal no fonte, porque um teste que ninguém consegue
// ler ao revisar não protege nada.
// ---------------------------------------------------------------------------

const ZWSP = "\u200B";
const ZWNJ = "\u200C";
const ZWJ = "\u200D";
const WJ = "\u2060";
const BOM = "\uFEFF";
const SHY = "\u00AD";
const MONGOL = "\u180E";
const VEZES = "\u2062";
const MAIS = "\u2064";
const RLO = "\u202E";
const RLE = "\u202B";
const FIM_BIDI = "\u202C";
const VS16 = "\uFE0F";

/** Bloco Tags: U+E0020–E007E é ASCII 0x20–0x7E deslocado de U+E0000. */
const emTags = (s: string) =>
  [...s].map((c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join("");

/** Seletores de variação: VS1–VS16 = 0x00–0x0F, VS17–VS256 = 0x10–0xFF. */
const emSeletores = (bytes: number[]) =>
  bytes.map((b) => String.fromCodePoint(b < 16 ? 0xfe00 + b : 0xe0100 + b - 16)).join("");

/** Canal binário clássico: ZWSP = 0, ZWNJ = 1. */
const emBits = (s: string) =>
  [...s]
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("")
    .split("")
    .map((b) => (b === "0" ? ZWSP : ZWNJ))
    .join("");

// ---------------------------------------------------------------------------
// Regressão: o canal binário é o que JÁ funcionava (extras.test.ts trava "Hi").
// Ampliar o alfabeto de 7 para 406 pontos de código não pode custar isso.
// ---------------------------------------------------------------------------

describe("Invisíveis — canal binário ZWSP/ZWNJ (o que já funcionava)", () => {
  it("continua remontando o texto embutido bit a bit", () => {
    expect(outs(`texto${emBits("Hi")}`)).toContain("Hi");
  });

  it("rotula o canal e diz a convenção usada", () => {
    const c = porRotulo(`texto${emBits("Hi")}`, "canal binário");
    expect(c?.output).toBe("Hi");
    expect(c?.notes).toContain("ZWSP = 0, ZWNJ = 1");
    expect(c?.forcedScore).toBe(0.95);
  });

  it("um símbolo só não é canal: oito bits iguais dariam 0x00 ou 0xFF", () => {
    expect(rotulos(`alvo${ZWSP.repeat(12)}`)).not.toContain("canal binário em largura zero");
  });
});

// ---------------------------------------------------------------------------
// Família 1 — bloco Tags. O falso negativo que motivou a tarefa: o alfabeto
// antigo tinha SETE pontos de código e nenhum deles era uma tag, então uma
// frase inteira pendurada num emoji devolvia "não há nada escondido".
// ---------------------------------------------------------------------------

describe("Invisíveis — texto oculto no bloco Tags", () => {
  const VISIVEL = "😀 tudo bem por aqui";
  const ENTRADA = `😀${emTags("SENHA 42")} tudo bem por aqui`;

  it("lê o ASCII direto — o mapeamento é 1:1, não é palpite", () => {
    expect(outs(ENTRADA)).toContain("SENHA 42");
  });

  it("é o card mais forte do decoder: a grafia entrega tudo", () => {
    const c = porRotulo(ENTRADA, "texto oculto em Tags");
    expect(c?.forcedScore).toBe(0.97);
    expect(c?.chainValue).toBe("SENHA 42");
    expect(c?.notes).toContain("U+E0020–E007E");
  });

  it("o mesmo texto sem as tags não dispara nada", () => {
    expect(run(VISIVEL)).toEqual([]);
  });

  it("junta um payload partido entre duas âncoras", () => {
    expect(outs(`a${emTags("SEN")}b${emTags("HA")}`)).toContain("SENHA");
  });
});

describe("Invisíveis — bandeira de subdivisão não é contrabando", () => {
  // 🏴 da Escócia: U+1F3F4 + tags "gbsct" + TAG de cancelamento (U+E007F).
  const ESCOCIA = `\u{1F3F4}${emTags("gbsct")}\u{E007F}`;

  it("lê o código ISO 3166-2 escrito nas Tags", () => {
    expect(outs(`bandeira ${ESCOCIA}`)).toContain("gbsct");
  });

  it("sai como bandeira, não como texto oculto, e com pontuação de leitura", () => {
    const c = porRotulo(`bandeira ${ESCOCIA}`, "bandeira de subdivisão");
    expect(c?.forcedScore).toBe(0.5);
    expect(c?.notes).toContain("legítimo");
    expect(rotulos(`bandeira ${ESCOCIA}`)).not.toContain("texto oculto em Tags");
  });
});

// ---------------------------------------------------------------------------
// Família 2 — seletores de variação (o "smuggling" de 2025). 16 + 240 = 256
// valores: um byte por seletor.
// ---------------------------------------------------------------------------

describe("Invisíveis — byte a byte em seletores de variação", () => {
  // "ola" = 6F 6C 61, todos ≥ 0x10, logo na faixa alta U+E0100–E01EF.
  const ENTRADA = `x${emSeletores([0x6f, 0x6c, 0x61])}`;

  it("remonta os bytes e fecha UTF-8 válido", () => {
    expect(outs(ENTRADA)).toContain("ola");
  });

  it("explica o mapeamento das duas faixas no card", () => {
    const c = porRotulo(ENTRADA, "seletores de variação");
    expect(c?.forcedScore).toBe(0.95);
    expect(c?.notes).toContain("VS1–VS16 = 0x00–0x0F");
    expect(c?.notes).toContain("VS17–VS256 = 0x10–0xFF");
  });

  it("atravessa a fronteira das duas faixas (0x0F na baixa, 0x10 na alta)", () => {
    const c = porRotulo(`z${emSeletores([0x0f, 0x10])}`, "seletores de variação");
    expect(c?.output).toBe("bytes ocultos: 0F 10");
  });

  it("bytes que não fecham UTF-8 saem em hex, com pontuação menor", () => {
    const c = porRotulo(`z${emSeletores([0xff, 0xfe])}`, "seletores de variação");
    expect(c?.output).toBe("bytes ocultos: FF FE");
    expect(c?.forcedScore).toBe(0.7);
  });

  it("ARMADILHA: seletor isolado é apresentação de emoji, não payload", () => {
    // ❤ colorido é U+2764 U+FE0F e ⚠ é U+26A0 U+FE0F — todo emoji colorido
    // carrega um seletor. Dois deles não são dois bytes escondidos.
    expect(run(`❤${VS16} cuidado ⚠${VS16}`)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Família 3 — Bidi. Categoria PRÓPRIA: o achado não é "tem texto escondido",
// é "o que você lê não é o que está escrito".
// ---------------------------------------------------------------------------

describe("Invisíveis — reordenação Bidi", () => {
  // O truque clássico do nome de arquivo: na tela lê-se "arquivoexe.pdf",
  // mas o que está gravado é "arquivofdp.exe".
  const ENTRADA = `arquivo${RLO}fdp.exe`;

  it("entrega o texto REALMENTE escrito, sem os controles", () => {
    const c = porRotulo(ENTRADA, "a tela mente");
    expect(c?.output).toBe("arquivofdp.exe");
    expect(c?.forcedScore).toBe(0.9);
  });

  it("nomeia o controle encontrado", () => {
    const c = porRotulo(ENTRADA, "a tela mente");
    expect(c?.notes).toContain("U+202E");
    expect(c?.notes).toContain("sobreposição da direita para a esquerda (RLO)");
  });

  it("também mostra a leitura da TELA, como aproximação declarada", () => {
    const c = porRotulo(ENTRADA, "leitura na tela");
    expect(c?.output).toBe("arquivoexe.pdf");
    expect(c?.forcedScore).toBe(0.6);
    expect(c?.notes).toContain("Aproximação");
  });

  it("o trecho invertido termina no PDF (U+202C) e o resto segue normal", () => {
    expect(porRotulo(`ini${RLO}abc${FIM_BIDI}fim`, "leitura na tela")?.output).toBe("inicbafim");
  });

  it("NÃO finge inverter no RLE: lá o Bidi só resolve neutros", () => {
    const r = rotulos(`txt${RLE}abc${FIM_BIDI}`);
    expect(r).toContain("reordenação Bidi — a tela mente");
    expect(r).not.toContain("leitura na tela (aproximação do RLO)");
  });

  it("o rótulo diz o que é — não vira 'achei caracteres invisíveis'", () => {
    expect(rotulos(ENTRADA).join(" | ")).toContain("Bidi");
  });
});

// ---------------------------------------------------------------------------
// As três leituras são coisas diferentes e precisam sair separadas.
// ---------------------------------------------------------------------------

describe("Invisíveis — as leituras não se misturam", () => {
  const TUDO = `a${emTags("OI")}b${emSeletores([0x41, 0x42])}c${RLO}def`;

  it("cada família ganha o seu próprio card, com rótulo próprio", () => {
    const r = rotulos(TUDO);
    expect(r).toContain("texto oculto em Tags");
    expect(r).toContain("byte a byte em seletores de variação");
    expect(r).toContain("reordenação Bidi — a tela mente");
    expect(new Set(r).size).toBe(r.length);
  });

  it("a ordem de força reflete a evidência da grafia: Tags > seletores > Bidi", () => {
    const s = (t: string) => porRotulo(TUDO, t)?.forcedScore ?? 0;
    expect(s("texto oculto em Tags")).toBeGreaterThan(s("byte a byte"));
    expect(s("byte a byte")).toBeGreaterThan(s("reordenação Bidi"));
  });
});

// ---------------------------------------------------------------------------
// Inventário: quando nada decodifica, o card ainda tem de dizer O QUE existe.
// ---------------------------------------------------------------------------

describe("Invisíveis — inventário", () => {
  it("nomeia cada ponto de código, com contagem", () => {
    const c = porRotulo(`a${ZWSP}b${ZWSP}c${WJ}d`, "inventário");
    expect(c?.output).toContain("U+200B  espaço de largura zero (ZWSP)");
    expect(c?.output).toContain("×2");
    expect(c?.output).toContain("U+2060  juntador de palavras (WJ)");
  });

  it("agrupa Tags e seletores por bloco, não um por linha", () => {
    const c = porRotulo(`a${emTags("SENHA")}`, "inventário");
    expect(c?.output).toContain("bloco Tags (U+E0000–E007F)  ×5");
  });

  it("encadeia o texto limpo — dá para rerodar a bancada sem os invisíveis", () => {
    const entrada = `Rua${ZWSP} XV${ZWSP} de${ZWSP} Novembro`;
    expect(porRotulo(entrada, "inventário")?.chainValue).toBe("Rua XV de Novembro");
  });

  it("assinatura forte vale mais que sujeira de colagem", () => {
    expect(porRotulo(`a${ZWSP}b${ZWNJ}c`, "inventário")?.forcedScore).toBe(0.55);
    // Hífen suave é o que sobra de texto hifenizado colado do Word/PDF.
    expect(porRotulo(`re${SHY}la${SHY}tó${SHY}rio`, "inventário")?.forcedScore).toBe(0.4);
  });

  it("cobre os pontos que faltavam no alfabeto antigo", () => {
    const c = porRotulo(`a${SHY}b${MONGOL}c${VEZES}d${MAIS}e`, "inventário");
    expect(c?.output).toContain("U+00AD  hífen suave (SHY)");
    expect(c?.output).toContain("U+180E  separador de vogal mongol");
    expect(c?.output).toContain("U+2062  vezes invisível");
    expect(c?.output).toContain("U+2064  mais invisível");
  });
});

// ---------------------------------------------------------------------------
// O portão: sem assinatura, não emite. Um decoder que grita em texto honesto é
// tão inútil quanto um que cala em texto contrabandeado.
// ---------------------------------------------------------------------------

describe("Invisíveis — o portão contra o falso positivo", () => {
  it("texto comum não gera card", () => {
    expect(run("Rua XV de Novembro, 100 — Blumenau")).toEqual([]);
  });

  it("ARMADILHA: ZWJ de emoji composto é legítimo", () => {
    // 👨‍👩‍👧 = U+1F468 ZWJ U+1F469 ZWJ U+1F467 — dois ZWJ que não escondem nada.
    expect(run(`familia \u{1F468}${ZWJ}\u{1F469}${ZWJ}\u{1F467}`)).toEqual([]);
  });

  it("mas ZWJ entre letras não tem desculpa", () => {
    expect(porRotulo(`a${ZWJ}b${ZWJ}c`, "inventário")?.output).toContain("U+200D");
  });

  it("ARMADILHA: BOM na posição 0 é o arquivo dizendo que é UTF-8", () => {
    expect(run(`${BOM}Rua XV de Novembro`)).toEqual([]);
    // No meio do texto, aí sim é esconderijo.
    expect(porRotulo(`Rua${BOM} XV`, "inventário")?.output).toContain("U+FEFF");
  });
});

// ---------------------------------------------------------------------------
// Modo uma-cifra-só: a AUSÊNCIA também é resposta. Calar aqui era exatamente o
// falso negativo silencioso que este decoder existe para não cometer.
// ---------------------------------------------------------------------------

describe("Invisíveis — modo uma cifra só", () => {
  it("diz que varreu e não achou, em vez de devolver nada", () => {
    const cs = run("Rua XV de Novembro", { only: "zero-width" });
    expect(cs).toHaveLength(1);
    expect(cs[0].output).toContain("Nenhum caractere invisível suspeito");
    expect(cs[0].output).toContain("406 pontos de código");
    expect(cs[0].forcedScore).toBe(0.3);
  });

  it("com um seletor só, o portão sai da frente e o byte aparece", () => {
    const c = run(`x${emSeletores([0x41])}`, { only: "zero-width" }).find((k) =>
      (k.label ?? "").includes("seletores"),
    );
    expect(c?.output).toBe("A");
  });
});
