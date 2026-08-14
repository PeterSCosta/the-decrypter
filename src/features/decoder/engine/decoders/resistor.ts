import {
  type BandColor,
  bandColor,
  colorByDigit,
  colorByMult,
  engOhms,
  formatOhms,
  ptNum,
  supExp,
} from "@/features/reference/resistor";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

/** Uma leitura completa das faixas, já resolvida em valor. */
interface Reading {
  bands: BandColor[];
  /** Dígitos significativos ("742"), que é o que as provas costumam encadear. */
  digits: string;
  /** Expoente do multiplicador. */
  exp: number;
  /** null = resistor de 3 faixas, tolerância implícita de ±20%. */
  tol: number | null;
  ppm: number | null;
}

/**
 * Lê as faixas na ordem dada. A semântica é o número delas: 3 = dois dígitos +
 * multiplicador (±20% implícito), 4 = idem + tolerância, 5 = três dígitos +
 * multiplicador + tolerância, 6 = idem + coeficiente de temperatura.
 * Devolve null quando a sequência não descreve um resistor real — é essa recusa
 * que resolve a direção da leitura.
 */
function read(bands: BandColor[]): Reading | null {
  const n = bands.length;
  const nDigits = n <= 4 ? 2 : 3;
  let digits = "";
  for (let i = 0; i < nDigits; i++) {
    const d = bands[i].digit;
    if (d === undefined) return null;
    // Zero à esquerda não existe num componente: a peça está de cabeça para baixo.
    if (i === 0 && d === 0) return null;
    digits += d;
  }
  const exp = bands[nDigits].mult;
  if (exp === undefined) return null;
  const tolBand = n >= nDigits + 2 ? bands[nDigits + 1] : null;
  if (tolBand && tolBand.tol === undefined) return null;
  const ppmBand = n === 6 ? bands[5] : null;
  if (ppmBand && ppmBand.ppm === undefined) return null;
  return { bands, digits, exp, tol: tolBand?.tol ?? null, ppm: ppmBand?.ppm ?? null };
}

/** "1000 Ω ±5%" — o valor, do jeito que a calculadora de resistor responde. */
function valueLine(r: Reading): string {
  const tol = r.tol === null ? "±20%" : `±${ptNum(r.tol)}%`;
  const ppm = r.ppm === null ? "" : ` · ${r.ppm} ppm/K`;
  return `${formatOhms(r.digits, r.exp)} Ω ${tol}${ppm}`;
}

/** Faixa a faixa, com o papel de cada uma — é a conferência contra o componente. */
function bandLine(r: Reading): string {
  const nDigits = r.digits.length;
  return r.bands
    .map((b, i) => {
      if (i < nDigits) return `${b.name} ${b.digit}`;
      if (i === nDigits) return `${b.name} ×10${supExp(r.exp)}`;
      if (i === nDigits + 1) return `${b.name} ±${ptNum(b.tol as number)}%`;
      return `${b.name} ${b.ppm} ppm/K`;
    })
    .join(" · ");
}

function candidate(
  r: Reading,
  o: { label: string; score: number; note?: string },
): DecodeCandidate {
  return {
    decoderId: "resistor",
    decoderName: "Código de cores de resistor",
    category: "lookup",
    label: o.label,
    output: valueLine(r),
    notes: `${engOhms(r.digits, r.exp)} · ${bandLine(r)}${o.note ? ` — ${o.note}` : ""}`,
    forcedScore: o.score,
    chainValue: formatOhms(r.digits, r.exp),
  };
}

