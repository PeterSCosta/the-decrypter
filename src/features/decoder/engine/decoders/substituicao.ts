import { defineDecoder } from "../define";
import { realWords, scorePlaintext, wordsProntas } from "../score";
import {
  aplicarChave,
  carregarQuadgramas,
  chaveEmTexto,
  indiceCoincidencia,
  letrasDe,
  quadgramasProntos,
  resolverSubstituicao,
} from "../substituicao";
import type { DecodeCandidate } from "../types";
import { stripDiacritics } from "../util";

/**
 * SUBSTITUIÇÃO MONOALFABÉTICA — o solver.
 *
 * A cifra que o fan-out nunca ia quebrar por força bruta: 26! alfabetos. A
 * bancada tinha 30 cifras clássicas e nenhuma ferramenta estatística; ou tem
 * solver, ou aquela prova não sai. O motor está em `../substituicao.ts`; aqui
 * moram só os PORTÕES — que é onde este decoder pode fazer estrago.
 *
 * ── POR QUE ESTE DECODER É O MAIS PERIGOSO DA BANCADA ────────────────────
 * A régua da casa diz que resposta errada com nota alta é o pior defeito
 * possível, e cita o decoder reprovado hoje por acender em 98,5% das listas de
 * números: tinha piso e nenhum teto, e o `scorePlaintext` empurra qualquer coisa
 * pronunciável para cima.
 *
 * Aqui isso é pior, e por construção: a subida de encosta **maximiza
 * exatamente aquilo que o `scorePlaintext` mede**. Dado QUALQUER texto de
 * letras — Vigenère, transposição, base64, ruído — ela devolve a leitura mais
 * parecida com português que existe naquele espaço de chaves. O resultado é
 * pronunciável por definição. Medido, com o mesmo orçamento do fan-out:
 *
 *   entrada                     saída do solver (início)
 *   transposição colunar de 7   "aioiracopiaisaaaoaneeiacadsnimaiassemsctmrm"
 *   inglês em claro             "ado sexxiaaoo rofiogoc ado ullpum rotera ulc"
 *   lista de ruas de Blumenau   "ria lao vaico ria jiusfe de sobempro ria doino"
 *
 * Nenhuma dessas é resposta. Todas são pronunciáveis. Logo, **o score natural
 * não pode ser a evidência** deste decoder: seria pedir para o júri ser o réu.
 *
 * ── A EVIDÊNCIA É COBERTURA DE PALAVRA REAL, NÃO A EXISTÊNCIA DE UMA ─────
 * A régua manda confirmar com `realWords()`. Só que "achou uma palavra" é fraco
 * demais para uma saída de 150 letras construída para parecer português: com
 * 451 mil palavras na lista, achar uma por acaso é o caso comum, não o raro. O
 * que separa de verdade é **quanto do texto** as palavras reais cobrem
 * (bateria completa em `substituicao.test.ts`):
 *
 *   substituição real, espaçada       cobertura 68%, 70%, 73%
 *   substituição real, colada         cobertura 71%, 64%
 *   ─────────────────────────────────────────────────────────
 *   transposição colunar (5 e 7)      cobertura 24%, 17%
 *   lista de ruas (clara e cifrada)   cobertura 11%
 *   inglês (claro e cifrado)          cobertura  4%
 *   Vigenère de chave curta           cobertura  2%
 *   Vigenère longo, ruído, base64     nem chegam à subida (IC)
 *
 * O pior verdadeiro (64%) e o melhor falso (24%) deixam 40 pontos de vão, e o
 * corte ficou no meio: `COBERTURA_MINIMA`.
 *
 * Duas dessas linhas custaram correção depois de medidas, e é por isso que elas
 * estão aqui e não numa lista de "casos considerados": o inglês em claro cruzou
 * o corte com **0,493** na primeira versão, e a transposição colunar chegou a
 * 53% de cobertura — passando no portão e só não subindo porque o
 * `scorePlaintext` por acaso a rebaixou. Sorte não é portão. As duas caíram com
 * o mesmo ajuste, em `PISO_PEDACO`.
 *
 * ── SEM A LISTA CARREGADA, ESTE DECODER FICA NA GAVETA ───────────────────
 * O `a1z26-ciclico` não cobra palavra enquanto `wordsProntas()` for false, e
 * está certo: punir por dado que não chegou é bug. Aqui a conclusão se inverte,
 * e não é incoerência — é a mesma regra ("só se cobra o que dá para conferir")
 * aplicada a um decoder cuja saída é adversária do score. Sem a lista, a
 * alternativa a "não confirmei" seria o `scorePlaintext`, que este solver sabe
 * enganar. Então sem lista não há promoção: o card sai com o piso, na gaveta.
 * Isso vale nos testes de unidade também, onde a lista nunca carrega — por isso
 * os testes que exercitam a promoção montam o `setWordSet` na mão.
 *
 * ── OS OUTROS PORTÕES ────────────────────────────────────────────────────
 * • `MIN_LETRAS`: abaixo disso a subida não converge. Medido, 20 chaves por
 *   tamanho: 74 letras → 0/20 exatas; 100 → cobertura já passa; 160 → 20/20.
 *   O piso não está lá para melhorar a resposta e sim para não gastar 25 ms
 *   atrás de uma que não vai existir.
 * • **só letras**: dígito na entrada é A1Z26, ASCII, CEP, coordenada — nunca
 *   uma substituição. Uma cifra de letras não tem dígito no meio.
 * • `IC_MINIMO`: a substituição monoalfabética PRESERVA o índice de
 *   coincidência (ela só renomeia letras), então IC baixo é prova de que a
 *   entrada não é substituição de linguagem natural. Barra Vigenère (0,047) e
 *   ruído (0,038) antes da subida, de graça.
 * • **saída ≠ entrada**: quem colou português em claro não recebe um card
 *   dizendo que decifrou.
 */

