import { stripDiacritics } from "@/features/decoder/engine/util";

/**
 * Código de cores de resistor de terminais axiais (IEC 60062). Tabela própria,
 * de propósito: `colors.ts` reproduz o gabarito da Equipe Arromba, onde Branco e
 * Preto vêm com o HEX trocado — aqui o HEX é o da faixa de verdade, porque é ele
 * que a equipe compara com a foto do componente.
 *
 * Uma cor acumula até quatro papéis, e o papel depende da POSIÇÃO da faixa:
 * dígito, multiplicador, tolerância e coeficiente de temperatura.
 */
export interface BandColor {
  /** Nome pt-BR canônico — é o que sai no card. */
  name: string;
  /** Sinônimos aceitos na entrada (pt e en), já normalizados. */
  aliases: string[];
  hex: string;
  /** Valor como faixa de dígito (1ª, 2ª e 3ª faixas). */
  digit?: number;
  /** Expoente do multiplicador: ×10^mult. */
  mult?: number;
  /** Tolerância, em %. */
  tol?: number;
  /** Coeficiente de temperatura, em ppm/K (6ª faixa). */
  ppm?: number;
}

/**
 * Amarelo e Laranja NÃO entram como tolerância: só existem nesse papel em
 * tabelas militares estendidas, e admiti-los faria toda leitura invertida
 * "colar" — é justamente o que a regra de direção precisa poder recusar.
 */
export const BAND_COLORS: BandColor[] = [
  { name: "preto", aliases: ["black"], hex: "#000000", digit: 0, mult: 0, ppm: 250 },
  {
    name: "marrom",
    aliases: ["castanho", "brown"],
    hex: "#8b4513",
    digit: 1,
    mult: 1,
    tol: 1,
    ppm: 100,
  },
  { name: "vermelho", aliases: ["red"], hex: "#ff0000", digit: 2, mult: 2, tol: 2, ppm: 50 },
  { name: "laranja", aliases: ["orange"], hex: "#ff8c00", digit: 3, mult: 3, ppm: 15 },
  { name: "amarelo", aliases: ["yellow"], hex: "#ffff00", digit: 4, mult: 4, ppm: 25 },
  { name: "verde", aliases: ["green"], hex: "#008000", digit: 5, mult: 5, tol: 0.5, ppm: 20 },
  { name: "azul", aliases: ["blue"], hex: "#0000ff", digit: 6, mult: 6, tol: 0.25, ppm: 10 },
  {
    name: "violeta",
    aliases: ["roxo", "violet", "purple"],
    hex: "#8b00ff",
    digit: 7,
    mult: 7,
    tol: 0.1,
    ppm: 5,
  },
  {
    name: "cinza",
    aliases: ["gray", "grey"],
    hex: "#808080",
    digit: 8,
    mult: 8,
    tol: 0.05,
    ppm: 1,
  },
  { name: "branco", aliases: ["white"], hex: "#ffffff", digit: 9, mult: 9 },
  { name: "ouro", aliases: ["dourado", "gold"], hex: "#d4af37", mult: -1, tol: 5 },
  { name: "prata", aliases: ["prateado", "silver"], hex: "#c0c0c0", mult: -2, tol: 10 },
];

const BY_NAME = new Map<string, BandColor>();
for (const c of BAND_COLORS) {
  BY_NAME.set(c.name, c);
  for (const a of c.aliases) BY_NAME.set(a, c);
}

/**
 * Um token → a cor da faixa. Abreviação de uma letra fica de fora de propósito:
 * "V" é violeta, vermelho e verde ao mesmo tempo.
 */
export function bandColor(token: string): BandColor | null {
  const t = stripDiacritics(token)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (t.length < 3) return null;
  return BY_NAME.get(t) ?? null;
}

/** Cor cuja faixa vale o dígito `d` (0–9). */
export function colorByDigit(d: number): BandColor | undefined {
  return BAND_COLORS.find((c) => c.digit === d);
}

/** Cor cuja faixa multiplica por 10^`exp` (−2 a 9). */
export function colorByMult(exp: number): BandColor | undefined {
  return BAND_COLORS.find((c) => c.mult === exp);
}

/** Número em pt-BR: separador decimal vírgula ("0.5" → "0,5"). */
export function ptNum(n: number): string {
  return String(n).replace(".", ",");
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** Expoente em sobrescrito: 6 → "⁶", −1 → "⁻¹". */
export function supExp(exp: number): string {
  const digits = String(Math.abs(exp))
    .split("")
    .map((d) => SUP[Number(d)])
    .join("");
  return exp < 0 ? `⁻${digits}` : digits;
}

/**
 * `digits × 10^exp` em decimal exato. Montado por texto, não por aritmética:
 * `742 * 10 ** 6` cabe no double, mas `47 * 10 ** -2` já devolve 0.47000000000000003.
 */
export function formatOhms(digits: string, exp: number): string {
  if (exp >= 0) return digits + "0".repeat(exp);
  const k = -exp;
  const int = digits.length > k ? digits.slice(0, digits.length - k) : "0";
  const rawFrac = digits.length > k ? digits.slice(digits.length - k) : digits.padStart(k, "0");
  const frac = rawFrac.replace(/0+$/, "");
  return frac ? `${int},${frac}` : int;
}

const PREFIX: Record<number, string> = { [-3]: "m", 0: "", 3: "k", 6: "M", 9: "G" };

/** O mesmo valor com prefixo de engenharia: ("742", 6) → "742 MΩ". */
export function engOhms(digits: string, exp: number): string {
  const intLen = digits.length + exp;
  const p = Math.min(9, Math.max(-3, Math.floor((intLen - 1) / 3) * 3));
  return `${formatOhms(digits, exp - p)} ${PREFIX[p]}Ω`;
}
