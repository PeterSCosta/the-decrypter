import { defineDecoder } from "../define";
import { realWords, wordsProntas } from "../score";

/**
 * SOLETRAÇÃO EM PORTUGUÊS — "M de Maria, E de Ernesto, L de Luís".
 *
 * ── O QUE O LEVANTAMENTO ACHOU, E MUDOU O DESENHO ──────────────────────────
 * O plano previa um decoder de TABELA: uma lista brasileira fixa (Amor,
 * Bandeira, Cobra…) contra a qual casar os tokens. A pesquisa derrubou isso:
 *
 *  • **Não existe norma brasileira em palavras portuguesas.** ANATEL (Res.
 *    449/2006, revogada) só *permite* o "Código Fonético Internacional", sem
 *    tabela; o DECEA (MCA 100-16) publica o **ICAO, em inglês**; o manual de
 *    comunicações do Exército (EB70-MC-10.246/2020) foi lido inteiro e tem zero
 *    ocorrências de "fonétic" ou "soletr". O Brasil oficializou o ICAO.
 *  • **A lista mais citada não tem fonte.** "Amor, Bandeira, Cobra…" aparece em
 *    três lugares e os três remontam a um domínio morto, nunca arquivado.
 *  • **E na prática não há lista.** A fonte que descreve o uso diz que ele "só é
 *    mais ou menos padronizado até a letra E, pois a forma como se soletram as
 *    outras sempre depende do vocabulário de quem dita".
 *
 * Um decoder que assume uma lista inventa autoridade que não existe, e erra
 * toda vez que a prova usar outra palavra. **A forma acrofônica não precisa de
 * lista**: a letra vem escrita, e a palavra só tem de começar com ela. Ela se
 * autoverifica, que é a única base sobre a qual esta casa constrói.
 *
 * A tabela das cinco variantes vai para a Cola, como legenda e com a
 * procedência de cada uma — lá ela informa sem afirmar.
 *
 * ── O PORTÃO, E POR QUE O NÚMERO DO PLANO ESTAVA ERRADO ────────────────────
 * `docs/PLANO-CATALOGOS.md` supunha que um portão de 60% "dispararia em prosa
 * portuguesa". **Medido em 262.364 tokens** (81 provas do acervo + a
 * documentação pt-BR do repositório): não dispara — **zero vezes**, nem com 60%,
 * nem com a lista inflada a 67 palavras. Prosa corrida não encadeia
 * substantivos concretos.
 *
 * O risco real é outro, e é o que este portão trata:
 *
 *  1. **Cadeia, não token.** Exige ≥3 pares "X de Palavra" seguidos. Medido:
 *     **0 cadeias de 2 pares** em 262 mil tokens de prosa.
 *  2. **Os pares têm de ser ADJACENTES.** As 10 ocorrências acrofônicas isoladas
 *     do corpus são armadilhas do idioma — *"é de expectativa"*, *"e de
 *     espaços"*, *"s de silêncio"* — e todas vêm cercadas de prosa. Ver
 *     `ENTRE_PARES`: a primeira versão tentava recusar pela LETRA e matava
 *     "O de Ouro" junto.
 *  3. **A saída tem de formar palavra real**, quando o vocabulário já carregou.
 */

/** Ligações aceitas entre a letra e a palavra: "A de Amor", "A do Amor". */
const LIGACAO = "(?:de|do|da)";

/** Mínimo de pares para virar cadeia. Medido: 0 cadeias de 2 em 262 mil tokens. */
const MIN_PARES = 3;

/**
 * O que pode existir ENTRE dois pares — e é isto que substituiu o portão errado.
 *
 * A primeira versão recusava a entrada inteira quando a letra ditada era `a`,
 * `e` ou `o`, porque são palavras do português. Só que "O de Ouro" e "E de
 * Estrela" são pares perfeitamente legítimos, e a regra matava justamente as
 * entradas que o decoder existe para ler — nenhum dos seis casos de teste
 * passava.
 *
 * O que separa a cadeia da armadilha não é a letra: é a **densidade**. Numa
 * soletração os pares se encostam, separados só por vírgula, hífen, espaço ou
 * um "e". Na prosa, as ocorrências acrofônicas isoladas do corpus — *"é de
 * expectativa"*, *"s de silêncio"* — vêm cercadas de texto. Exigir que os pares
 * sejam adjacentes recusa a prosa sem recusar a soletração.
 */
const ENTRE_PARES = /^[\s,;.·•\-–—/|]*(?:e\s+)?$/i;

const RE_PAR = new RegExp(`(?<![\\p{L}])(\\p{L})\\s*${LIGACAO}\\s+(\\p{L}[\\p{L}'’-]*)`, "giu");

/** Dobra acento e caixa. `\p{M}` e a classe de marcas combinantes do Unicode. */
const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const ID = "soletracao";
const NAME = "Soletração (X de Palavra)";

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  decode(input) {
    /**
     * Colhe a MAIOR corrida de pares adjacentes, não todos os pares do texto.
     * Um documento pode ter três "X de Y" espalhados em parágrafos diferentes;
     * isso não é uma soletração, é coincidência.
     */
    let melhor: { letra: string; palavra: string }[] = [];
    let atual: { letra: string; palavra: string }[] = [];
    let fimAnterior = -1;

    for (const m of input.matchAll(RE_PAR)) {
      const letra = semAcento(m[1]);
      const palavra = m[2];
      const inicio = m.index ?? 0;

      // Acrofonia: a palavra tem de começar pela letra. É o que se autoverifica.
      const acrofonico = semAcento(palavra)[0] === letra;
      const colado = fimAnterior >= 0 && ENTRE_PARES.test(input.slice(fimAnterior, inicio));

      if (!acrofonico) {
        atual = [];
        fimAnterior = -1;
        continue;
      }
      atual = colado ? [...atual, { letra, palavra }] : [{ letra, palavra }];
      fimAnterior = inicio + m[0].length;
      if (atual.length > melhor.length) melhor = atual;
    }

    const pares = melhor;
    if (pares.length < MIN_PARES) return [];

    const saida = pares
      .map((p) => p.letra)
      .join("")
      .toUpperCase();

    // Portão 3: com vocabulário carregado, a saída tem de formar português.
    // Sem ele o decoder ainda emite, com nota menor — a cadeia acrofônica de 3+
    // pares já é assinatura forte por si, e calar seria pior.
    const pronto = wordsProntas();
    if (pronto && realWords(saida).length === 0) return [];

    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "transform" as const,
        label: `${pares.length} pares`,
        output: saida,
        // Alto: a cadeia acrofônica não acontece por acaso (0 em 262 mil tokens
        // de prosa) e ainda se confirma no vocabulário. Abaixo de acerto em base
        // real, que é evidência de outra natureza.
        forcedScore: pronto ? 0.88 : 0.7,
        chainValue: saida,
      },
    ];
  },
});
