/**
 * Placas de veículos brasileiras: conversão antiga ↔ Mercosul, faixa de letras
 * por UF e categoria pela cor.
 *
 * DUAS COISAS AQUI TÊM CONFIABILIDADE MUITO DIFERENTE — e o decoder rotula cada
 * uma no cartão, porque misturar as duas é o jeito de entregar uma prova errada:
 *
 * 1. **A conversão é regra fixa e publicada.** O 5º caractere (o 2º dígito da
 *    placa antiga) vira letra pela tabela 0=A, 1=B, … 9=J. `ABC-1234` → `ABC1C34`.
 *    É determinística e reversível, conferida na Wikipédia pt e no conversor do
 *    GeraValida. Isso é FATO.
 *
 * 2. **A faixa de letras por UF é histórica e incompleta.** O DENATRAN nunca
 *    publicou uma tabela consolidada em domínio público; o que circula vem de
 *    compilações de terceiros. As 27 faixas primárias (AAA–NFB) batem em três
 *    fontes independentes; as faixas 2ª/3ª/4ª (NFC–OIQ) só apareceram numa. Por
 *    isso tudo sai do decoder com "faixa histórica — confira", nunca como fato.
 *
 * ONDE A TABELA PARA: em `OIQ`. A fonte que lista o bloco O marca `OIR–PED` como
 * "ainda não definido" e depois crava `PEE–PFQ` para Pernambuco. Uma ilha solta
 * depois de um vazio de 3 mil combinações é frágil demais para virar resposta —
 * acima de OIQ o decoder diz "faixa não consolidada", que é a verdade.
 * Há também um furo real dentro do bloco: `OCU` não aparece em faixa nenhuma
 * (a fonte salta de `OCT` para `OCV`), e ele fica sem UF de propósito.
 *
 * E O PONTO QUE MAIS RENDE PROVA: **a placa Mercosul não codifica o estado.**
 * A Resolução CONTRAN 748/2018 acabou com a identificação de UF e município — a
 * sequência passou a ser nacional. A faixa só continua valendo para as placas
 * que vieram de conversão de uma placa antiga.
 */

/** Dígito → letra da 5ª posição na conversão Mercosul (0=A … 9=J). */
export const MERCOSUL_LETTERS = "ABCDEFGHIJ";

export interface PlateRange {
  /** Primeiro prefixo de 3 letras da faixa (inclusivo). */
  from: string;
  /** Último prefixo de 3 letras da faixa (inclusivo). */
  to: string;
  uf: string;
  /** Nome por extenso da UF. */
  state: string;
  /** 1 = faixa original de 1990; 2+ = faixas liberadas depois, por esgotamento. */
  seq: number;
}

const UF_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AM: "Amazonas",
  AP: "Amapá",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MG: "Minas Gerais",
  MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",
  PA: "Pará",
  PB: "Paraíba",
  PE: "Pernambuco",
  PI: "Piauí",
  PR: "Paraná",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RO: "Rondônia",
  RR: "Roraima",
  RS: "Rio Grande do Sul",
  SC: "Santa Catarina",
  SE: "Sergipe",
  SP: "São Paulo",
  TO: "Tocantins",
};

// As 27 faixas originais (1990–1994) + as reaberturas por esgotamento.
// Ordenadas e sem sobreposição — o teste colocado verifica isso, porque a busca
// binária mental de quem edita a tabela é o erro mais provável aqui.
// biome-ignore format: uma faixa por linha lê melhor que a tabela reflowada.
const RANGES: [from: string, to: string, uf: string, seq?: number][] = [
  ["AAA", "BEZ", "PR"], ["BFA", "GKI", "SP"], ["GKJ", "HOK", "MG"], ["HOL", "HQE", "MA"],
  ["HQF", "HTW", "MS"], ["HTX", "HZA", "CE"], ["HZB", "IAP", "SE"], ["IAQ", "JDO", "RS"],
  ["JDP", "JKR", "DF"], ["JKS", "JSZ", "BA"], ["JTA", "JWE", "PA"], ["JWF", "JXY", "AM"],
  ["JXZ", "KAU", "MT"], ["KAV", "KFC", "GO"], ["KFD", "KME", "PE"], ["KMF", "LVE", "RJ"],
  ["LVF", "LWQ", "PI"], ["LWR", "MMM", "SC"], ["MMN", "MOW", "PB"], ["MOX", "MTZ", "ES"],
  ["MUA", "MVK", "AL"], ["MVL", "MXG", "TO"], ["MXH", "MZM", "RN"], ["MZN", "NAG", "AC"],
  ["NAH", "NBA", "RR"], ["NBB", "NEH", "RO"], ["NEI", "NFB", "AP"],
  // Reaberturas — fonte única, tratar como pista, não como fato.
  ["NFC", "NGZ", "GO", 2], ["NHA", "NHT", "MA", 2], ["NHU", "NIX", "PI", 2],
  ["NIY", "NJW", "MT", 2], ["NJX", "NLU", "GO", 3], ["NLV", "NMO", "AL", 2],
  ["NMP", "NNI", "MA", 3], ["NNJ", "NOH", "RN", 2], ["NOI", "NPB", "AM", 2],
  ["NPC", "NPQ", "MT", 3], ["NPR", "NQK", "PB", 2], ["NQL", "NRE", "CE", 2],
  ["NRF", "NSD", "MS", 2], ["NSE", "NTC", "PA", 2], ["NTD", "NTW", "BA", 2],
  ["NTX", "NUG", "MT", 4], ["NUH", "NUL", "RR", 2], ["NUM", "NVF", "CE", 3],
  ["NVG", "NVN", "SE", 2], ["NVO", "NWR", "GO", 4], ["NWS", "NXQ", "MA", 4],
  ["NXR", "NXT", "AC", 2], ["NXU", "NXW", "PE", 2], ["NXX", "NYG", "MG", 2],
  ["NYH", "NZZ", "BA", 3], ["OAA", "OAO", "AM", 3], ["OAP", "OBS", "MT", 5],
  ["OBT", "OCA", "PA", 3], ["OCB", "OCT", "CE", 4], ["OCV", "ODT", "ES", 2],
  ["ODU", "OEI", "PI", 3], ["OEJ", "OES", "SE", 3], ["OET", "OFH", "PB", 3],
  ["OFI", "OGG", "PA", 4], ["OGH", "OHA", "GO", 5], ["OHB", "OHL", "AL", 3],
  ["OHM", "OHW", "RO", 2], ["OHX", "OIQ", "CE", 5],
];

