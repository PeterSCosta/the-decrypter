import { MORSE_PARA_LETRA } from "./codecs";
import { MAX_SIMBOLOS, PREFIXOS } from "./morse-x";

/**
 * Pollux e Morbit — as duas cifras que escondem MORSE dentro de dígitos.
 *
 * ── AS DUAS, EM UMA FRASE CADA ────────────────────────────────────────────
 * **Pollux:** cada dígito 0–9 vale ponto, traço ou separador. O mapeamento é a
 * chave: 3¹⁰ = 59.049 possibilidades.
 * **Morbit:** cada dígito 1–9 vale um PAR de símbolos morse. São as 9
 * permutações dos pares possíveis: 9! = 362.880.
 *
 * ── POR QUE A BUSCA É POR POSIÇÃO, E NÃO POR CHAVE ────────────────────────
 * Enumerar as 59.049 ou 362.880 chaves e decodificar cada uma é a forma
 * ingênua, e ela custa caro: medido, 101 ms no Pollux e 218 ms no Morbit. A
 * forma que cabe numa bancada que roda a cada tecla é andar pelo TEXTO,
 * atribuindo símbolo ao dígito na primeira vez que ele aparece e abortando
 * assim que o Morse deixar de ser prefixo válido. Medido, isso vale de 4× a
 * 50× — e o `PREFIXOS` de `morse-x.ts` é o que torna a poda possível.
 *
 * ── O TETO É CONTADO, NÃO CRONOMETRADO ────────────────────────────────────
 * Nada aqui olha o relógio. Um teto por tempo torna o resultado dependente da
 * máquina e do momento — a mesma entrada dando respostas diferentes em duas
 * teclas seguidas, sem nada na tela explicando. O teto é em PASSOS, e quando
 * ele estoura o solver devolve `estourou: true` para quem chamou poder dizer
 * na tela que a busca foi cortada.
 */

export interface Solucao {
  /** O texto decifrado. */
  texto: string;
  /** O mapeamento que produziu — dígito → símbolo(s). */
  mapa: Record<string, string>;
}

export interface Resultado {
  res: Solucao[];
  /** Passos gastos. Sempre `<= teto`, e há teste prendendo isso. */
  trabalho: number;
  /** A busca foi cortada antes de esgotar — a tela precisa dizer. */
  estourou: boolean;
}

/** Os três valores que um dígito pode ter em Pollux. */
const SIMBOLOS = [".", "-", "x"] as const;

/** Os nove pares que um dígito pode valer em Morbit, na ordem canônica. */
export const PARES_MORBIT = ["..", ".-", ".x", "-.", "--", "-x", "x.", "x-", "xx"] as const;

/**
 * Quantas leituras guardar — as MELHORES, não as primeiras.
 *
 * A busca acha muitas sequências de Morse válidas, e a ordem em que ela as
 * encontra não tem relação nenhuma com qual delas é português: medido, a
 * primeira leitura de uma cifra Pollux real saiu `SIIII5I EE II S ISEIII`.
 * Parar nas primeiras N seria deixar a resposta certa de fora e apresentar
 * lixo como se fosse resultado — o pior defeito da casa, por preguiça de
 * ordenação. Quem desempata é o vocabulário, e o teto de trabalho é o que
 * garante que procurar as melhores continue barato.
 */
const MAX_SOLUCOES = 5;

/**
 * O corpo comum das duas: DFS por posição, com teto contado.
 *
 * ── O ESTADO VIAJA, O PREFIXO NÃO SE REVARRE ──────────────────────────────
 * A primeira versão conferia a viabilidade re-lendo a sequência inteira a cada
 * passo — O(n²), e medido: 119 ms num Pollux de 103 dígitos, contra um piso de
 * fan-out de 0,4 a 1,0 ms em entrada numérica. Carregar `(atual, xs, saida)`
 * pela recursão faz cada passo custar O(1) no símbolo consumido.
 */
