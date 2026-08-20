import {
  type MathOpId,
  type ParsedNumber,
  analyzeArithmetic,
  parseBlocks,
} from "@/features/math/arith";
import { defineDecoder } from "../define";
import { scorePlaintext } from "../score";
import type { DecodeCandidate } from "../types";
import { isUseful, stripDiacritics } from "../util";

/**
 * Aritmética escondida (mecânica A23 do acervo): MDC em GIA-27 "Engenheiro
 * Foragido", raiz quadrada em GIA-21 "Prova Quadrada", divisão pela alíquota em
 * GIA-06 "Paraíso Fiscal", Kaprekar na P7 de 2019.
 *
 * É o decoder com maior risco de ruído da bancada, porque a entrada verdadeira
 * é **prosa com números enterrados** — e quase todo texto tem número. Daí o
 * portão de três faixas, na ordem em que decide:
 *
 * 1. **lista nua** — só dígitos e pontuação de número, 2..24 valores, em ao
 *    menos dois tokens (`89066-730` é um CEP, não uma lista) → painel completo;
 * 2. **prosa + palavra-dica** (`raiz`, `em comum`/`mdc`, `dividir`, `múltiplo`,
 *    `Kaprekar`, `resto`) → **só** a linha que a dica pede;
 * 3. **solo** (`ctx.only`), quando o usuário escolheu esta cifra → painel completo.
 *
 * Sem dica, prosa **nunca** dispara. É a regra que mantém a bancada limpa
 * enquanto se digita um endereço, um telefone ou uma data.
 */

const ID = "math-helper";
const NAME = "Aritmética escondida";

const MIN_VALUES = 2;
/** Acima disto é planilha colada, não prova — e a conta par a par explodiria. */
const MAX_VALUES = 24;

/** Faixa 1: nada além de dígitos e da pontuação que um número usa. */
const BARE_LIST = /^[\d\s.,;%-]+$/;

const HINTS: { op: MathOpId; re: RegExp }[] = [
  { op: "raiz", re: /\brai(?:z|zes)\b/ },
  { op: "mdc", re: /\bmdc\b|em comum|divisor comum|maximo divisor/ },
  { op: "divisao", re: /\bdividi\w*|\bdivisao\b|\bdivisoes\b/ },
  { op: "mmc", re: /\bmmc\b|\bmultiplos?\b|minimo multiplo/ },
  { op: "kaprekar", re: /kaprekar/ },
  { op: "resto", re: /\brestos?\b|\bmodulo\b|\bmodular\b/ },
  // Onda 6.8 — as duas entram sob a MESMA regra de dica que as de cima: número
  // solto não tem assinatura, e fatorar todo número acenderia em toda entrada
  // numérica da bancada.
  { op: "fatores", re: /\bprimos?\b|\bfator\w*|\bfatora\w*/ },
  {
    op: "sequencia",
    re: /\bfibonacci\b|\btriangulares?\b|\bsequencias?\b|\bquadrados?\s+perfeitos?\b/,
  },
];

/**
 * As dicas que o texto dá. O `%` entra como dica de divisão **só** no formato
 * de GIA-06 — dois números, um deles alíquota. Solto, ele acenderia em qualquer
 * texto que cite um percentual ("cresceu 12% em 2024"), que é ruído puro.
 */
function detectOps(folded: string, nums: ParsedNumber[]): MathOpId[] {
  const ops = HINTS.filter((h) => h.re.test(folded)).map((h) => h.op);
  const taxShaped = nums.length === 2 && nums.filter((n) => n.percent).length === 1;
  if (taxShaped && !ops.includes("divisao")) ops.push("divisao");
  return ops;
}

/** Quantos tokens separados por espaço o texto tem — `89066-730` é um só. */
function tokenCount(input: string): number {
  return input.trim().split(/\s+/).length;
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  decode(input, ctx) {
    const blocks = parseBlocks(input);
    const flat = blocks.flat();
    /**
     * O piso de dois números existe porque quase toda operação deste painel é
     * ENTRE números — MDC, MMC, divisão, resto. A fatoração é a exceção: "quantos
     * fatores primos tem 1400" é uma pergunta legítima sobre um número só, e a
     * palavra-dica já provou a intenção. Sem esta ressalva o único caso de uso
     * de número solto do painel ficava de fora.
     */
    const dicaDeUmSo = /\bprimos?\b|\bfator\w*|\bfatora\w*/.test(
      stripDiacritics(input).toLowerCase(),
    );
    const piso = dicaDeUmSo ? 1 : MIN_VALUES;
    if (flat.length < piso || flat.length > MAX_VALUES) return [];

    const solo = ctx.only === ID;
    const bare = BARE_LIST.test(input.trim()) && tokenCount(input) >= 2;
    const folded = stripDiacritics(input).toLowerCase();
    const ops = detectOps(folded, flat);
    if (!bare && !solo && ops.length === 0) return [];

    const full = bare || solo;
    const report = analyzeArithmetic(blocks, full ? undefined : ops);
    if (report.lines.length === 0) return [];

    const out: DecodeCandidate[] = [];
    const head = { decoderId: ID, decoderName: NAME, category: "transform" } as const;

    if (full) {
      // O painel inteiro é um cartão só. A leitura A1Z26 de qualquer linha pode
      // puxá-lo para cima: em GIA-27 o MDC lê GEOTUDE, e é isso que decide se a
      // aritmética foi o caminho certo.
      //
      // O piso é 0.32, DE PROPÓSITO abaixo do corte de 0.35 do `partition`: sem
      // uma leitura que signifique alguma coisa, o painel é uma calculadora sem
      // achado, e calculadora não disputa o topo. Medido: com piso 0.5 o cartão
      // de aritmética era o nº 1 para "47 3221 5144" e para um nº de cartão —
      // entradas numéricas banais, o pão de cada dia desta bancada. Quando a
      // leitura vale (GEOTUDE), o `max` a promove sozinha e ela sobe ao topo.
      const best = report.lines.reduce(
        (s, l) => Math.max(s, l.reading ? scorePlaintext(l.reading) : 0),
        0.32,
      );
      out.push({
        ...head,
        label: `${flat.length} números`,
        output: report.lines.map((l) => l.text).join("\n"),
        forcedScore: best,
        render: "math",
        data: report,
        chainValue: report.lines.find((l) => l.chain)?.chain ?? "",
      });
    } else {
      for (const line of report.lines) {
        out.push({
          ...head,
          label: line.label,
          output: line.text,
          forcedScore: Math.max(0.62, line.reading ? scorePlaintext(line.reading) : 0),
          render: "math",
          data: { blocks: report.blocks, lines: [line] },
          chainValue: line.chain ?? "",
        });
      }
    }

    // A leitura A1Z26 sai também como cartão de texto **sem** score forçado: se
    // formar palavra ela sobe sozinha, se formar ruído afunda para a gaveta. É o
    // autocheck — nada aqui promove gibberish a 0,5.
    const seen = new Set<string>();
    for (const line of report.lines) {
      const r = line.reading;
      if (!r || r.length < 3 || seen.has(r) || !isUseful(r, input)) continue;
      seen.add(r);
      out.push({ ...head, label: `${line.label} → A1Z26`, output: r });
      if (seen.size >= 2) break;
    }
    return out;
  },
});
