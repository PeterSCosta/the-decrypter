import { countSeries, countsToLetters } from "@/features/text-extract/counts";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

const ID = "count-key";
const NAME = "Contagem como chave";

function cand(label: string, output: string, extra?: Partial<DecodeCandidate>): DecodeCandidate {
  return { decoderId: ID, decoderName: NAME, category: "transform", label, output, ...extra };
}

/**
 * Contagem como chave (A5 do acervo): a resposta não está no que o texto diz,
 * está em quantas coisas ele tem — palavras por parágrafo/linha, itens por
 * bloco, ocorrências de um caractere (2º campo). A série crua fica na gaveta
 * (0.3): ela é matéria-prima, não resposta. Só a leitura A1Z26 disputa o topo,
 * e ela só existe quando TODAS as contagens caem em 1..26 — é essa recusa que
 * separa o detector do gerador de ruído.
 *
 * Âncora: GIA-2026 04 "O poder das palavras" → 22 5 14 3 5 4 15 18 → VENCEDOR.
 */
export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  inputs: { aux: { label: "caractere a contar", placeholder: "ex.: a" } },
  decode(input, ctx) {
    // Roda a cada tecla ao lado de outros 74: sem prosa de verdade repartida em
    // linhas, nem começa. No modo "uma cifra só" quem pediu foi o usuário.
    if (ctx.only !== ID && (input.length < 40 || !/\n/.test(input))) return [];

    const out: DecodeCandidate[] = [];
    for (const s of countSeries(input, ctx.aux)) {
      const serie = s.counts.join(" ");
      out.push(
        cand(s.label, serie, {
          notes: `${s.counts.length} contagens — use como índice ou chave`,
          forcedScore: 0.3,
        }),
      );
      // Duas letras não dizem nada; abaixo disso a leitura é sorte, não sinal.
      const letters = s.counts.length >= 3 ? countsToLetters(s.counts) : null;
      if (letters) out.push(cand(`${s.label} → A1Z26`, letters));
    }
    return out;
  },
});
