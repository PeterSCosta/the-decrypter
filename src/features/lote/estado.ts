import type { ItemLinha } from "@/lib/linhas";
import { cancelarDono } from "@/lib/lookup-cache";
import { executarLote } from "./executar";
import type { EstadoItem } from "./tipos";

/**
 * A rodada mora num store de MÓDULO, não no hook do painel.
 *
 * ── POR QUE FORA DO COMPONENTE ─────────────────────────────────────────────
 * Porque sair da aba é o fluxo, não a exceção: cada linha tem um botão que
 * manda aquele item para o Decodificador, e é exatamente isso que se faz com um
 * item que a bancada não soube resolver. Se o estado morresse no desmonte, a
 * volta encontraria a tela em branco — e as permissões de rede já gastas seriam
 * jogadas fora, num balde que a equipe inteira divide.
 *
 * ── O PREÇO, E COMO ELE É PAGO ─────────────────────────────────────────────
 * Uma rodada pode correr com o painel fora da tela, e aí o botão "Parar" fica
 * fora de alcance. Por isso `emAndamento()` existe e a navegação acende um ponto
 * no ícone da aba: quem saiu vê que ainda está rodando e sabe voltar.
 */

export type FaseLote =
  | "ocioso"
  | "rodando"
  | "pausado-orcamento"
  | "pausado429"
  | "sessao-caiu"
  | "parado"
  | "pronto";

export interface EstadoLote {
  /**
   * O que está escrito no campo AGORA.
   *
   * Mora aqui e não no componente porque o painel desmonta a cada troca de aba
   * — e sair da aba é o fluxo, já que o botão de cada linha manda o item para o
   * Decodificador. Com o texto em `useState`, voltar encontrava o campo vazio,
   * o botão em "Consultar 0" e a faixa "estes resultados são do texto anterior"
   * acesa sem ninguém ter digitado nada.
   */
  texto: string;
  /** O texto EXATO que gerou esta rodada — a coluna copiável sai daqui. */
  textoDoLote: string;
  itens: ItemLinha[];
  estados: Map<string, EstadoItem>;
  fase: FaseLote;
  /** Quando a pausa termina, em epoch ms. Nulo fora de pausa. */
  retomaEm: number | null;
  excedentes: string[];
  vaziasIgnoradas: number;
  /** Linhas do texto colado, contando as em branco — a coluna se alinha a ele. */
  totalLinhas: number;
}

const INICIAL: EstadoLote = {
  texto: "",
  textoDoLote: "",
  itens: [],
  estados: new Map(),
  fase: "ocioso",
  retomaEm: null,
  excedentes: [],
  vaziasIgnoradas: 0,
  totalLinhas: 0,
};

let atual: EstadoLote = INICIAL;
const ouvintes = new Set<() => void>();
let controle: AbortController | null = null;

export function assinar(cb: () => void): () => void {
  ouvintes.add(cb);
  return () => {
    ouvintes.delete(cb);
  };
}

export const ler = (): EstadoLote => atual;

export function escrever(texto: string): void {
  aplicar({ texto });
}

/**
 * Substitui o objeto RAIZ inteiro, sempre.
 *
 * `useSyncExternalStore` compara o instantâneo por identidade: mutar um campo
 * de dentro não avisa ninguém, e a tela congela sem erro nenhum no console.
 */
function aplicar(mudanca: Partial<EstadoLote>): void {
  atual = { ...atual, ...mudanca };
  for (const cb of ouvintes) cb();
}

/** Para o ponto pulsante na navegação — booleano, para não re-renderizar à toa. */
export const emAndamento = (): boolean =>
  atual.fase === "rodando" || atual.fase === "pausado-orcamento";

export interface Rodada {
  texto: string;
  itens: ItemLinha[];
  termos: string[];
  excedentes: string[];
  vaziasIgnoradas: number;
  totalLinhas: number;
}

export async function rodar(r: Rodada): Promise<void> {
  parar();
  const ctrl = new AbortController();
  controle = ctrl;

  // Os itens que o portão do cliente já recusou nunca chegam à rede, e o motivo
  // viaja com eles: "recusado" é um desfecho, não um buraco.
  const estados = new Map<string, EstadoItem>();
  for (const i of r.itens) {
    if (i.motivo)
      estados.set(i.termo, { tipo: "recusado", motivo: i.motivo, tamanho: i.termo.length });
  }
  // O excedente do teto também tem rótulo próprio — truncar calado seria
  // entregar meia lista com cara de lista inteira.
  for (const t of r.excedentes) estados.set(t, { tipo: "nao-perguntado", razao: "teto" });

  aplicar({
    textoDoLote: r.texto,
    itens: r.itens,
    estados,
    fase: "rodando",
    retomaEm: null,
    excedentes: r.excedentes,
    vaziasIgnoradas: r.vaziasIgnoradas,
    totalLinhas: r.totalLinhas,
  });

  /**
   * ── A GUARDA QUE FALTAVA, E O QUE ELA EVITA ──────────────────────────────
   * Uma rodada abortada **não morre na hora**. Duas situações reais deixam
   * trabalhadores vivos depois do `abort()`: um dormindo na espera de orçamento
   * (5 s, o caso do segundo lote no mesmo minuto) e uma promessa de cache que
   * ainda vai resolver. Quando esses acordam, o rabo do `executarLote` carimba
   * a fila inteira como "não perguntei" — e sem esta guarda o carimbo caía no
   * mapa da rodada NOVA, apagando respostas já resolvidas na tela de quem já
   * tinha recomeçado. Nada erra em silêncio pior que isso: a linha volta a
   * dizer "não perguntei" depois de já ter respondido.
   */
  const meu = () => controle === ctrl;

  const desfecho = await executarLote({
    termos: r.termos,
    sinal: ctrl.signal,
    porTermo: (termo, estado) => {
      if (!meu()) return;
      // Mapa novo a cada mudança: ver o comentário de `aplicar`.
      const proximo = new Map(atual.estados);
      proximo.set(termo, estado);
      aplicar({ estados: proximo });
    },
    aoPausar: (ate, razao) => {
      if (!meu()) return;
      aplicar({ fase: razao === "429" ? "pausado429" : "pausado-orcamento", retomaEm: ate });
    },
    aoRetomar: () => {
      if (!meu() || atual.fase !== "pausado-orcamento") return;
      aplicar({ fase: "rodando", retomaEm: null });
    },
  });

  if (controle !== ctrl) return; // outra rodada já começou
  controle = null;
  aplicar({
    fase:
      desfecho === "completo"
        ? "pronto"
        : desfecho === "sessao"
          ? "sessao-caiu"
          : desfecho === "429"
            ? "pausado429"
            : "parado",
    retomaEm: desfecho === "429" ? atual.retomaEm : null,
  });
}

/**
 * O ÚNICO cancelamento que esta aba dispara — e ele é só do dono `lote`.
 *
 * Nunca `cancelarSuperadas` global: isso abortaria também o que a bancada está
 * consultando, numa aba que a pessoa talvez tenha aberto em paralelo.
 */
export function parar(): void {
  controle?.abort();
  controle = null;
  cancelarDono("lote");
  if (atual.fase === "rodando" || atual.fase.startsWith("pausado")) {
    aplicar({ fase: "parado", retomaEm: null });
  }
}

/** Só para os testes. */
export function zerar(): void {
  controle = null;
  atual = INICIAL;
  for (const cb of ouvintes) cb();
}
