import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders as whitespace } from "./whitespace-stego";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const run = (input: string, extra: Partial<DecodeContext> = {}) =>
  whitespace.decode(input, { ...ctx, ...extra });
const outs = (input: string, extra?: Partial<DecodeContext>) =>
  run(input, extra).map((c) => c.output);
const inspecao = (input: string, extra?: Partial<DecodeContext>) =>
  run(input, extra).find((c) => c.forcedScore === 0.4);

// ---------------------------------------------------------------------------
// Âncora do acervo: GIA-41 "Os olhos enganam"
// (gia-2026/gia-41-os-olhos-enganam/original/*.docx). Os 7 parágrafos do .docx,
// verbatim — inclusive o espaço sobrando no fim do parágrafo 5. O gabarito
// esconde 4 células Braille (A C A T → "TACA", de trás pra frente) no perfil de
// espaços duplos, mas 4 células pedem 12 fileiras e o arquivo tem 7 parágrafos:
// o mapeamento linha→fileira dependia da largura da página e não sobreviveu.
// Este teste FIXA essa honestidade — o decoder mostra o perfil e não inventa a
// resposta.
// ---------------------------------------------------------------------------
const GIA41 = [
  "OS OLHOS ENGANAM",
  "Ao longo desta jornada, vocês  aprenderão uma das lições mais importantes de qualquer desafio: nem todo texto foi escrito para entregar respostas. Às vezes, uma história é apenas uma história. Às vezes, uma frase existe apenas para ocupar espaço.E, muitas vezes, a maior  armadilha é acreditar que toda palavra  esconde uma pista.",
  "É natural procurar padrões. É da natureza humana tentar ligar pontos, encontrar códigos, interpretar detalhes e imaginar que existe um significado oculto em cada linha. Afinal, em uma gincana, isso  costuma acontecer.",
  "Nem sempre haverá dicas úteis. Nem sempre existirão mensagens ocultas, códigos secretos ou significados nas entrelinhas. Em alguns momentos, gastar tempo procurando aquilo que não existe será justamente o maior obstáculo para concluir  a prova.",
  "A experiência mostra que  equipes deixam de perceber o óbvio  porque estão ocupadas demais tentando  desvendar o impossível. ",
  "Mas há uma certeza:",
  "Tudo o que vocês precisam para cumprir esta prova e entregar exatamente o que foi solicitado já está em suas mãos. Com essa prova concluída, vamos brindar sua vitória!",
].join("\n");

