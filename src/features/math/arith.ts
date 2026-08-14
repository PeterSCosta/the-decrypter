/**
 * Aritmética disfarçada — a mecânica A23 do acervo. A prova nunca diz a conta:
 * enterra os operandos na prosa e deixa **uma palavra** como dica ("aquilo que
 * todos têm em comum" = MDC, "raízes" = raiz quadrada, "dividir" = divisão).
 * Este módulo é só a matemática; quem decide QUANDO rodar — o portão contra
 * ruído — é `decoder/engine/decoders/math-helper.ts`.
 */

export interface ParsedNumber {
  /** Já normalizado: `15.586.677,75` chega aqui como 15586677.75. */
  value: number;
  /** `17,5%` vem com value 17.5 e esta marca — a fração decimal é 0.175. */
  percent: boolean;
  /** Como o texto escreveu, para a linha do painel citar o enunciado. */
  raw: string;
}

/**
 * Ponto só é milhar em grupos de exatamente 3 dígitos. É esse detalhe que
 * separa `15.586.677,75` (um número) de `68130.89.91.15.12` (cinco números
 * colados por ponto, o código do GeoTude em GIA-27).
 */
const NUMBER_RE = /(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)\s*(%)?/g;

export function parseNumbers(text: string): ParsedNumber[] {
  const out: ParsedNumber[] = [];
  for (const m of text.matchAll(NUMBER_RE)) {
    const raw = m[1];
    const value = Number(raw.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(value)) continue;
    out.push({ value, percent: m[2] === "%", raw });
  }
  return out;
}

/**
 * Blocos = parágrafos. GIA-21 "Prova Quadrada" só fecha porque cada parágrafo
 * carrega metade da coordenada; achatar o texto perde a resposta.
 */
