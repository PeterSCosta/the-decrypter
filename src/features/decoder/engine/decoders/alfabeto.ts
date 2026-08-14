import {
  type Alphabet,
  alphabetSummary,
  detectScript,
  findAlphabet,
  isPlainLatin,
  latinAt,
  letterAt,
  letterIndex,
} from "@/features/reference/alphabets";
import type { CodeHit } from "@/features/reference/phone-codes";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

/**
 * Alfabetos do mundo como tabela de índice. Faz duas coisas:
 *
 * (a) **conta no alfabeto certo** — com um alfabeto escolhido no campo Alfabeto,
 *     número vira letra e letra vira número DENTRO dele: "5" no havaiano é **U**
 *     (13 letras, vogais primeiro), não o E do latino;
 * (b) **reconhece a escrita** — texto em grego, cirílico, hebraico, árabe,
 *     georgiano, rúnico, hangul ou kana é identificado e transliterado sem que
 *     ninguém precise pedir.
 *
 * PORTÃO. A parte (b) só olha faixa Unicode: um CEP, um CPF ou prosa em
 * português nunca têm um caractere fora do latim, então ela não custa nada ao
 * fan-out. A parte (a) **exige o alfabeto escolhido** — número solto sem chave é
 * do `a1z26`, e disputar com ele seria ruído garantido em toda entrada numérica.
 * O painel "quantas letras tem" fica em 0.3, abaixo do corte do `partition`:
 * é diagnóstico, não resposta.
 */

const ID = "alfabeto";
const NAME = "Alfabetos do mundo";

/** Quantos itens cabem no cartão sem estourar a coluna de 375px. */
const MAX_ITEMS = 24;

const ord = (n: number) => `${n}ª`;

/** Detalhe de uma letra: posição, nome tradicional e leitura latina. */
function detail(a: Alphabet, index: number): string {
  const parts = [`${ord(index)} de ${a.letters.length}`];
  const name = a.letterNames?.[index - 1];
  if (name) parts.push(name);
  const latin = latinAt(a, index);
  if (latin && latin.toUpperCase() !== a.letters[index - 1].toUpperCase()) parts.push(latin);
  return parts.join(" · ");
}

const overflow = (total: number) =>
  total > MAX_ITEMS ? ` · +${total - MAX_ITEMS} não listadas` : "";

// ------------------------------------------------- (a) índice ↔ letra

const NUMERIC = /^[\s,;.\-_/|]*\d[\d\s,;.\-_/|]*$/;
/** O que se ignora ao ler letras: espaço e pontuação de texto. */
const SKIPPABLE = /[\s.,;:!?"()[\]{}<>«»\-–—/\\|]/;

/** Números → letras daquele alfabeto. Índice fora da faixa derruba a leitura. */
function byIndex(a: Alphabet, input: string): DecodeCandidate | null {
  if (!NUMERIC.test(input)) return null;
  const nums = input
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number);
  if (nums.length === 0 || nums.length > 60) return null;
  // Um índice fora da faixa é leitura errada do alfabeto, não resposta parcial.
  if (!nums.every((n) => n >= 1 && n <= a.letters.length)) return null;

  const letters = nums.map((n) => letterAt(a, n) ?? "");
  const data: CodeHit[] = nums
    .slice(0, MAX_ITEMS)
    .map((n) => ({ code: String(n), name: letterAt(a, n) ?? "", detail: detail(a, n) }));
  const latin = a.latin ? ` · latim: ${nums.map((n) => latinAt(a, n)).join("")}` : "";

  return {
    decoderId: ID,
    decoderName: NAME,
    category: "lookup",
    label:
      nums.length === 1
        ? `${a.name} — ${ord(nums[0])} letra`
        : `${a.name} — ${nums.length} índices`,
    output: letters.join(""),
    notes: `${a.letters.length} letras${latin}${overflow(nums.length)} · ${a.note}`,
    forcedScore: 0.7,
    chainValue: letters.join(""),
    render: "code-list",
    data,
  };
}

