import { decoders } from "./registry";
import { scorePlaintext } from "./score";
import type { DecodeContext, Decoder, ScoredCandidate } from "./types";

export interface RunResult {
  results: ScoredCandidate[];
  /** Decoders that produced at least one candidate. */
  hitCount: number;
}

/**
 * Run every decoder over `input`, score each candidate's plausibility, and
 * return them ranked best-first. Lookups carry a `forcedScore`; text outputs
 * are scored with the plaintext heuristic.
 */
export function runDecoders(
  input: string,
  ctx: DecodeContext,
  list: Decoder[] = decoders,
): RunResult {
  const results: ScoredCandidate[] = [];
  const hits = new Set<string>();

  for (const d of list) {
    let candidates: ReturnType<Decoder["decode"]>;
    try {
      candidates = d.decode(input, ctx);
    } catch {
      candidates = [];
    }
    for (const c of candidates) {
      hits.add(d.id);
      const score = c.forcedScore ?? scorePlaintext(c.output);
      results.push({ ...c, score });
    }
  }

  results.sort((a, b) => b.score - a.score || a.output.length - b.output.length);

  /**
   * Colapsa saídas iguais vindas de decoders diferentes (ROT13 == afim
   * a=1,b=13), ficando com a de maior nota — que a ordenação já pôs primeiro.
   *
   * ── POR QUE A COMPARAÇÃO IGNORA CAIXA E ACENTO ──────────────────────────
   * Ela comparava texto EXATO, e por isso `HELLO` e `hello` sobreviviam os
   * dois. Medido na tela com `34 31 38 38 41`: a MESMA leitura ocupava os três
   * primeiros lugares — o A1Z26 cíclico em minúscula, a linha "Resto → A1Z26"
   * da Aritmética escondida em maiúscula, e o painel dos 5 números com ela
   * dentro. Três cards, todos 0,75, uma resposta só.
   *
   * O topo da lista é o espaço mais escasso deste produto: quem está sob
   * pressão lê os três primeiros e decide. Gastar os três com a mesma coisa é
   * pior que ruído — parece confirmação, e não é: é o mesmo cálculo repetido.
   *
   * Dobrar caixa e acento é seguro aqui porque a saída de uma cifra não carrega
   * significado na caixa: quem produziu `HELLO` e quem produziu `hello`
   * decifraram a mesma coisa. E o card que sobrevive é o de maior nota, que na
   * prática é o do decoder mais específico.
   */
  const dobrar = (t: string): string => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const chave = dobrar(r.output);
    if (seen.has(chave)) return false;
    seen.add(chave);
    return true;
  });

  return { results: deduped, hitCount: hits.size };
}

/** Split ranked results into likely (≥ threshold) and unlikely buckets. */
export function partition(results: ScoredCandidate[], threshold = 0.35) {
  const likely = results.filter((r) => r.score >= threshold);
  const unlikely = results.filter((r) => r.score < threshold);
  return { likely, unlikely };
}