/**
 * Piso de letras. Ver OS OUTROS PORTÕES.
 *
 * ── POR QUE 200, E NÃO OS 100 ORIGINAIS ─────────────────────────────────────
 * O piso nasceu em 100 porque "a subida converge a partir daí". Converge — mas
 * converge para uma leitura QUASE certa, e o que importa neste produto é quanta
 * resposta errada cruza o corte de 0,35. Medido pela revisão, 40 textos frescos
 * por comprimento, ponta a ponta:
 *
 *   letras   decifra exata   cruzam 0,35   ERRADOS acima do corte
 *     100        45%             29                **11**
 *     120        60%             36                **12**
 *     160        80%             37                 7
 *     200        90%             40                 4
 *     300        95%             40                 2
 *     400       100%             40                 0
 *
 * Onze respostas erradas em quarenta, com nota de resposta, é ruído com cara de
 * acerto — a coisa que esta bancada mais combate.
 *
 * **Não subi para 400**, que zeraria, por uma diferença que importa: aqui os
 * "errados" são quase-acertos de 95 a 99,6% das letras — sai "bincana" no lugar
 * de "gincana", leitura legível e corrigível a olho. Não é resposta inventada,
 * é resposta com erro de digitação. E na substituição a resposta é o TEXTO, que
 * a pessoa lê e conserta, não uma chave discreta que está certa ou errada.
 *
 * 200 é onde 90% sai exato e sobram 4 quase-acertos. O `vigenere-crack` escolheu
 * 150 contando a mesma métrica, e lá ela zerava — porque lá a resposta é a
 * CHAVE, e meia chave não serve para nada.
 */
const MIN_LETRAS = 200;
/**
 * Piso do índice de coincidência. Português medido: 0,081–0,094. Vigenère:
 * 0,047–0,050. Aleatório: 0,038. O corte fica com folga dos dois lados.
 */