function resolver(
  digitos: string,
  valores: readonly string[],
  teto: number,
  avaliar: (texto: string) => number,
): Resultado {
  /** As melhores até agora, ordenadas por nota decrescente. */
  const melhores: (Solucao & { nota: number })[] = [];
  const mapa = new Map<string, string>();
  /** Morbit é bijeção: um par não pode servir a dois dígitos. */
  const bijetor = valores.length === PARES_MORBIT.length;
  const usados = new Set<string>();
  let trabalho = 0;
  let estourou = false;

  /** Estado da leitura: o código aberto, os `x` seguidos, e o texto já fechado. */
  interface Passo {
    atual: string;
    xs: number;
    saida: string;
  }

  /** Consome um símbolo. `null` quando ele torna a leitura impossível. */
  function consumir(p: Passo, ch: string): Passo | null {
    if (ch === "x") {
      const xs = p.xs + 1;
      if (xs > 2) return null;
      if (p.atual) {
        const letra = MORSE_PARA_LETRA[p.atual];
        if (!letra) return null;
        return { atual: "", xs, saida: p.saida + letra };
      }
      // Segundo `x` seguido sem código aberto: fim de palavra.
      return { atual: "", xs, saida: xs === 2 ? `${p.saida} ` : p.saida };
    }
    const atual = p.atual + ch;
    if (atual.length > MAX_SIMBOLOS || !PREFIXOS.has(atual)) return null;
    return { atual, xs: 0, saida: p.saida };
  }

  const andar = (i: number, p: Passo): void => {
    if (estourou) return;
    if (++trabalho > teto) {
      estourou = true;
      return;
    }
    if (i === digitos.length) {
      // O código que ficou aberto no fim ainda precisa fechar em letra.
      let texto = p.saida;
      if (p.atual) {
        const letra = MORSE_PARA_LETRA[p.atual];
        if (!letra) return;
        texto += letra;
      }
      texto = texto.trim();
      if (!texto) return;
      const nota = avaliar(texto);
      // Só entra quem for melhor que a pior guardada — a lista fica pequena e a
      // busca continua até o teto, em vez de parar nas primeiras encontradas.
      if (melhores.length >= MAX_SOLUCOES && nota <= melhores[melhores.length - 1].nota) return;
      melhores.push({ texto, mapa: Object.fromEntries(mapa), nota });
      melhores.sort((a, b) => b.nota - a.nota);
      if (melhores.length > MAX_SOLUCOES) melhores.length = MAX_SOLUCOES;
      return;
    }

    const d = digitos[i];
    const jaTem = mapa.get(d);
    const candidatos = jaTem !== undefined ? [jaTem] : valores;

    for (const v of candidatos) {
      if (jaTem === undefined && bijetor && usados.has(v)) continue;

      let proximo: Passo | null = p;
      for (const ch of v) {
        proximo = consumir(proximo, ch);
        if (!proximo) break;
      }
      if (!proximo) continue;

      if (jaTem === undefined) {
        mapa.set(d, v);
        if (bijetor) usados.add(v);
      }
      andar(i + 1, proximo);
      if (jaTem === undefined) {
        mapa.delete(d);
        if (bijetor) usados.delete(v);
      }
      if (estourou) return;
    }
  };

  andar(0, { atual: "", xs: 0, saida: "" });
  return {
    res: melhores.map(({ texto, mapa: m }) => ({ texto, mapa: m })),
    trabalho,
    estourou,
  };
}

export const resolverPollux = (
  digitos: string,
  teto: number,
  avaliar: (texto: string) => number,
): Resultado => resolver(digitos, SIMBOLOS, teto, avaliar);

export const resolverMorbit = (
  digitos: string,
  teto: number,
  avaliar: (texto: string) => number,
): Resultado => resolver(digitos, PARES_MORBIT, teto, avaliar);

/** Texto → dígitos de Pollux, com um mapeamento fixo. Para o `encode` e o teste. */
export function cifrarPollux(morseX: string, mapa: Record<string, string>): string {
  const inverso = new Map<string, string[]>();
  for (const [d, s] of Object.entries(mapa)) {
    inverso.set(s, [...(inverso.get(s) ?? []), d]);
  }
  let i = 0;
  return [...morseX]
    .map((s) => {
      const opcoes = inverso.get(s) ?? ["0"];
      return opcoes[i++ % opcoes.length];
    })
    .join("");
}

/** O mapeamento canônico de Pollux usado pelo `encode` — três dígitos por símbolo. */
export const POLLUX_PADRAO: Record<string, string> = {
  "1": ".",
  "2": ".",
  "3": ".",
  "4": "-",
  "5": "-",
  "6": "-",
  "7": "x",
  "8": "x",
  "9": "x",
  "0": ".",
};
