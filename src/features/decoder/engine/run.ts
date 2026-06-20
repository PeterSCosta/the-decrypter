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

  // Collapse identical outputs from different decoders (e.g. ROT13 == affine
  // a=1,b=13), keeping the highest-scored one — which sorts first.
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    if (seen.has(r.output)) return false;
    seen.add(r.output);
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