const IC_MINIMO = 0.058;
/** Letras distintas: prosa em substituição usa quase todo o alfabeto. */
const MIN_LETRAS_DISTINTAS = 12;
/** Fração do texto coberta por palavra real para o card poder subir. */
const COBERTURA_MINIMA = 0.45;
/** …e um mínimo absoluto, para 30% de pouca coisa não valer como prova. */
const MIN_LETRAS_COBERTAS = 20;
/** Letras da saída que entram na conta de cobertura — teto de custo. */
const JANELA_COBERTURA = 240;
/** Maior palavra que a segmentação tenta casar. */
const MAIOR_PALAVRA = 15;
/** Piso de `word-rules.ts`: menos que isto não conta como palavra. */
const MENOR_PALAVRA = 4;
/** Acima disto um token vira candidato a texto colado (`GLUED_MIN` do score). */
const MIN_TOKEN_COLADO = 8;
/**
 * Menor pedaço que conta ao segmentar texto colado — 5, não os 4 do `score.ts`.
 *
 * Lá o piso de 4 alimenta um REALCE de nota, amortecido por evidência absoluta.
 * Aqui ele seria um PORTÃO, e portão com piso 4 não segura: são 7.402 palavras
 * de 4 letras na lista, ~1 em 57 sequências quaisquer, e numa saída colada
 * longa isso cobre metade do texto por acaso. Medido na bateria de falsos
 * positivos, com a mesma entrada e mudando só este número:
 *
 *   piso do pedaço   substituição real   transposição colunar
 *   4                68–85%              53%   ← 15 pontos de folga: pouco
 *   5                64–73%              24%   ← 40 pontos de folga
 *   6                48–73%               6%   ← já come o verdadeiro colado
 *
 * A 5 letras o acaso desaba e o texto de verdade quase não sente, porque
 * palavra real de 5+ letras é o que sustenta uma frase em português.
 */
const PISO_PEDACO = 5;
/** Visível na gaveta, abaixo do corte de 0,35 do `partition`. */
const PISO = 0.32;

const ID = "substituicao";
const NAME = "Substituição monoalfabética (solver)";

/**
 * `realWords` como oráculo de pertinência.
 *
 * O `score.ts` guarda o vocabulário num singleton de módulo e não o exporta —
 * e ele está na lista de arquivos que este trabalho não pode tocar. Mas
 * `realWords(p)` devolve `[p]` quando `p` é uma palavra de 4+ letras da lista,
 * então ele serve de `has()` sem precisar do conjunto.
 */
function ehPalavra(pedaco: string): boolean {
  return realWords(pedaco).length > 0;
}

/**
 * Quantas letras da saída estão dentro de palavra real.
 *
 * Espelha `coverage()` do `score.ts` — inclusive o caso do texto COLADO, que
 * aqui é obrigatório e não opcional: a resposta que esta bancada mais recebe
 * chega sem espaço ("ARESPOSTAESTAEMBAIXO…"), e `realWords` só enxerga token
 * inteiro. Sem segmentar, toda substituição colada mediria cobertura 0 e a
 * resposta certa morreria na gaveta — verificado antes de escrever isto.
 *
 * A diferença para o `score.ts` é que lá a segmentação é programação dinâmica e
 * aqui é gulosa, da maior palavra para a menor. Guloso subestima, e subestimar
 * é o lado seguro de um portão.
 */
function cobertura(saida: string): { cobertas: number; total: number; palavras: string[] } {
  const palavras: string[] = [];
  let cobertas = 0;
  let total = 0;
  let orcamento = JANELA_COBERTURA;

  for (const token of stripDiacritics(saida)
    .toLowerCase()
    .split(/[^a-z]+/)) {
    if (!token || orcamento <= 0) continue;
    const pedaco = token.slice(0, orcamento);
    orcamento -= pedaco.length;
    total += pedaco.length;

    if (pedaco.length >= MENOR_PALAVRA && ehPalavra(pedaco)) {
      cobertas += pedaco.length;
      palavras.push(pedaco);
      continue;
    }
    // Só token LONGO é candidato a texto colado — o mesmo `GLUED_MIN` do
    // `score.ts`, e pelo mesmo motivo, que aqui custou um falso positivo
    // medido: sem este piso, "rofiogoc" e "ullpum" (lixo de 6 a 8 letras que a
    // subida cospe) davam crédito por conterem uma sequência de 4 letras que
    // está no dicionário, e o inglês em claro cruzava o corte com 0,493.
    if (pedaco.length < MIN_TOKEN_COLADO) continue;
    let i = 0;
    while (i <= pedaco.length - PISO_PEDACO) {
      let achou = 0;
      for (let n = Math.min(MAIOR_PALAVRA, pedaco.length - i); n >= PISO_PEDACO; n--) {
        const sub = pedaco.slice(i, i + n);
        if (ehPalavra(sub)) {
          achou = n;
          palavras.push(sub);
          break;
        }
      }
      if (achou) {
        cobertas += achou;
        i += achou;
      } else {
        i++;
      }
    }
  }
  return { cobertas, total, palavras };
}

