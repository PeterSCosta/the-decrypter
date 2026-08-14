/**
 * Contagem como chave (mecânica A5 do acervo): a mensagem não está no texto,
 * está em QUANTAS coisas ele tem — palavras por parágrafo, palavras por linha,
 * itens por bloco, ocorrências de um caractere. A série de números quase sempre
 * sai por A1Z26. Vive fora de `extract.ts` para a aba Texto e o decoder
 * `count-key` lerem exatamente a mesma contagem.
 */
import { splitLines } from "./extract";

/** Token que conta como palavra: precisa ter letra ou dígito — "—" não conta. */
const RE_WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/** Caixa e acento fora do caminho: quem conta "a" quer contar "á" também. */
const fold = (s: string): string => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const countWords = (s: string): number => (s.match(RE_WORD) ?? []).length;

/** Parágrafo = bloco separado por linha em branco. */
export const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export const wordsPerParagraph = (text: string): number[] => splitParagraphs(text).map(countWords);

export const wordsPerLine = (text: string): number[] => splitLines(text).map(countWords);

/** Itens de uma lista dentro do bloco (vírgula, ponto-e-vírgula, marcador). */
const splitItems = (block: string): string[] =>
  block
    .split(/[,;·•|]|\r?\n/)
    .map((i) => i.trim())
    .filter((i) => countWords(i) > 0);

export const itemsPerParagraph = (text: string): number[] =>
  splitParagraphs(text).map((p) => splitItems(p).length);

/** Ocorrências de um caractere em cada linha (caixa e acento ignorados). */
export function charPerLine(text: string, needle: string): number[] {
  const n = fold(needle);
  if ([...n].length !== 1) return [];
  return splitLines(text).map((l) => [...fold(l)].filter((c) => c === n).length);
}

/** Ocorrências do caractere no texto todo. */
export const countChar = (text: string, needle: string): number =>
  charPerLine(text, needle).reduce((a, b) => a + b, 0);

/**
 * Série → letras (1=A … 26=Z). `null` quando alguma contagem cai fora de 1..26:
 * é essa recusa que separa "o texto está falando" de coincidência.
 */
export function countsToLetters(counts: number[]): string | null {
  if (counts.length === 0) return null;
  if (!counts.every((n) => Number.isInteger(n) && n >= 1 && n <= 26)) return null;
  return counts.map((n) => String.fromCharCode(96 + n)).join("");
}

export interface CountSeries {
  id: string;
  label: string;
  counts: number[];
}

const same = (a: number[], b: number[]) => a.length === b.length && a.every((n, i) => n === b[i]);

/**
 * As séries que valem a pena olhar, já sem as repetidas. `char` é opcional (o
 * 2º campo da bancada): sem ele, sai só o que se conta sem escolher nada.
 */
export function countSeries(text: string, char?: string): CountSeries[] {
  const out: CountSeries[] = [];
  const lines = wordsPerLine(text);
  const paras = wordsPerParagraph(text);

  // Quando cada parágrafo é uma linha só, as duas séries são a MESMA — sai uma,
  // com o nome do que o texto de fato tem (bloco separado por linha em branco).
  if (same(paras, lines)) {
    out.push(
      /\n\s*\n/.test(text)
        ? { id: "words-paragraph", label: "palavras por parágrafo", counts: paras }
        : { id: "words-line", label: "palavras por linha", counts: lines },
    );
  } else {
    out.push({ id: "words-paragraph", label: "palavras por parágrafo", counts: paras });
    out.push({ id: "words-line", label: "palavras por linha", counts: lines });
  }

  const items = itemsPerParagraph(text);
  const listy = items.some((n) => n > 1);
  if (listy && !out.some((s) => same(s.counts, items))) {
    out.push({ id: "items-paragraph", label: "itens por bloco", counts: items });
  }

  if (char?.trim()) {
    const perLine = charPerLine(text, char.trim());
    if (perLine.some((n) => n > 0)) {
      out.push({
        id: "char-line",
        label: `ocorrências de "${char.trim()}" por linha`,
        counts: perLine,
      });
    }
  }

  // Um número sozinho não é série (é a estatística que a aba já mostra).
  return out.filter((s) => s.counts.length >= 2);
}