/** Letras daquele alfabeto → posições. Um caractere estranho derruba a leitura. */
function byLetter(a: Alphabet, input: string): DecodeCandidate | null {
  // No latino puro isto seria o A1Z26 com outro nome — e um texto inteiro
  // viraria uma tira de números que ninguém pediu.
  if (isPlainLatin(a)) return null;

  const hits: { char: string; index: number }[] = [];
  for (const ch of input) {
    const i = letterIndex(a, ch);
    if (i !== null) {
      hits.push({ char: ch, index: i });
      continue;
    }
    // Só espaço e pontuação passam: dígito ou letra de outro alfabeto significa
    // que a entrada não é uma palavra deste alfabeto.
    if (!SKIPPABLE.test(ch)) return null;
  }
  // Teto curto de propósito: "letra → posição" se pergunta de uma palavra ou de
  // uma sigla. Um parágrafo inteiro vira uma tira de números que é só ruído.
  if (hits.length === 0 || hits.length > MAX_ITEMS) return null;

  const data: CodeHit[] = hits.slice(0, MAX_ITEMS).map((h) => ({
    code: h.char,
    name: String(h.index),
    detail: detail(a, h.index),
  }));
  return {
    decoderId: ID,
    decoderName: NAME,
    category: "lookup",
    label: `${a.name} — letras por posição`,
    output: hits.map((h) => h.index).join(" "),
    notes: `${a.letters.length} letras${overflow(hits.length)} · ${a.note}`,
    forcedScore: 0.65,
    chainValue: hits.map((h) => h.index).join(" "),
    render: "code-list",
    data,
  };
}

/** Painel: a entrada não é índice nem palavra, mas a contagem ainda ajuda. */
function panel(a: Alphabet): DecodeCandidate {
  return {
    decoderId: ID,
    decoderName: NAME,
    category: "lookup",
    label: `${a.name} — ${a.letters.length} letras`,
    output: `${a.name} — ${alphabetSummary(a)}`,
    notes: a.note,
    // Diagnóstico fica abaixo do corte de 0.35: informa sem disputar o topo.
    forcedScore: 0.3,
    chainValue: "",
  };
}

// ------------------------------------------------- (b) reconhecer a escrita

function byScript(input: string): DecodeCandidate | null {
  const det = detectScript(input);
  if (!det) return null;
  // Uma letra solta só vale quando é a entrada inteira ("Ω", "한"); no meio de
  // prosa, um π perdido é notação matemática, não texto em grego.
  if (det.letters.length < 2 && [...input.trim()].length > 1) return null;

  const a = det.alphabet;
  const out = det.transliterated.trim();
  if (!out || out === input.trim()) return null;

  const data: CodeHit[] = det.letters.slice(0, MAX_ITEMS).map((l) => ({
    code: l.char,
    name: l.latin || "—",
    detail: l.index === null ? "variante · fora da contagem" : detail(a, l.index),
  }));
  return {
    decoderId: ID,
    decoderName: NAME,
    category: "lookup",
    label: `${a.name} — ${a.letters.length} letras`,
    output: out,
    notes: `transliterado${overflow(det.letters.length)} · ${a.note}`,
    forcedScore: 0.62,
    chainValue: out,
    render: "code-list",
    data,
  };
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  inputs: {
    key: {
      label: "Alfabeto",
      placeholder: "havaiano · grego · hebraico · rúnico · kana · espanhol",
    },
  },
  decode(input, ctx) {
    const text = input.normalize("NFC");
    const out: DecodeCandidate[] = [];

    const script = byScript(text);
    if (script) out.push(script);

    // O alfabeto pode vir por qualquer um dos dois campos da bancada; chave que
    // não nomeia alfabeto (uma chave de Vigenère, p.ex.) não acende nada.
    const chosen = findAlphabet(ctx.key) ?? findAlphabet(ctx.aux);
    if (chosen) {
      const answer = byIndex(chosen, text) ?? byLetter(chosen, text);
      if (answer) out.push(answer);
      else if (!script) out.push(panel(chosen));
    }

    // Mesma leitura por dois caminhos (texto grego + alfabeto grego escolhido)
    // não vale dois cartões.
    return out.filter((c, i) => out.findIndex((o) => o.output === c.output) === i);
  },
});
