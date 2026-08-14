import { scorePlaintext } from "./score";
import type { DecodeCandidate, DecodeContext, Decoder, DecoderCategory, InputSpec } from "./types";
import { isUseful } from "./util";

/**
 * Authoring helpers for decoders. Use ONE of these to add a cipher — see
 * `decoders/README.md`. They handle the boilerplate (filtering empty/unchanged
 * output, scoring/ranking variants) so a new cipher is just its transform.
 */

/** What a `mapDecoder` may return: a string, a richer result, or null to skip. */
export type DecodeResult =
  | string
  | {
      output: string;
      label?: string;
      notes?: string;
      /** Bypass plaintext scoring with a fixed plausibility (for data lookups). */
      forcedScore?: number;
      /** Valor limpo para encadear; sem ele só saída textual encadeia. */
      chainValue?: string;
      render?: DecodeCandidate["render"];
      data?: unknown;
    }
  | null
  | undefined;

/** Identity helper — author a full `Decoder` object with type inference. */
export function defineDecoder(decoder: Decoder): Decoder {
  return decoder;
}

/**
 * The common case: a decoder that maps the input to a single output. Return a
 * string (or `{ output, label?, … }`), or `null` when the input doesn't apply.
 * Output that's empty or identical to the input is dropped automatically.
 */
export function mapDecoder(opts: {
  id: string;
  name: string;
  category?: DecoderCategory;
  /** Campos extras da bancada que esta cifra consome (ver `Decoder.inputs`). */
  inputs?: { key?: InputSpec; aux?: InputSpec };
  decode: (input: string, ctx: DecodeContext) => DecodeResult;
  /** Inverse: codifica texto nessa cifra (usado no modo "uma cifra só"). */
  encode?: (input: string, ctx: DecodeContext) => string | null;
}): Decoder {
  const category = opts.category ?? "transform";
  return {
    id: opts.id,
    name: opts.name,
    category,
    ...(opts.inputs ? { inputs: opts.inputs } : {}),
    decode(input, ctx) {
      const r = opts.decode(input, ctx);
      if (r == null) return [];
      const lite = typeof r === "string" ? { output: r } : r;
      if (!isUseful(lite.output, input)) return [];
      return [{ decoderId: opts.id, decoderName: opts.name, category, ...lite }];
    },
    ...(opts.encode ? { encode: opts.encode } : {}),
  };
}

/**
 * For ciphers with an unknown parameter (Caesar shift, rail count, affine a/b):
 * generate every candidate and keep the `keep` most plausible, auto-scored.
 */
export function bruteDecoder(opts: {
  id: string;
  name: string;
  category?: DecoderCategory;
  keep?: number;
  /** Campos extras da bancada que esta cifra consome (ver `Decoder.inputs`). */
  inputs?: { key?: InputSpec; aux?: InputSpec };
  variants: (input: string, ctx: DecodeContext) => { label: string; output: string }[];
}): Decoder {
  const category = opts.category ?? "classical";
  const keep = opts.keep ?? 3;
  return {
    id: opts.id,
    name: opts.name,
    category,
    ...(opts.inputs ? { inputs: opts.inputs } : {}),
    decode(input, ctx) {
      return opts
        .variants(input, ctx)
        .filter((v) => isUseful(v.output, input))
        .map((v) => ({ v, s: scorePlaintext(v.output) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, keep)
        .map(({ v }) => ({
          decoderId: opts.id,
          decoderName: opts.name,
          category,
          label: v.label,
          output: v.output,
        }));
    },
  };
}