/** Texto → número (aceita "4,7k", "4700 Ω", "742M") em dígitos + expoente. */
function parseOhms(input: string): { digits: string; exp: number } | null {
  const m = input
    .trim()
    .replace(/\s+/g, "")
    .match(/^(\d+(?:[.,]\d+)?)([kKMGmg])?(?:ohms?|Ω)?$/);
  if (!m) return null;
  const [, mantissa, suffix] = m;
  // Caixa é significado no SI: "M" é mega, "m" é mili.
  const scale: Record<string, number> = { k: 3, K: 3, M: 6, G: 9, g: 9, m: -3 };
  const frac = mantissa.split(/[.,]/)[1] ?? "";
  let digits = mantissa.replace(/[.,]/g, "").replace(/^0+/, "");
  if (!digits) return null;
  let exp = (suffix ? scale[suffix] : 0) - frac.length;
  const trailing = digits.length - digits.replace(/0+$/, "").length;
  digits = digits.slice(0, digits.length - trailing);
  exp += trailing;
  return { digits, exp };
}

export const decoders = defineDecoder({
  id: "resistor",
  name: "Código de cores de resistor",
  category: "lookup",

  decode(input) {
    const tokens = input
      .trim()
      .split(/[\s,;/|·+\-–—]+/)
      .filter(Boolean);
    // O portão: 3 a 6 faixas e TODAS têm de ser nome de cor do código. Sem o
    // "todas", qualquer frase com "azul" dentro viraria resistor.
    if (tokens.length < 3 || tokens.length > 6) return [];
    const colors: BandColor[] = [];
    for (const t of tokens) {
      const c = bandColor(t);
      if (!c) return [];
      colors.push(c);
    }

    const fwd = read(colors);
    const rev = read([...colors].reverse());
    const out: DecodeCandidate[] = [];

    if (fwd) {
      out.push(candidate(fwd, { label: `${colors.length} faixas`, score: 0.6 }));
      // O valor em Ω raramente é a resposta da prova: o que se encadeia são os
      // dígitos das faixas (ITC25-P14: 742 → GDB).
      if (fwd.exp !== 0) {
        out.push({
          decoderId: "resistor",
          decoderName: "Código de cores de resistor",
          category: "lookup",
          label: "dígitos das faixas",
          output: fwd.digits,
          notes: `só os dígitos significativos, sem o multiplicador (valor cheio: ${valueLine(fwd)})`,
          forcedScore: 0.5,
          chainValue: fwd.digits,
        });
      }
    }

    if (rev) {
      // Ler ao contrário é o erro nº 1 na bancada. Quando a leitura direta é
      // impossível, a invertida é a resposta; quando as duas fecham, a direção
      // é mesmo ambígua e as duas vão para a mesa.
      const impossible = colors[0].digit === undefined || colors[0].digit === 0;
      out.push(
        candidate(rev, {
          label: `${colors.length} faixas · leitura invertida`,
          score: fwd ? 0.45 : 0.6,
          note: impossible
            ? colors[0].digit === 0
              ? "1ª faixa preta seria zero à esquerda, impossível num componente"
              : `1ª faixa ${colors[0].name} só existe como tolerância`
            : "sem faixa de ouro/prata na ponta, a direção é ambígua",
        }),
      );
    }
    return out;
  },

  /** Caminho inverso: o valor vira faixas. 4700 → amarelo violeta vermelho ouro. */
  encode(input) {
    const parsed = parseOhms(input);
    if (!parsed) return null;
    let { digits, exp } = parsed;
    // Um dígito só não é um código: 5 Ω se escreve como 50 × 10⁻¹.
    while (digits.length < 2) {
      digits += "0";
      exp -= 1;
    }
    if (digits.length > 3 || exp < -2 || exp > 9) return null;
    const mult = colorByMult(exp);
    if (!mult) return null;
    const bands = [...digits].map((d) => colorByDigit(Number(d))?.name);
    if (bands.some((b) => !b)) return null;
    // Tolerância padrão de prateleira: ouro (±5%) com 2 dígitos, marrom (±1%)
    // com 3 — que é a série em que resistores de 3 dígitos são vendidos.
    return [...bands, mult.name, digits.length === 2 ? "ouro" : "marrom"].join(" ");
  },
});
