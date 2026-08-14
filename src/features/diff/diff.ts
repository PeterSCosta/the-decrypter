/**
 * Diff de duas fontes — o texto da prova (adulterado) contra o texto original.
 *
 * O acervo ensina que **o diff nunca é a resposta**: a resposta é um subproduto
 * dele. Em "Quer Provar Isto?" (2022 P12) as duas palavras fora do original
 * (EYELASH, LIGHT) traduzidas dão a rua — Hercílio Luz. Na "Bronquinha"
 * (2016-05 Et.1) o que responde é a LETRA que corrige cada palavra errada
 * (anagrama de SOCIESC). Em "Lições de Mãe" (2022 P10) o que responde é a
 * CONTAGEM de letras de cada trecho trocado (15, 8, 18, …), usada como posição
 * na linha de baixo. Daí as quatro tiras copiáveis em vez de um diff colorido.
 *
 * Compara normalizado (sem acento, sem caixa) e **devolve o original**: o corpus
 * responde com a grafia acentuada, e uma tira sem acento não cola em lugar nenhum.
 */

/** Guarda de tamanho por lado — LCS é O(n·m) e roda no thread da interface. */
export const MAX_CHARS = 20_000;
/** Teto de palavras por lado: 3.000² ≈ 9M células Uint16 (~18 MB), o limite do aceitável. */
export const MAX_TOKENS = 3_000;
/** Teto do LCS de caractere dentro de um trecho (≈ 500 × 500 caracteres). */
export const MAX_CHAR_CELLS = 250_000;

export interface Token {
  /** Grafia como está no texto — é ela que aparece na tela e na tira copiada. */
  raw: string;
  /** Forma comparável: sem acento, sem caixa. */
  norm: string;
  start: number;
  end: number;
}

/** Um trecho que difere: as palavras de um lado contra as do outro. */
export interface Hunk {
  a: Token[];
  b: Token[];
}

export interface DiffResult {
  tokensA: Token[];
  tokensB: Token[];
  /** Índices (no array de tokens) das palavras que entraram em algum trecho. */
  changedA: Set<number>;
  changedB: Set<number>;
  hunks: Hunk[];
  truncatedA: boolean;
  truncatedB: boolean;
}

/** Lado do par: `a` é o texto alterado (o da prova), `b` é a fonte original. */
export type DiffSide = "a" | "b";

const COMBINING = /\p{M}/gu;
const WORD = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/**
 * Dobra UM caractere preservando o comprimento (ç→c, Ã→a): manter a
 * correspondência 1-para-1 é o que deixa a comparação normalizada devolver
 * o caractere acentuado original.
 */
function foldChar(ch: string): string {
  const folded = ch.normalize("NFD").replace(COMBINING, "").toLowerCase();
  return folded.length === 0 ? ch.toLowerCase() : [...folded][0];
}

export function fold(text: string): string {
  return [...text].map(foldChar).join("");
}

/** Palavras do texto, com onde cada uma começa e termina (para o realce). */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  WORD.lastIndex = 0;
  let match = WORD.exec(text);
  while (match !== null) {
    out.push({
      raw: match[0],
      norm: fold(match[0]),
      start: match.index,
      end: match.index + match[0].length,
    });
    match = WORD.exec(text);
  }
  return out;
}

/**
 * Pares (i, j) de palavras iguais nos dois lados, em ordem — a maior
 * subsequência comum. Prefixo e sufixo idênticos saem antes da matriz: dois
 * documentos quase iguais (o caso do acervo) barateiam para quase nada.
 */
function matchTokens(a: Token[], b: Token[]): [number, number][] {
  const matches: [number, number][] = [];

  let lo = 0;
  while (lo < a.length && lo < b.length && a[lo].norm === b[lo].norm) {
    matches.push([lo, lo]);
    lo++;
  }

  let ea = a.length - 1;
  let eb = b.length - 1;
  const tail: [number, number][] = [];
  while (ea >= lo && eb >= lo && a[ea].norm === b[eb].norm) {
    tail.push([ea, eb]);
    ea--;
    eb--;
  }

  const n = ea - lo + 1;
  const m = eb - lo + 1;
  if (n > 0 && m > 0) {
    const w = m + 1;
    const dp = new Uint16Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] =
          a[lo + i].norm === b[lo + j].norm
            ? dp[(i + 1) * w + j + 1] + 1
            : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[lo + i].norm === b[lo + j].norm) {
        matches.push([lo + i, lo + j]);
        i++;
        j++;
      } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
        i++;
      } else {
        j++;
      }
    }
  }

  matches.push(...tail.reverse());
  return matches;
}

/**
 * Diff de palavras. Trechos vizinhos que mudaram viram UM trecho só — é o que
 * faz "CUIDAR DO SORRISO" contar 15 letras em vez de 6, 2 e 7 soltos.
 */
