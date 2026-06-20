import type { CepsData } from "@/features/cep/types";
import type { MunicipiosData } from "@/features/ibge/types";
import type { StreetsData } from "@/features/street-guide/types";

export type DecoderCategory = "encoding" | "classical" | "transform" | "lookup";

export interface DecodeContext {
  /** Optional key for keyed ciphers (Vigenère, etc.). */
  key: string;
  /** Loaded datasets for lookup decoders (null until fetched). */
  streets: StreetsData | null;
  ceps: CepsData | null;
  municipios?: MunicipiosData | null;
}

export interface DecodeCandidate {
  decoderId: string;
  decoderName: string;
  category: DecoderCategory;
  /** Variant label, e.g. "deslocamento 3" or "chave: LIMA". */
  label?: string;
  output: string;
  notes?: string;
  /** For lookups: bypass plaintext scoring with a fixed plausibility. */
  forcedScore?: number;
  /** Hint for a custom result renderer. */
  render?:
    | "text"
    | "street"
    | "cep"
    | "caesar-table"
    | "documento"
    | "map"
    | "isbn"
    | "ncm"
    | "elements"
    | "code-list";
  /** Structured payload for custom renderers. */
  data?: unknown;
}

export interface Decoder {
  id: string;
  name: string;
  category: DecoderCategory;
  /** Return zero or more candidate interpretations of `input`. */
  decode(input: string, ctx: DecodeContext): DecodeCandidate[];
}

export interface ScoredCandidate extends DecodeCandidate {
  score: number;
}