describe("Espaços escondidos — âncora GIA-41 (acervo)", () => {
  it("lê o perfil 0,3,1,1,3,0,0 dos 7 parágrafos do .docx", () => {
    const card = inspecao(GIA41);
    expect(card).toBeDefined();
    expect(card?.output).toContain("Sequência: 0311300");
    expect(card?.chainValue).toBe("0311300");
  });

  it("conta 8 espaços duplos e o espaço solto no fim do parágrafo 5", () => {
    const card = inspecao(GIA41);
    expect(card?.output).toContain("7 linha(s), 8 espaço(s) duplo(s)");
    expect(card?.output).toContain("1 espaço(s) à direita");
    expect(card?.output).toContain("L5  duplos 3  tab 0  fim 1");
  });

  it("carrega o aviso operacional — é ele que vale mais que a leitura", () => {
    expect(inspecao(GIA41)?.output).toContain(
      "cole preservando as quebras originais — copiar de PDF/Word reflowa e apaga o sinal",
    );
  });

  it("NÃO inventa a resposta: o mapeamento de 7 linhas para 12 fileiras não existe", () => {
    const saidas = outs(GIA41).map((s) => s.toLowerCase());
    expect(saidas.some((s) => s.includes("taca"))).toBe(false);
    expect(saidas.some((s) => s.includes("acat"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mecanismo: as MESMAS 4 células do gabarito (A C A T), agora num texto com as
// 12 linhas que elas exigem. Contagem por linha = uma fileira da célula
// (bit alto = ponto esquerdo): a=2,0,0 · c=3,0,0 · a=2,0,0 · t=1,3,2.
// ---------------------------------------------------------------------------
const LINHA = [
  "alfa bravo charlie",
  "alfa  bravo",
  "alfa  bravo  charlie",
  "um  dois  tres  quatro",
];
const ACAT = [2, 0, 0, 3, 0, 0, 2, 0, 0, 1, 3, 2].map((n) => LINHA[n]).join("\n");

describe("Espaços escondidos — 2 bits por linha vira Braille", () => {
  it("lê as 4 células e entrega TACA de trás pra frente", () => {
    const saidas = outs(ACAT);
    expect(saidas).toContain("acat");
    expect(saidas).toContain("taca");
  });

  it("rotula a direção invertida, sem forçar pontuação", () => {
    const taca = run(ACAT).find((c) => c.output === "taca");
    expect(taca?.label).toContain("de trás pra frente");
    expect(taca?.label).toContain("Braille");
    expect(taca?.forcedScore).toBeUndefined();
    expect(taca?.chainValue).toBe("taca");
  });

  it("registra o perfil bruto para conferência manual", () => {
    expect(inspecao(ACAT)?.chainValue).toBe("200300200132");
  });
});

describe("Espaços escondidos — leituras por tabulação e por fim de linha", () => {
  // Um bit por separador entre palavras: tabulação = 1, espaço = 0.
  // "ok" = 01101111 01101011.
  const comBits = (bits: string) =>
    `${[...bits].map((b, i) => `w${i}${b === "1" ? "\t" : " "}`).join("")}fim`;
  const OK = [comBits("011011"), comBits("110110"), comBits("1011")].join("\n");

  it("espaço = 0 e tabulação = 1 remonta os bytes ASCII", () => {
    expect(outs(OK)).toContain("ok");
  });

  it("também na direção invertida", () => {
    expect(outs(OK)).toContain("ko");
  });

  it("sem tabulação nenhuma, a leitura de tabulação não emite fluxo de zeros", () => {
    const rotulos = run(ACAT)
      .map((c) => c.label ?? "")
      .join(" | ");
    expect(rotulos).not.toContain("tabulação = 1");
  });

  it("espaços à direita só entram quando existem", () => {
    // 12 linhas, um espaço solto no fim das que valem 1 — mesmo perfil do ACAT.
    const comFim = ACAT.split("\n")
      .map((l, i) => (i % 2 === 0 ? `${l} ` : l))
      .join("\n");
    const rotulos = run(comFim)
      .map((c) => c.label ?? "")
      .join(" | ");
    expect(rotulos).toContain("espaços à direita");
    expect(run(ACAT).some((c) => (c.label ?? "").includes("espaços à direita"))).toBe(false);
  });
});

describe("Espaços escondidos — o gate contra ruído", () => {
  it("texto sem anomalia nenhuma não gera cartão", () => {
    expect(run("linha um\nlinha dois\nlinha tres")).toEqual([]);
  });

  it("menos de 3 linhas não gera cartão", () => {
    expect(run("alfa  bravo\ncharlie  delta")).toEqual([]);
  });

  it("perfil constante é hábito de digitação, não canal escondido", () => {
    expect(run("aa  bb\ncc  dd\nee  ff\ngg  hh")).toEqual([]);
  });

  it("no modo uma-cifra-só o gate sai da frente", () => {
    const cs = run("aa  bb\ncc  dd\nee  ff\ngg  hh", { only: "whitespace-stego" });
    expect(cs.length).toBeGreaterThan(0);
    expect(cs[0].forcedScore).toBe(0.4);
  });

  it("anomalia fraca entrega só a inspeção, sem leitura inventada", () => {
    const cs = run("Um dois  tres\nquatro cinco\nseis  sete oito");
    expect(cs).toHaveLength(1);
    expect(cs[0].forcedScore).toBe(0.4);
  });
});
