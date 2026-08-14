import {
  type ColorMatch,
  type RGB,
  hslToRgb,
  nearestNamedColor,
  parseHex,
  rgbToHex,
  rgbToHsl,
} from "@/features/reference/named-colors";
import type { CodeHit } from "@/features/reference/phone-codes";
import { defineDecoder } from "../define";
import { stripDiacritics } from "../util";

/**
 * Conversão de cor (mecânica A28 do acervo): hex / rgb() / hsl() — ou uma
 * lista de triplas RGB — viram o nome aproximado na "Lista de cores" da
 * Wikipédia em português, mais os valores nos outros espaços.
 *
 * O GATE É O ITEM: três números soltos NÃO podem virar cor, senão este
 * decoder briga com meio motor (A1Z26, ASCII, DDD, data, coordenada). Por
 * isso exige sintaxe explícita (`#`, `rgb(`, `hsl(`) ou uma LISTA de duas ou
 * mais triplas com separador próprio ("245 - 245 - 220"), e nada além disso
 * na entrada.
 */

const HEX_RE = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const RGB_RE = /\brgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})/gi;
const HSL_RE =
  /\bhsla?\(\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:deg)?\s*[,\s]\s*(\d{1,3}(?:[.,]\d+)?)\s*%?\s*[,\s]\s*(\d{1,3}(?:[.,]\d+)?)\s*%?/gi;
/** Tripla com separador próprio: "245-245-220", "0 - 0 - 128", "153/102/204". */
const TRIPLE_RE = /(\d{1,3})\s*[-,/]\s*(\d{1,3})\s*[-,/]\s*(\d{1,3})/g;
/** O que pode sobrar entre triplas sem descaracterizar "isto é uma lista". */
const ONLY_SEPARATORS = /^[\s,;.:|()/-]*$/;

/** Só os separadores de um trecho: sem dígito e sem espaço. */
const separatorsOf = (s: string) => new Set(s.replace(/[\d\s]+/g, ""));

/**
 * Uma LISTA DE TRIPLAS tem dois níveis de separador: um dentro da tripla e
 * outro entre elas ("245 - 245 - 220" quebrado por vírgula ou quebra de linha).
 * Quando os dois níveis usam o MESMO caractere, não há dois níveis — há uma
 * lista rasa de números, e `TRIPLE_RE` só a fatiou de três em três por acaso.
 *
 * É o que separa a mistura RGB do acervo (ITC22 P3) de `015, 076, 038, 091, …`
 * (os códigos Faber-Castell da GIA-39) e de qualquer lista A1Z26/ASCII cujo
 * comprimento seja múltiplo de 3 — que antes viravam cor e passavam na frente
 * do decoder certo.
 */
function isFlatNumberList(input: string, triples: Parsed[]): boolean {
  const intra = new Set<string>();
  for (const t of triples) for (const ch of separatorsOf(t.text)) intra.add(ch);

  let gaps = 0;
  for (let i = 1; i < triples.length; i++) {
    const prev = triples[i - 1];
    const gap = separatorsOf(input.slice(prev.at + prev.text.length, triples[i].at));
    // Vão só de espaço/quebra de linha já é um segundo nível: não é lista rasa.
    if (gap.size === 0) return false;
    for (const ch of gap) if (!intra.has(ch)) return false;
    gaps++;
  }
  return gaps > 0;
}

interface Parsed {
  at: number;
  /** Trecho casado, para medir o que sobra ENTRE duas triplas. */
  text: string;
  rgb: RGB;
  /** Rótulo da sintaxe de entrada, para o `label` do candidato. */
  syntax: string;
}

const num = (s: string) => Number.parseFloat(s.replace(",", "."));

/** Varre uma sintaxe explícita, guardando a posição para preservar a ordem. */
function scan(
  input: string,
  re: RegExp,
  syntax: string,
  toRgb: (m: RegExpExecArray) => RGB | null,
): Parsed[] {
  const out: Parsed[] = [];
  re.lastIndex = 0;
  let m = re.exec(input);
  while (m) {
    const rgb = toRgb(m);
    if (rgb) out.push({ at: m.index, text: m[0], rgb, syntax });
    m = re.exec(input);
  }
  return out;
}

