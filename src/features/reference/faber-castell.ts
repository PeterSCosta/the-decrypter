/**
 * Catálogo de cores Faber-Castell por código de 3 dígitos — as **12 células
 * verificadas** do gabarito da GIA-39 ("Desenhar e colorir", acervo
 * `the-logic-lab/scripts/import-historico/acervo/gia-2026/gia-39-desenhar-e-colorir`).
 *
 * PROVENIÊNCIA E POR QUE A TABELA É CURTA: a Faber-Castell Brasil publica a
 * tabela completa só como encarte impresso/PDF, e as digitalizações que
 * circulam estão no Scribd — raspar está fora, pela mesma regra já registrada
 * para o SIATU e a Cidade Iluminada. Então aqui só entra o que foi conferido à
 * mão contra um gabarito real; ampliar é digitação manual, não raspagem.
 *
 * SEM HEX, DE PROPÓSITO: o gabarito não traz cor nenhuma, e o valor da prova é
 * o **nome** — a equipe conta uma letra dentro dele (ignorando espaços). Um HEX
 * inventado aqui seria pior que ausência: viraria âncora falsa.
 *
 * ACENTOS RESTAURADOS: o gabarito é todo em caixa alta e sem acento
 * ("AMARELO CANARIO"); aqui o nome vai como se escreve. Isso nunca desloca a
 * contagem, porque um acentuado ocupa 1 caractere — é assim que as provas
 * contam, e é por isso que `stripDiacritics`/NFD não pode entrar antes de
 * indexar.
 */
export interface FaberColor {
  /** Código de 3 dígitos impresso no corpo do lápis. */
  code: string;
  /** Nome pt-BR — é este o valor da prova. */
  name: string;
}

/** Ordem do gabarito da GIA-39 (é a ordem do enunciado, não numérica). */
export const FABER_CASTELL_COLORS: FaberColor[] = [
  { code: "015", name: "Laranja escuro" },
  { code: "076", name: "Marrom" },
  { code: "038", name: "Lilás" },
  { code: "091", name: "Bordô" },
  { code: "037", name: "Violeta" },
  { code: "005", name: "Amarelo canário" },
  { code: "010", name: "Areia" },
  { code: "071", name: "Verde claro" },
  { code: "083", name: "Marrom claro" },
  { code: "082", name: "Ocre" },
  { code: "696", name: "Prata" },
  { code: "081", name: "Cinza quente" },
];

const BY_CODE = new Map(FABER_CASTELL_COLORS.map((c) => [c.code, c]));

/**
 * Resolve um código de 3 dígitos. `null` = **não catalogado**, que é diferente
 * de "não é código": quem chama deve dizer isso à equipe em vez de se calar,
 * senão ela reescreve o número achando que digitou errado.
 */
export function lookupFaberCastell(code: string): FaberColor | null {
  return BY_CODE.get(code) ?? null;
}

/**
 * Letras do nome. Espaço e hífen não contam e um acentuado vale 1 — é a mesma
 * regra de contagem do acróstico posicional.
 */
export function faberLetters(name: string): string[] {
  return name.match(/\p{L}/gu) ?? [];
}