export const PLATE_RANGES: PlateRange[] = RANGES.map(([from, to, uf, seq]) => ({
  from,
  to,
  uf,
  state: UF_NAMES[uf] ?? uf,
  seq: seq ?? 1,
}));

/**
 * Prefixo de 3 letras → faixa histórica. Comparação lexicográfica direta: todas
 * as faixas têm exatamente 3 letras maiúsculas, então `from <= p <= to` já é a
 * ordem certa, sem converter para número.
 */
export function lookupPlateRange(prefix: string): PlateRange | null {
  const p = prefix.toUpperCase();
  if (!/^[A-Z]{3}$/.test(p)) return null;
  return PLATE_RANGES.find((r) => p >= r.from && p <= r.to) ?? null;
}

export interface PlateCategory {
  /** Rótulo curto da categoria. */
  category: string;
  /** O que a cor significa, e onde ela aparece. */
  detail: string;
}

/**
 * Cor dos caracteres → categoria. A cor que classifica é a **do caractere**, não
 * a do fundo: toda placa Mercosul tem fundo branco. Chaves sem acento e em
 * minúscula — a normalização mora em `lookupPlateColor`.
 */
const COLORS: Record<string, PlateCategory> = {
  preto: {
    category: "Particular",
    detail:
      "caracteres pretos: veículo particular. Atenção à pegadinha — na placa ANTIGA, fundo preto com caracteres prateados era colecionador, não particular",
  },
  vermelho: {
    category: "Comercial (aluguel)",
    detail: "táxi, ônibus, van escolar, caminhão, locadora — transporte remunerado (Pantone 186C)",
  },
  azul: {
    category: "Oficial / representação",
    detail: "veículo de órgão público (Pantone 286C)",
  },
  dourado: {
    category: "Diplomática / consular",
    detail: "corpo diplomático, consulados e organismos internacionais (Pantone 130C)",
  },
  verde: {
    category: "Experiência (fabricante)",
    detail: "veículo de teste de montadora, ainda não licenciado para uso comum (Pantone 341C)",
  },
  prata: {
    category: "Colecionador",
    detail: "veículo com 30 anos ou mais, habilitado a circular no Mercosul",
  },
  branco: {
    category: "Colecionador (nacional) — ou só o fundo",
    detail:
      "caracteres brancos sobre fundo preto: colecionador só no Brasil. Mas branco é também o FUNDO de toda placa Mercosul — nesse caso quem classifica é a cor do caractere",
  },
};

// Sinônimos e flexões que a equipe digita na prática ("placa vermelha", "cinza").
const COLOR_ALIASES: Record<string, string> = {
  preta: "preto",
  vermelha: "vermelho",
  azuis: "azul",
  dourada: "dourado",
  ouro: "dourado",
  amarelaouro: "dourado",
  prateada: "prata",
  prateado: "prata",
  cinza: "prata",
  branca: "branco",
};

/** Nome de cor (com ou sem acento, em qualquer caixa) → categoria da placa. */
export function lookupPlateColor(word: string): (PlateCategory & { color: string }) | null {
  // NFD separa o acento em marca combinante, e o filtro `[^a-z]` j\u00e1 a leva
  // junto com espa\u00e7o e pontua\u00e7\u00e3o \u2014 "Amarela-Ouro" e "cinz\u00e1" caem na mesma chave.
  const key = word
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");
  if (!key) return null;
  const canon = COLOR_ALIASES[key] ?? key;
  const hit = COLORS[canon];
  return hit ? { ...hit, color: canon } : null;
}

/**
 * Placa antiga (3 letras + 4 dígitos) → Mercosul. O 2º dígito vira letra; o
 * resto fica onde está.
 */
export function toMercosul(letters: string, digits: string): string {
  const d = digits.split("");
  return `${letters.toUpperCase()}${d[0]}${MERCOSUL_LETTERS[Number(d[1])]}${d[2]}${d[3]}`;
}

/**
 * Mercosul → placa antiga. Devolve `null` quando a 5ª posição está fora de A–J:
 * essa placa **não veio de conversão**, é uma combinação nativa emitida depois
 * de 2018 e não tem equivalente antiga nenhuma.
 */
export function toOldPlate(
  letters: string,
  d1: string,
  letter: string,
  d34: string,
): string | null {
  const idx = MERCOSUL_LETTERS.indexOf(letter.toUpperCase());
  if (idx < 0) return null;
  return `${letters.toUpperCase()}-${d1}${idx}${d34}`;
}
