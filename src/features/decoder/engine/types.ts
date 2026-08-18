import type { AirportsData } from "@/features/airport/types";
import type { BridgesData } from "@/features/bridge/types";
import type { CepsData } from "@/features/cep/types";
import type { EstacoesData } from "@/features/estacao/types";
import type { MunicipiosData } from "@/features/ibge/types";
import type { PixData } from "@/features/pix/types";
import type { StreetsData } from "@/features/street-guide/types";
import type { VotacoesData } from "@/features/votacao/types";
import type { LookupHits } from "@/lib/lookup-cache";

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
   * lista de deslocamentos. Opcional — 104 dos 106 decoders o ignoram.
   */
  aux?: string;
  /** Id do decoder quando a bancada roda no modo "uma cifra só". */
  only?: string;
  /**
   * Consultas já resolvidas para ESTA entrada, vindas de `/api/lookup`.
   *
   * O fan-out é síncrono, então o decoder não pode ir à rede: quem consulta é o
   * hook, antes de rodar a corrida, e os decoders só formatam o que chegou.
   * `q` vem junto para o decoder recusar um acerto que é de uma tecla atrás.
   */
  hits?: LookupHits | null;
  /** Consulta em voo: o card mostra esqueleto em vez de "nada encontrado". */
  hitsCarregando?: boolean;
  /** Consultas online indisponíveis — distinto de "não encontrei". */
  hitsErro?: string | null;
  /** Loaded datasets for lookup decoders (null until fetched). */
  streets: StreetsData | null;
  /**
   * CEP e município saíram do navegador: quem responde é `hits`, pré-resolvido
   * pela API. Os campos ficam **opcionais** em vez de sumir para os testes do
   * motor, que montam o contexto à mão, seguirem compilando sem alteração —
   * o que quebraria neles seria a checagem de excesso de propriedade do
   * TypeScript, não a lógica.
   */
  ceps?: CepsData | null;
  municipios?: MunicipiosData | null;
  /** Idem CEP/município: agora vem por `hits`. Mantido opcional pelos testes. */
  airports?: AirportsData | null;
  pix?: PixData | null;
  /**
   * Pontes, passarelas e viadutos — LOCAIS e preguiçosas.
   *
   * São 94 linhas (86 KB): mandá-las à API custaria um RTT para responder o
   * que cabe na memória. Chegam quando a entrada diz "ponte"/"passarela".
   */
  bridges?: BridgesData | null;
  /**
   * Votações de Blumenau (TSE 2024). Preguiçosa como as pontes, e pelo mesmo
   * motivo: 10 KB que só interessam a quem digitou um número.
   */
  votacoes?: VotacoesData | null;
  /** Estações geodésicas do Vale (IBGE). Preguiçosa, como as votações. */
  estacoes?: EstacoesData | null;
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
    | "wheel"
    | "poste"
    | "ponte"
    | "cid"
    | "car"
    | "cnae"
    | "fipe"
    | "votacao"
    | "youtube";
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