function parseColors(input: string): Parsed[] {
  const explicit = [
    ...scan(input, HEX_RE, "hex", (m) => parseHex(m[1])),
    ...scan(input, RGB_RE, "rgb()", (m) => {
      const rgb: RGB = [Number(m[1]), Number(m[2]), Number(m[3])];
      return rgb.every((v) => v <= 255) ? rgb : null;
    }),
    ...scan(input, HSL_RE, "hsl()", (m) => {
      const [h, s, l] = [num(m[1]), num(m[2]), num(m[3])];
      return h <= 360 && s <= 100 && l <= 100 ? hslToRgb([h, s, l]) : null;
    }),
  ].sort((a, b) => a.at - b.at);
  if (explicit.length > 0) return explicit;

  // Sem sintaxe explícita, só uma LISTA de triplas passa — e a entrada não
  // pode ter mais nada, senão "a equipe 3-1-2 venceu" viraria cor.
  const triples = scan(input, TRIPLE_RE, "triplas RGB", (m) => {
    const rgb: RGB = [Number(m[1]), Number(m[2]), Number(m[3])];
    return rgb.every((v) => v <= 255) ? rgb : null;
  });
  if (triples.length < 2) return [];
  if (!ONLY_SEPARATORS.test(input.replace(TRIPLE_RE, " "))) return [];
  if (isFlatNumberList(input, triples)) return [];
  return triples;
}

/** Inicial sem acento — é o que as provas indexam (Bege Açafrão… = BANANA). */
const initial = (name: string) => stripDiacritics(name).charAt(0).toUpperCase();

const fmtDelta = (d: number) => `ΔE ${d.toFixed(1).replace(".", ",")}`;

function toHit(rgb: RGB, match: ColorMatch): CodeHit {
  const [h, s, l] = rgbToHsl(rgb);
  const values = `${rgbToHex(rgb)} · rgb(${rgb.join(", ")}) · hsl(${h}, ${s}%, ${l}%)`;
  return {
    // O `code` do CodeListCard tem 40 px de largura: hex de 7 caracteres
    // quebraria em três linhas a 375 px. A inicial cabe e é o dado útil.
    code: initial(match.color.name),
    name: match.deltaE === 0 ? match.color.name : `${match.color.name} (aprox.)`,
    detail: match.deltaE === 0 ? values : `${values} · ${fmtDelta(match.deltaE)}`,
  };
}

export const decoders = defineDecoder({
  id: "color-convert",
  name: "Cores (hex/RGB/HSL)",
  category: "lookup",
  decode(input) {
    const parsed = parseColors(input);
    if (parsed.length === 0) return [];

    const matches = parsed.map((p) => nearestNamedColor(p.rgb));
    const names = matches.map((m) => m.color.name);
    const hits = parsed.map((p, i) => toHit(p.rgb, matches[i]));

    const notes: string[] = [];
    if (matches.length > 1) notes.push(`iniciais: ${names.map(initial).join("")}`);
    if (matches.length === 1 && matches[0].aliases.length > 0) {
      notes.push(`também: ${matches[0].aliases.join(" · ")}`);
    }

    const syntaxes = [...new Set(parsed.map((p) => p.syntax))];
    const exact = matches.every((m) => m.deltaE === 0);
    return [
      {
        decoderId: "color-convert",
        decoderName: "Cores (hex/RGB/HSL)",
        category: "lookup" as const,
        label: syntaxes.join(" + "),
        output: names.join(" · "),
        ...(notes.length > 0 ? { notes: notes.join(" · ") } : {}),
        // Determinístico: casar o hex na lista é certeza; aproximar é palpite.
        forcedScore: exact ? 0.85 : 0.6,
        // Encadeia como texto para o acróstico/aba Texto pegarem as iniciais.
        chainValue: names.join(" "),
        render: "code-list" as const,
        data: hits,
      },
    ];
  },
});
