import { ApiError } from "@/lib/api";
import { type LookupHits, consultar, permissoesNaJanela } from "@/lib/lookup-cache";
import { estadoDeResposta } from "./resumo";
import type { EstadoItem } from "./tipos";

/**
 * O motor da rodada: N termos → N desfechos, sem React e sem rede obrigatória
 * (as duas dependências entram por parâmetro, e é isso que torna 429, 401,
 * estouro de orçamento e cancelamento testáveis).
 */

/**
 * Quantas consultas ao mesmo tempo.
 *
 * O limite provável não é o limitador de requisições: o controlador roda as
 * sub-consultas de um lookup **em sequência** dividindo o `DbContext` da
 * requisição, então a primeira parede é o pool do Postgres. Quatro é o que
 * mantém o servidor ocupado sem enfileirar conexão.
 */
export const CONCORRENCIA = 4;

/**
 * ── O ORÇAMENTO, E POR QUE ELE NÃO É UM MARCA-PASSO ────────────────────────
 * O backend dá 120 requisições por minuto por IP, em janela FIXA, e a equipe
 * inteira atrás do NAT do local divide esse balde — com a bancada consumindo
 * dele a cada tecla.
 *
 * Espalhar o lote no tempo NÃO reduz o custo dele: sessenta consultas custam
 * sessenta permissões, cedo ou tarde. Um intervalo mínimo entre despachos só
 * faria uma lista de sessenta demorar meio minuto numa aba cuja pergunta é
 * "agora". O que de fato estoura o balde é o SEGUNDO lote no mesmo minuto.
 *
 * Então: sem intervalo, e com teto. Enquanto houver saldo, despacha à toda; ao
 * bater no teto, espera o mais antigo sair da janela. Um lote num balde vazio
 * fecha em segundos — o caso comum. Um segundo lote no mesmo minuto desacelera
 * sozinho, em vez de virar 429 para a equipe inteira.
 */
export const TETO_JANELA = 90;
/** As 30 que sobram dos 120 ficam para quem está digitando na bancada. */
export const RESERVA_BANCADA = 30;

/** A janela do limitador é de um minuto; esperar menos é voltar ao 429. */
export const ESPERA_429_MS = 60_000;

/**
 * Uma retentativa, e só uma.
 *
 * Um aborto pode ser alheio (a bancada cancelando, uma corrida do cache). Nesse
 * caso vale tentar de novo — e agora funciona, porque o cancelamento limpa o
 * cache na mesma volta. Na segunda vez o item vira `interrompido`, com botão
 * para tentar à mão: insistir sozinho é como se transforma uma corrida em laço.
 */
export const MAX_TENTATIVAS = 2;

export type DesfechoRodada = "completo" | "parado" | "429" | "sessao";

export interface OpcoesLote {
  termos: string[];
  sinal: AbortSignal;
  /** Chamado a cada mudança de estado de um termo. */
  porTermo: (termo: string, estado: EstadoItem) => void;
  /** Chamado quando a rodada para de despachar e passa a esperar. */
  aoPausar?: (ate: number, razao: "429" | "orcamento") => void;
  /**
   * Chamado quando a espera por orçamento acaba e a rodada volta a despachar.
   *
   * Sem a contraparte, a faixa "aguardando o orçamento de rede" ficava na tela
   * pelo resto da rodada, enquanto os itens pintavam atrás dela — a tela
   * afirmando um estado que já tinha passado.
   */
  aoRetomar?: () => void;
  consultarFn?: (q: string) => Promise<LookupHits>;
  permissoesFn?: () => number;
  esperarFn?: (ms: number) => Promise<void>;
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function executarLote(o: OpcoesLote): Promise<DesfechoRodada> {
  const consultarUm = o.consultarFn ?? ((q: string) => consultar(q, "lote"));
  const permissoes = o.permissoesFn ?? permissoesNaJanela;
  const esperar = o.esperarFn ?? dormir;

  const fila = [...o.termos];
  const tentativas = new Map<string, number>();
  for (const t of fila) o.porTermo(t, { tipo: "fila" });

  /** O primeiro motivo de parada vence: ele decide o rótulo do que sobrou. */
  let parada: DesfechoRodada | null = null;

  const restantes = () => {
    const vivos = [...fila];
    fila.length = 0;
    return vivos;
  };

  async function trabalhar(): Promise<void> {
    while (!parada && fila.length > 0) {
      if (o.sinal.aborted) {
        parada = "parado";
        return;
      }

      // Orçamento antes de despachar — ver o cabeçalho de TETO_JANELA.
      if (permissoes() >= TETO_JANELA) {
        const ate = Date.now() + 5_000;
        o.aoPausar?.(ate, "orcamento");
        await esperar(5_000);
        o.aoRetomar?.();
        continue;
      }

      const termo = fila.shift();
      if (termo === undefined) return;

      o.porTermo(termo, { tipo: "consultando" });
      try {
        const hits = await consultarUm(termo);
        o.porTermo(termo, estadoDeResposta(hits, termo));
      } catch (e) {
        const erro = e as Error;

        if (erro.name === "AbortError") {
          // Aborto do NOSSO botão Parar: o sinal está marcado, e o resto vira
          // "não perguntei", nunca "não achei".
          if (o.sinal.aborted) {
            parada = "parado";
            o.porTermo(termo, { tipo: "nao-perguntado", razao: "parado" });
            return;
          }
          const n = (tentativas.get(termo) ?? 0) + 1;
          tentativas.set(termo, n);
          if (n < MAX_TENTATIVAS) {
            fila.push(termo);
            o.porTermo(termo, { tipo: "fila" });
            continue;
          }
          o.porTermo(termo, { tipo: "interrompido" });
          continue;
        }

        if (erro instanceof ApiError && erro.status === 401) {
          // A sessão caiu no meio. Os que já resolveram ficam na tela; os
          // demais dizem que não chegaram a ser perguntados.
          parada = "sessao";
          o.porTermo(termo, { tipo: "nao-perguntado", razao: "sessao" });
          return;
        }

        if (erro instanceof ApiError && erro.status === 429) {
          // NÃO se re-tenta sozinho. A janela do servidor é fixa: insistir
          // mantém o lote em 429 pelo resto do minuto e come a cota da equipe
          // inteira atrás do mesmo IP.
          parada = "429";
          o.aoPausar?.(Date.now() + ESPERA_429_MS, "429");
          o.porTermo(termo, { tipo: "nao-perguntado", razao: "429" });
          return;
        }

        o.porTermo(termo, { tipo: "falhou", mensagem: erro.message });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, o.termos.length) }, trabalhar));

  // O que sobrou na fila nunca foi perguntado — e a razão é a da parada.
  const razao = parada === "sessao" ? "sessao" : parada === "429" ? "429" : "parado";
  for (const t of restantes()) o.porTermo(t, { tipo: "nao-perguntado", razao });

  return parada ?? "completo";
}
