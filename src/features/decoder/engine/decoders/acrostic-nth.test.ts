import { describe, expect, it } from "vitest";
import type { DecodeContext } from "../types";
import { decoders } from "./acrostic";

const ctx: DecodeContext = { key: "", streets: null, ceps: null };
const [initials, positional] = decoders;
const out = (input: string) => positional.decode(input, ctx).map((c) => c.output.toUpperCase());
const labelOf = (input: string, output: string) =>
  positional.decode(input, ctx).find((c) => c.output.toUpperCase() === output)?.label;

// GIA-30 "Sinfonia Silenciosa": as seis músicas do VLAD V, uma por linha.
// O acervo registra a regra ("a QUINTA letra de trás para frente de cada
// título") e a lista dos títulos; TEATRO é DERIVADO daqui — a palavra final
// não está escrita na resolução, que só pede "o melhor lugar para ouvir essa
// sinfonia silenciosa".
const sinfonia = [
  "Questão de Tempo",
  "Agora Eu Sei",
  "Siga o Som",
  "O Chamado da Montanha",
  "A Espada e o Dragão",
  "Plantar, Colher",
].join("\n");

// GIA-28 "Segredos do Vale Encantado": o falso elenco, um ator por linha.
// Resolução do acervo: "a última letra do nome dos atores e a primeira letra
// do sobrenome, para formar 'os sem floresta'".
const elenco = [
  "Fernando Osório",
  "Tavares Stannis Souza",
  "Stefanie Ewald",
  "Carmem Miranda",
  "Afeff Fisterol Lederof",
  "Sandro Oliveira",
  "Dagmar Renilde Estevan",
  "Elias Santos",
  "Margot Theis",
  "Camila Arabela",
].join("\n");

describe("acróstico posicional (GIA-30)", () => {
  it("5ª letra do fim de cada linha → TEATRO", () => {
    expect(out(sinfonia)).toContain("TEATRO");
    expect(labelOf(sinfonia, "TEATRO")).toBe("5ª letra do fim de cada linha");
  });

  it("conta ignorando espaço e pontuação, com o acentuado valendo 1", () => {
    // O O de "Plantar, Colher" só sai se a vírgula e o espaço não contarem, e
    // o R de "A Espada e o Dragão" só sai se o "ã" ocupar uma posição só —
    // mesmo colado (NFD), como vem de um PDF/docx. Indexar por code unit aqui
    // devolveria A no lugar do R.
    expect(out(sinfonia.normalize("NFD"))).toContain("TEATRO");
  });
});

describe("acróstico posicional (GIA-28)", () => {
  it("nome↔sobrenome → OS SEM FLORESTA", () => {
    expect(out(elenco)).toContain("OSSEMFLORESTA");
  });

  it("as duas leituras coincidem — a mensagem sai inteira, não duplicada", () => {
    const hits = positional
      .decode(elenco, ctx)
      .filter((c) => c.output.toUpperCase() === "OSSEMFLORESTA");
    // São duas variantes que produzem a MESMA saída; um par concatenado daria
    // "OOSSSSEEMMFFLLOORREESSTTAA".
    expect(hits).toHaveLength(1);
    expect(hits[0].label).toBe("última letra do nome (por linha)");
    expect(out(elenco)).not.toContain("OOSSSSEEMMFFLLOORREESSTTAA");
  });
});

describe("portão de entrada", () => {
  it("não usa a k-ésima letra quando alguma unidade é curta demais", () => {
    // "de" e "o" não têm 3ª letra: nenhuma variante por palavra em k=3.
    const labels = positional.decode(sinfonia, ctx).map((c) => c.label);
    expect(labels).not.toContain("3ª letra de cada palavra");
  });

  it("ignora entrada sem estrutura de lista", () => {
    expect(positional.decode("oi", ctx)).toEqual([]);
    expect(positional.decode("", ctx)).toEqual([]);
  });

  it("não repete o acróstico de iniciais do decoder irmão", () => {
    const labels = positional.decode(sinfonia, ctx).map((c) => c.label);
    expect(labels).not.toContain("1ª letra de cada linha");
    expect(initials.decode(sinfonia, ctx).map((c) => c.output)).toContain("QASOAP");
  });
});

/**
 * Prova 29 do acervo da Equipe Arromba (CONHECIMENTO, GCB 2025). A pista
 * estrutural é a paridade: as 31 palavras têm TODAS número ímpar de letras,
 * logo toda palavra tem uma letra exatamente no meio — e os parágrafos vêm
 * centralizados, alinhando essas letras numa coluna. Ver
 * `docs/ACERVO-ARROMBA-PROVAS.md` §2.2.
 */
describe("letra central (acervo GCB, prova 29)", () => {
  const conhecimento = `Sábio ele, que clamava ter tornado a estrutura intelectual uma fácil relação cordial e correta.
Icônica, com censura sutil, por exemplo. Soa leviano.
Irônico, igual uma soberba moral. Agora, chulo, dissimulado.`;

  it("lê a coluna do meio e responde BLUMENAU EM CADERNOS TOMO I NUMERO UM", () => {
    expect(out(conhecimento)).toContain("BLUMENAUEMCADERNOSTOMOINUMEROUM");
    expect(labelOf(conhecimento, "BLUMENAUEMCADERNOSTOMOINUMEROUM")).toBe(
      "letra central de cada palavra",
    );
  });

  /** Todos os rótulos emitidos, para afirmar sobre a LEITURA e não sobre a saída. */
  const rotulos = (input: string) => positional.decode(input, ctx).map((c) => c.label);

  it("uma única palavra de tamanho par mata a leitura — não há meia coluna", () => {
    // Experimento controlado: o MESMO texto da prova, com "Sábio" (5 letras)
    // virando "Sábios" (6). Uma palavra par e a coluna central deixa de existir.
    const quebrado = conhecimento.replace("Sábio ele", "Sábios ele");
    expect(rotulos(conhecimento)).toContain("letra central de cada palavra");
    expect(rotulos(quebrado)).not.toContain("letra central de cada palavra");
  });

  it("portão de 8 unidades: amostra curta toda ímpar não emite a leitura", () => {
    // 5 palavras ímpares — "todas ímpares" aqui é barato demais para valer.
    expect(rotulos("ovo mel sol luz paz")).not.toContain("letra central de cada palavra");
  });
});
