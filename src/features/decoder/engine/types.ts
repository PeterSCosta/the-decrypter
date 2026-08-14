import type { AirportsData } from "@/features/airport/types";
import type { CepsData } from "@/features/cep/types";
import type { MunicipiosData } from "@/features/ibge/types";
import type { PixData } from "@/features/pix/types";
import type { StreetsData } from "@/features/street-guide/types";

export type DecoderCategory = "encoding" | "classical" | "transform" | "lookup";

/** Rótulos pt-BR das categorias, para a barra lateral de seleção. */
export const CATEGORY_LABELS: Record<DecoderCategory, string> = {
  encoding: "Codificações",
  classical: "Cifras",
  transform: "Transformações",
  lookup: "Consultas",
};

/** Descreve um campo extra da bancada que uma cifra consome. */
export interface InputSpec {
  /** Rótulo curto mostrado na bancada (a affordance é o rótulo). */
  label: string;
  /** Sem valor preenchido, o decoder nem entra na corrida do fan-out. */
  required?: boolean;
  placeholder?: string;
}

export interface DecodeContext {
  /** Optional key for keyed ciphers (Vigenère, etc.). */
  key: string;
  /**
   * Segundo campo genérico: a fonte a indexar, o texto original de um diff, a
   * lista de deslocamentos. Opcional — 74 decoders o ignoram.
   */
  aux?: string;
  /** Id do decoder quando a bancada roda no modo "uma cifra só". */
  only?: string;
  /** Loaded datasets for lookup decoders (null until fetched). */
  streets: StreetsData | null;
  ceps: CepsData | null;
  municipios?: MunicipiosData | null;
  airports?: AirportsData | null;
  pix?: PixData | null;
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
  /**
   * Valor limpo para encadear ("usar como entrada"). Sem ele, só `render`
   * textual encadeia — `output` de um lookup é prosa ("Rua X — -26.9, -49.0"),
   * não um valor. String vazia = este candidato não encadeia.
   */
  chainValue?: string;
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
    | "code-list"
    | "barcode"
    | "registrobr"
    | "math"
    | "wheel";
  /** Structured payload for custom renderers. */
  data?: unknown;
}

export interface Decoder {
  id: string;
  name: string;
  category: DecoderCategory;
  /**
   * Campos extras que esta cifra consome. `required` tira o decoder do fan-out
   * enquanto o campo estiver vazio (o filtro mora no hook, nunca em
   * `runDecoders` — senão os testes do motor mudam de comportamento).
   */
  inputs?: { key?: InputSpec; aux?: InputSpec };
  /** Return zero or more candidate interpretations of `input`. */
  decode(input: string, ctx: DecodeContext): DecodeCandidate[];
  /** Optional inverse: encode plaintext into this cipher (single-cipher mode). */
  encode?(input: string, ctx: DecodeContext): string | null;
}

export interface ScoredCandidate extends DecodeCandidate {
  score: number;
}