export function parseBlocks(text: string): ParsedNumber[][] {
  return text
    .split(/\n\s*\n/)
    .map(parseNumbers)
    .filter((b) => b.length > 0);
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y > 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

export function gcdAll(values: number[]): number {
  return values.reduce((g, v) => gcd(g, v), 0);
}

/** null quando estoura o inteiro seguro — MMC cresce rápido e não vale mentir. */
export function lcmAll(values: number[]): number | null {
  let l = 1;
  for (const v of values) {
    const n = Math.abs(Math.round(v));
    if (n === 0) return null;
    l = (l / gcd(l, n)) * n;
    if (!Number.isSafeInteger(l)) return null;
  }
  return l;
}

/** Raiz exata, ou null se o número não for quadrado perfeito. */
export function exactSqrt(n: number): number | null {
  if (n < 0) return null;
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : null;
}

export const KAPREKAR = 6174;

/**
 * Cadeia de Kaprekar (decrescente − crescente) até 6174. Devolve os valores
 * intermediários; o número de passos é `chain.length`. Repdígitos (1111) não
 * convergem e voltam null.
 */
export function kaprekarChain(n: number): number[] | null {
  if (!Number.isInteger(n) || n < 1000 || n > 9999) return null;
  const chain: number[] = [];
  let cur = n;
  while (cur !== KAPREKAR && chain.length < 8) {
    const d = String(cur).padStart(4, "0").split("");
    const desc = Number([...d].sort((a, b) => Number(b) - Number(a)).join(""));
    const asc = Number([...d].sort((a, b) => Number(a) - Number(b)).join(""));
    cur = desc - asc;
    if (cur === 0) return null;
    chain.push(cur);
  }
  return cur === KAPREKAR ? chain : null;
}

/** Leitura A1Z26 — null se um único valor sair de 1..26 (é o filtro barato). */
export function a1z26(values: number[]): string | null {
  if (values.length === 0) return null;
  if (!values.every((v) => Number.isInteger(v) && v >= 1 && v <= 26)) return null;
  return values.map((v) => String.fromCharCode(64 + v)).join("");
}

/** Dobra qualquer inteiro para 1..26 (a volta ao alfabeto da aritmética modular). */
export function wrapA1Z26(v: number): number {
  return ((((Math.round(v) - 1) % 26) + 26) % 26) + 1;
}

/**
 * Dois blocos de dígitos viram coordenada: 2 dígitos de grau + o resto como
 * decimal, ambos negativos. A faixa (lat ≤ 35, lng 30..75) cobre o Brasil e é
 * o que impede um par de telefones de virar "coordenada".
 */
export function coordinateFromDigits(blocks: string[]): string | null {
  if (blocks.length !== 2 || !blocks.every((b) => /^\d{6,9}$/.test(b))) return null;
  const lat = Number(blocks[0].slice(0, 2));
  const lng = Number(blocks[1].slice(0, 2));
  if (lat > 35 || lng < 30 || lng > 75) return null;
  return `-${lat}.${blocks[0].slice(2)}, -${lng}.${blocks[1].slice(2)}`;
}

/** Números em pt-BR: inteiro cru (copiável) ou decimal com vírgula, sem cauda de zeros. */
export function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

/**
 * 15586677,75 ÷ 0,175 dá 89066730.00000001 em ponto flutuante. Sem o encaixe no
 * inteiro mais próximo, o CEP de GIA-06 nunca apareceria.
 */
function snap(n: number): number {
  const r = Math.round(n);
  return Math.abs(n - r) < 1e-6 * Math.max(1, Math.abs(r)) ? r : n;
}

export type MathOpId = "mdc" | "mmc" | "raiz" | "divisao" | "soma" | "kaprekar" | "resto";

export const OP_LABEL: Record<MathOpId, string> = {
  mdc: "MDC",
  mmc: "MMC",
  raiz: "Raiz quadrada",
  divisao: "Divisão",
  soma: "Soma",
  kaprekar: "Kaprekar",
  resto: "Resto",
};

/** Ordem fixa do painel — previsível de ler e de testar. */
const OP_ORDER: MathOpId[] = ["mdc", "mmc", "raiz", "divisao", "soma", "kaprekar", "resto"];

export interface MathLine {
  op: MathOpId;
  label: string;
  /** A linha inteira em pt-BR: é o `output` do candidato quando a dica isola a operação. */
  text: string;
  /** Valores produzidos, quando a operação devolve uma lista. */
  values?: number[];
  /** Leitura A1Z26 dos valores — o que faz GEOTUDE (GIA-27) subir sozinho. */
  reading?: string;
  /** Valor limpo para "usar como entrada". */
  chain?: string;
  /** Achado colateral: CEP de 8 dígitos, coordenada de dois blocos. */
  hint?: string;
}

export interface MathReport {
  blocks: ParsedNumber[][];
  lines: MathLine[];
}

/** 8 dígitos redondos no Vale do Itajaí são CEP antes de serem número. */
function cepHint(n: number): string | null {
  const d = String(n);
  return Number.isInteger(n) && d.length === 8 ? `CEP ${d.slice(0, 5)}-${d.slice(5)}` : null;
}

function positiveInts(values: number[]): number[] {
  return values.filter((v) => Number.isInteger(v) && v > 0);
}

function lineMdc(blocks: number[][]): MathLine | null {
  const parts: string[] = [];
  const readings: string[] = [];
  let chain: string | undefined;
  for (const values of blocks) {
    const ints = positiveInts(values);
    if (ints.length < 2) continue;
    const g = gcdAll(ints);
    if (g <= 1) {
      parts.push("MDC = 1");
      continue;
    }
    const q = ints.map((v) => v / g);
    const reading = a1z26(q);
    if (reading) readings.push(reading);
    parts.push(`MDC = ${g} → ${q.join(" ")}${reading ? ` → ${reading}` : ""}`);
    chain ??= reading ?? q.join(" ");
  }
  if (parts.length === 0) return null;
  return {
    op: "mdc",
    label: OP_LABEL.mdc,
    text: parts.join(" | "),
    reading: readings.join(" ") || undefined,
    chain,
  };
}

function lineMmc(blocks: number[][]): MathLine | null {
  const parts: string[] = [];
  let chain: string | undefined;
  for (const values of blocks) {
    const ints = positiveInts(values);
    if (ints.length < 2) continue;
    const l = lcmAll(ints);
    parts.push(l == null ? "MMC = grande demais" : `MMC = ${l}`);
    if (l != null) chain ??= String(l);
  }
  return parts.length === 0
    ? null
    : { op: "mmc", label: OP_LABEL.mmc, text: parts.join(" | "), chain };
}

function lineRaiz(blocks: number[][]): MathLine | null {
  const usable = blocks.map((vs) => vs.filter((v) => v >= 0)).filter((b) => b.length > 0);
  if (usable.length === 0) return null;

  const exact = usable.every((b) => b.every((v) => exactSqrt(v) != null));
  const perBlock = usable.map((b) => b.map((v) => exactSqrt(v) ?? Math.sqrt(v)));
  let text = `raiz: ${perBlock.map((b) => b.map(fmt).join(" ")).join(" | ")}`;
  let chain: string | undefined;
  let hint: string | undefined;
  let reading: string | undefined;

  // Só a raiz exata concatena: "26 9 48 1 8" → 2694818 só é coordenada porque
  // cada raiz é inteira. Com decimal, a colagem seria invenção.
  if (exact) {
    const joined = perBlock.map((b) => b.join(""));
    text += ` · junto: ${joined.join(" ")}`;
    chain = joined.join(" ");
    const coord = coordinateFromDigits(joined);
    if (coord) {
      hint = `possível coordenada ${coord}`;
      text += ` · ${hint}`;
      chain = coord;
    }
    reading = a1z26(perBlock.flat()) ?? undefined;
    if (reading) text += ` → ${reading}`;
  }
  return { op: "raiz", label: OP_LABEL.raiz, text, values: perBlock.flat(), reading, chain, hint };
}

/**
 * Divisão par a par: pares consecutivos, e a volta quando só há dois números.
 * O par alíquota+valor é o de GIA-06 e sempre divide **pelo** percentual, na
 * ordem em que o texto os cita ou na inversa — a outra leitura é ruído.
 */
function lineDivisao(nums: ParsedNumber[]): MathLine | null {
  if (nums.length < 2) return null;
  const pairs: [ParsedNumber, ParsedNumber][] = [];
  const percent = nums.filter((n) => n.percent);
  const plain = nums.filter((n) => !n.percent);
  if (nums.length === 2 && percent.length === 1) {
    pairs.push([plain[0], percent[0]]);
  } else {
    for (let i = 0; i + 1 < nums.length; i++) pairs.push([nums[i], nums[i + 1]]);
    if (nums.length === 2) pairs.push([nums[1], nums[0]]);
  }

  const parts: string[] = [];
  let chain: string | undefined;
  let hint: string | undefined;
  for (const [a, b] of pairs) {
    const divisor = b.percent ? b.value / 100 : b.value;
    if (divisor === 0) continue;
    const q = snap(a.value / divisor);
    const show = (n: ParsedNumber) => `${n.raw}${n.percent ? "%" : ""}`;
    parts.push(`${show(a)} ÷ ${show(b)} = ${fmt(q)}`);
    const cep = cepHint(q);
    if (cep && !hint) hint = cep;
    if (Number.isInteger(q) && chain === undefined) chain = String(q);
  }
  if (parts.length === 0) return null;
  const text = `${parts.join(" | ")}${hint ? ` · ${hint}` : ""}`;
  return { op: "divisao", label: OP_LABEL.divisao, text, chain: chain ?? undefined, hint };
}

function lineSoma(nums: ParsedNumber[]): MathLine | null {
  if (nums.length < 2) return null;
  const total = snap(nums.reduce((s, n) => s + n.value, 0));
  const hint = cepHint(total) ?? undefined;
  return {
    op: "soma",
    label: OP_LABEL.soma,
    text: `soma = ${fmt(total)}${hint ? ` · ${hint}` : ""}`,
    chain: String(total),
    hint,
  };
}

function lineKaprekar(nums: ParsedNumber[]): MathLine | null {
  const seeds = nums
    .map((n) => n.value)
    .filter((v) => Number.isInteger(v) && v >= 1000 && v <= 9999);
  const steps: number[] = [];
  const parts: string[] = [];
  for (const s of seeds) {
    const chain = kaprekarChain(s);
    if (!chain) continue;
    steps.push(chain.length);
    parts.push(`${s} → ${chain.length}`);
  }
  if (parts.length < 2) return null;
  // O "código" é a colagem das contagens — só faz sentido se cada uma tiver um
  // dígito, que é o caso (Kaprekar converge em no máximo 7 passos).
  const code = steps.join("");
  return {
    op: "kaprekar",
    label: OP_LABEL.kaprekar,
    text: `Kaprekar: ${parts.join(" · ")} · código ${code}`,
    values: steps,
    chain: code,
  };
}

function lineResto(nums: ParsedNumber[]): MathLine | null {
  const ints = nums.map((n) => n.value).filter(Number.isInteger);
  if (ints.length < 2) return null;
  const wrapped = ints.map(wrapA1Z26);
  const reading = a1z26(wrapped) ?? undefined;
  const mod10 = ints.map((v) => ((v % 10) + 10) % 10);
  return {
    op: "resto",
    label: OP_LABEL.resto,
    text: `mod 26: ${wrapped.join(" ")}${reading ? ` → ${reading}` : ""} | mod 10: ${mod10.join(" ")}`,
    values: wrapped,
    reading,
    chain: reading,
  };
}

/**
 * Roda as operações sobre os blocos. `ops` restringe ao que a dica do texto
 * pediu — sem ele, o painel completo. Nada aqui decide se DEVE rodar.
 */
export function analyzeArithmetic(blocks: ParsedNumber[][], ops?: MathOpId[]): MathReport {
  const wanted = ops ? new Set(ops) : null;
  const numeric = blocks.map((b) => b.map((n) => n.value));
  const flat = blocks.flat();

  const builders: Record<MathOpId, () => MathLine | null> = {
    mdc: () => lineMdc(numeric),
    mmc: () => lineMmc(numeric),
    raiz: () => lineRaiz(numeric),
    divisao: () => lineDivisao(flat),
    soma: () => lineSoma(flat),
    kaprekar: () => lineKaprekar(flat),
    resto: () => lineResto(flat),
  };

  const lines: MathLine[] = [];
  for (const op of OP_ORDER) {
    if (wanted && !wanted.has(op)) continue;
    const line = builders[op]();
    if (line) lines.push(line);
  }
  return { blocks, lines };
}