export function diffWords(rawA: string, rawB: string): DiffResult {
  const cutA = rawA.slice(0, MAX_CHARS);
  const cutB = rawB.slice(0, MAX_CHARS);
  const allA = tokenize(cutA);
  const allB = tokenize(cutB);
  const tokensA = allA.slice(0, MAX_TOKENS);
  const tokensB = allB.slice(0, MAX_TOKENS);

  const matches = matchTokens(tokensA, tokensB);

  const hunks: Hunk[] = [];
  const changedA = new Set<number>();
  const changedB = new Set<number>();
  let ia = 0;
  let ib = 0;

  const push = (untilA: number, untilB: number) => {
    if (untilA <= ia && untilB <= ib) return;
    for (let i = ia; i < untilA; i++) changedA.add(i);
    for (let j = ib; j < untilB; j++) changedB.add(j);
    hunks.push({ a: tokensA.slice(ia, untilA), b: tokensB.slice(ib, untilB) });
  };

  for (const [ma, mb] of matches) {
    push(ma, mb);
    ia = ma + 1;
    ib = mb + 1;
  }
  push(tokensA.length, tokensB.length);

  return {
    tokensA,
    tokensB,
    changedA,
    changedB,
    hunks,
    truncatedA: rawA.length > MAX_CHARS || allA.length > MAX_TOKENS,
    truncatedB: rawB.length > MAX_CHARS || allB.length > MAX_TOKENS,
  };
}

const sideOf = (h: Hunk, side: DiffSide) => (side === "a" ? h.a : h.b);

/** Tira (a)/(b): as palavras de cada trecho, na ordem, com a grafia original. */
export function hunkWords(result: DiffResult, side: DiffSide): string[] {
  return result.hunks.map((h) =>
    sideOf(h, side)
      .map((t) => t.raw)
      .join(" "),
  );
}

/**
 * Caracteres de `a` que não sobrevivem no LCS contra `b` — e vice-versa.
 * É o par da "Bronquinha": *sosiedade* × *sociedade* dá `s` de um lado e `c`
 * do outro; a letra que corrige é a do lado da fonte.
 */
export function changedChars(rawA: string, rawB: string): { a: string; b: string } {
  const ca = [...rawA];
  const cb = [...rawB];

  // Só letras e algarismos: espaço e pontuação viram ruído na tira copiada.
  const keep = (s: string) => [...s].filter((ch) => LETTER_OR_DIGIT.test(ch)).join("");

  // Guarda: um trecho gigante dos dois lados não é "palavra trocada", é texto
  // novo — e a matriz O(n·m) de caractere estouraria a memória. Aí tudo mudou.
  if (ca.length * cb.length > MAX_CHAR_CELLS) return { a: keep(rawA), b: keep(rawB) };

  const fa = ca.map(foldChar);
  const fb = cb.map(foldChar);
  const n = fa.length;
  const m = fb.length;
  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] =
        fa[i] === fb[j]
          ? dp[(i + 1) * w + j + 1] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }

  let outA = "";
  let outB = "";
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (fa[i] === fb[j]) {
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      outA += ca[i++];
    } else {
      outB += cb[j++];
    }
  }
  while (i < n) outA += ca[i++];
  while (j < m) outB += cb[j++];

  return { a: keep(outA), b: keep(outB) };
}

/** Tira (c): dentro de cada trecho, as letras que mudaram — uma string por trecho. */
export function hunkLetters(result: DiffResult, side: DiffSide): string[] {
  return result.hunks.map((h) => {
    const a = h.a.map((t) => t.raw).join(" ");
    const b = h.b.map((t) => t.raw).join(" ");
    const d = changedChars(a, b);
    return side === "a" ? d.a : d.b;
  });
}

/** Tira (d): quantas letras tem cada trecho — a série que vira posição. */
export function hunkLetterCounts(result: DiffResult, side: DiffSide): number[] {
  return result.hunks.map((h) =>
    sideOf(h, side).reduce((sum, t) => sum + [...t.raw].filter((c) => /\p{L}/u.test(c)).length, 0),
  );
}

/** Série de contagens pronta para colar na aba Posições (que lê "15 8 18 …"). */
export function formatCounts(counts: number[]): string {
  return counts.join(" ");
}

export interface DiffStrips {
  /** (a) palavras trocadas, na ordem em que aparecem no texto alterado. */
  changed: string[];
  /** (b) as originais correspondentes. */
  original: string[];
  /** (c) letras que mudaram dentro de cada par. */
  letters: string[];
  /** (d) contagem de letras de cada trecho. */
  counts: number[];
}

export function buildStrips(
  result: DiffResult,
  lettersSide: DiffSide = "b",
  countsSide: DiffSide = "a",
): DiffStrips {
  return {
    changed: hunkWords(result, "a"),
    original: hunkWords(result, "b"),
    letters: hunkLetters(result, lettersSide),
    counts: hunkLetterCounts(result, countsSide),
  };
}

export interface Segment {
  text: string;
  changed: boolean;
}

/** Quebra o texto em pedaços realçados/normais para a leitura lado a lado. */
export function segments(text: string, tokens: Token[], changed: Set<number>): Segment[] {
  const out: Segment[] = [];
  let cursor = 0;
  const add = (chunk: string, flag: boolean) => {
    if (chunk === "") return;
    const last = out[out.length - 1];
    if (last && last.changed === flag) last.text += chunk;
    else out.push({ text: chunk, changed: flag });
  };
  let previousChanged = false;
  tokens.forEach((t, i) => {
    if (!changed.has(i)) return;
    const gap = text.slice(cursor, t.start);
    // Espaço entre duas palavras trocadas entra no realce: o trecho é um só
    // bloco na tela, como é uma só linha na tira copiada.
    add(gap, previousChanged && gap.trim() === "");
    add(text.slice(t.start, t.end), true);
    cursor = t.end;
    previousChanged = true;
  });
  add(text.slice(cursor), false);
  return out;
}