/** O veredito de "isto é português de verdade", usado na entrada e na saída. */
function confirmadaPorPalavras(cov: { cobertas: number; total: number }): boolean {
  return (
    cov.total > 0 &&
    cov.cobertas >= MIN_LETRAS_COBERTAS &&
    cov.cobertas / cov.total >= COBERTURA_MINIMA
  );
}

/** Entrada de cifra de letras: sem dígito e quase toda alfabética. */
function pareceCifraDeLetras(input: string): boolean {
  if (/\d/.test(input)) return false;
  let letras = 0;
  let outros = 0;
  for (const ch of stripDiacritics(input)) {
    if (/[a-zA-Z]/.test(ch)) letras++;
    else if (!/[\s.,;:!?'"()[\]{}\-–—/\\]/.test(ch)) outros++;
  }
  return outros === 0 && letras > 0;
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "classical",
  decode(input) {
    if (!pareceCifraDeLetras(input)) return [];

    const letras = letrasDe(input);
    if (letras.length < MIN_LETRAS) return [];

    const distintas = new Set(letras).size;
    if (distintas < MIN_LETRAS_DISTINTAS) return [];

    const ic = indiceCoincidencia(letras);
    if (ic < IC_MINIMO) return [];

    /**
     * A tabela de quadrigramas (161 KB) só entra AQUI, depois que os portões
     * baratos passaram — e é por isso que ela pode ser preguiçosa: só chega a
     * este ponto texto de 100+ letras com IC de língua natural, que é raro.
     *
     * `decode` é síncrono, então a primeira entrada que chega aqui dispara a
     * carga e devolve vazio; o `use-decoder` refaz a rodada quando ela chega.
     * Mesmo trato do H3 em `location/formats.ts`.
     */
    if (!quadgramasProntos()) {
      void carregarQuadgramas();
      return [];
    }

    /**
     * A ENTRADA já é texto em claro?
     *
     * Medido antes de existir esta linha: colar um parágrafo de português no
     * campo custava **25,4 ms a cada tecla** (fan-out de 23,5 para 48,9 ms) para
     * no fim jogar fora a resposta lá embaixo, no `saida === input`. O trabalho
     * era feito inteiro e descartado inteiro.
     *
     * A mesma medida de cobertura que julga a SAÍDA responde isso na entrada por
     * ~1 ms. E de quebra some o único falso positivo caro que sobrava: inglês em
     * claro (a lista tem as duas línguas), que antes chegava a subir a encosta.
     */
    if (wordsProntas() && confirmadaPorPalavras(cobertura(input))) return [];

    const solucao = resolverSubstituicao(letras);
    const saida = aplicarChave(input, solucao.chave);
    // Português em claro: a subida acha a identidade e não há o que anunciar.
    if (saida === input) return [];

    const cov = wordsProntas() ? cobertura(saida) : null;
    const confirmado = cov !== null && confirmadaPorPalavras(cov);

    // Confirmado, o card disputa com a própria nota; sem confirmar, ele é
    // hipótese e hipótese não passa do corte. Ver os dois blocos do cabeçalho.
    const score = confirmado ? Math.max(scorePlaintext(saida), PISO) : PISO;

    const fracao = cov && cov.total > 0 ? Math.round((100 * cov.cobertas) / cov.total) : 0;
    const achadas = cov ? cov.palavras.slice(0, 6).join(", ") : "";
    const notas = confirmado
      ? `IC ${ic.toFixed(3)} (substituição preserva o IC; português fica perto de 0,075). Palavra real cobre ${fracao}% da leitura: ${achadas}. ${solucao.reinicios} reinícios sobre ${solucao.letrasUsadas} letras.`
      : `IC ${ic.toFixed(3)}. ${cov === null ? "Lista de palavras ainda não carregou, então não dá para confirmar" : `Palavra real cobre só ${fracao}% da leitura`} — a subida sempre devolve algo pronunciável, então sem confirmação isto é hipótese, não resposta.`;

    const candidato: DecodeCandidate = {
      decoderId: ID,
      decoderName: NAME,
      category: "classical",
      label: `alfabeto A→Z vira ${chaveEmTexto(solucao.chave)}`,
      output: saida,
      notes: notas,
      forcedScore: score,
    };
    return [candidato];
  },
});
