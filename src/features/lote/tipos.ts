import type { MotivoSemConsulta } from "@/lib/lookup-cache";

/**
 * Os desfechos possíveis de um item do lote.
 *
 * ── POR QUE UMA UNIÃO DISCRIMINADA, E NÃO CAMPOS OPCIONAIS ─────────────────
 * Porque o `switch` que desenha a linha fica exaustivo por TIPO: esquecer um
 * desfecho vira erro de compilação, e não área em branco na tela. Numa aba cuja
 * regra central é "nenhuma linha fica sem rótulo", deixar isso por conta da
 * disciplina de quem escreve o JSX é confiar demais.
 *
 * ── OS TRÊS SILÊNCIOS, QUE NÃO SÃO O MESMO SILÊNCIO ────────────────────────
 * Esta é a razão de a aba existir, e a distinção mais fácil de perder:
 *
 *   `sem-acerto`     perguntei nestas bases, e nenhuma tinha
 *   `sem-forma`      NÃO perguntei: não sei procurar isto
 *   `indeterminado`  não sei dizer se alguma base foi consultada
 *
 * Apresentar o segundo como o primeiro afirma uma busca que nunca houve. Numa
 * lista de sessenta itens esse engano não erra uma linha: erra sessenta. E
 * nenhum dos três é "não existe" — essa palavra não aparece nesta aba.
 */
export type EstadoItem =
  // ── transitórios ──
  | { tipo: "fila" }
  | { tipo: "consultando" }
  // ── terminais ──
  | { tipo: "resolvido"; acertos: Acerto[] }
  /** Perguntei — e as bases que foram lidas estão nomeadas. */
  | { tipo: "sem-acerto"; bases: string[] }
  /** Não perguntei: a entrada não tem forma de nada que o servidor resolva. */
  | { tipo: "sem-forma" }
  /** O servidor não disse o que consultou. Não afirmo consulta que não sei se houve. */
  | { tipo: "indeterminado" }
  /** O portão de custo do cliente recusou antes de sair. */
  | { tipo: "recusado"; motivo: MotivoSemConsulta; tamanho: number }
  | { tipo: "falhou"; mensagem: string }
  /** Aborto alheio, depois de uma nova tentativa. Tem botão para tentar à mão. */
  | { tipo: "interrompido" }
  /** Nunca chegou a ser perguntado, e a razão está dita. */
  | { tipo: "nao-perguntado"; razao: "parado" | "teto" | "429" | "sessao" };

/** Um campo que a coluna copiável pode oferecer. */
export type CampoId = "principal" | "logradouro" | "bairro" | "cidade" | "uf" | "coordenada";

export interface Campo {
  id: CampoId;
  rotulo: string;
}

/** Todos os campos, na ordem em que o segmentado os mostra. */
export const CAMPOS: Campo[] = [
  { id: "principal", rotulo: "resposta" },
  { id: "logradouro", rotulo: "logradouro" },
  { id: "bairro", rotulo: "bairro" },
  { id: "cidade", rotulo: "cidade" },
  { id: "uf", rotulo: "UF" },
  { id: "coordenada", rotulo: "lat, lng" },
];

/** Um acerto confirmado numa base — nunca um palpite. */
export interface Acerto {
  /** A base que respondeu, em pt-BR ("CEP", "Município", "Filme"). */
  base: string;
  /** A linha que a tela mostra. */
  texto: string;
  /** Os campos que esta base sabe preencher; ausentes ficam nulos. */
  campos: Partial<Record<CampoId, string>>;
}

/** A contagem por desfecho — o cabeçalho de integridade é feito dela. */
export interface ResumoLote {
  total: number;
  baldes: { rotulo: string; quantos: number; alerta: boolean }[];
  /** Verdadeiro enquanto houver falha, interrupção ou item não perguntado. */
  incompleto: boolean;
}
