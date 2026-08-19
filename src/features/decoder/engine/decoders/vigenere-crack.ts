import {
  type ChaveCandidata,
  decifrarVigenere,
  indiceCoincidencia,
  quebrarVigenere,
  soLetras,
} from "../criptanalise";
import { defineDecoder } from "../define";
import { coverage, realWords, scorePlaintext, wordsProntas } from "../score";
import type { DecodeCandidate } from "../types";

/**
 * VIGENÈRE SEM CHAVE — descobre a chave sozinho.
 *
 * Por que existe: `ciphers.ts:57` devolve `null` quando `ctx.key` está vazio.
 * O decoder `vigenere` da bancada, portanto, só serve para quem **já sabe** a
 * chave — e numa prova de gincana a chave é justamente o que não se sabe. Pior:
 * a chave costuma SER a resposta, não o texto. Por isso ela vai no rótulo.
 *
 * A estatística toda mora em `engine/criptanalise.ts`, com as medições. Aqui
 * ficam só os portões, que é onde este decoder pode fazer estrago.
 *
 * ── PORTÃO 1: `ctx.key` preenchido → cala a boca ─────────────────────────
 * Com chave dada, o `vigenere` responde, e melhor: ele obedece à chave do
 * usuário em vez de adivinhar. Dois cards com a mesma decifra brigariam no
 * dedup por caixa/acento do `runDecoders`, e o vencedor sairia na sorte do
 * score. Quem tem chave não precisa de criptanálise.
 *
 * ── PORTÃO 2: piso de 150 letras, medido ────────────────────────────────
 * Vigenère não se quebra em texto curto — é aritmética, não conservadorismo: o
 * qui-quadrado de uma coluna vê N/L letras, e com poucas ele erra. Medi o
 * acerto de UMA coluna (que é um César sobre m letras) no corpus cego:
 *
 *      m letras/coluna     8     12     15     20     25     30     40     60
 *      acerto da coluna  80,7%  91,7%  94,5%  96,5%  98,2%  99,2%  99,7%  100%
 *
 * E a chave inteira exige acertar TODAS as colunas, ou seja p^L: com 15 letras
 * por coluna e chave de 8, p⁸ = 64%.
 *
 * O piso, porém, não foi escolhido pela taxa de acerto — foi escolhido pelo
 * número que importa aqui: **quantas vezes uma chave ERRADA cruza o corte de
 * 0,35**. Medido com o decoder inteiro, a lista de 451 mil palavras carregada,
 * cifra com fronteira de palavra preservada, corpus cego, chaves de 3 a 8
 * letras, 960 tentativas por comprimento:
 *
 *      letras   emitidos   certos   ERRADOS   errados que cruzaram 0,35
 *        100       956       951        5              4
 *        120       956       954        2              2
 *      → 150       959       959        0              0
 *        200       959       959        0              0
 *        300       960       960        0              0
 *        600       960       960        0              0
 *
 * Em 100 letras o decoder acerta 99,5% — e mesmo assim entrega 4 chaves
 * inventadas com nota de resposta em 956. Como a chave vai no rótulo e o rótulo
 * é a resposta da prova, esses 4 valem mais que os 100 a 149 que se perdem.
 * **150 é o primeiro comprimento com zero.**
 *
 * Os erros que sobram abaixo do piso são todos **quase-acertos** de uma ou duas
 * letras (`porta`→`PODTA`, `relogios`→`RELOGIZL`, `bandeira`→`KGNDEIRA`): o
 * texto sai como português com buracos, que ainda carrega palavra real e por
 * isso o portão 3 não os pega. Quem os pega é o piso.
 *
 * ── PORTÃO 2c: IC de língua = mono-alfabética, e não é este o trabalho ───
 * Ver `TETO_IC` mais abaixo: é o portão que barra Atbash, César e texto em
 * claro pela estatística, e foi acrescentado depois de uma medição mostrar 7
 * cards acima do corte em cima de Atbash.
 *
 * ── PORTÃO 4: chave de 1 letra é César, e o César já tem força bruta ─────
 * Comprimento 1 é literalmente um deslocamento único, que o `caesar-bruteforce`
 * já varre nas 25 possibilidades e pontua uma a uma. Emitir aqui produziria a
 * MESMA saída, e o dedup do `runDecoders` mataria uma das duas pela sorte do
 * score — a armadilha que a roda de cifras já documentou. Então quando o melhor
 * candidato colapsa em 1 letra, este decoder não abre a boca: a resposta certa
 * já está na tela, com o rótulo certo.
 *
 * ── UM CARD SÓ ──────────────────────────────────────────────────────────
 * Acima do piso a medição dá 100%, então o segundo colocado é ruído com cara de
 * confirmação — e o topo da lista é o espaço mais escasso desta bancada.
 */

const ID = "vigenere-crack";
const NAME = "Vigenère sem chave (criptanálise)";

/**
 * Ver portão 2. Medido: em 150 letras, 959 de 959 chaves certas e ZERO chave
 * errada acima do corte; em 120, duas erradas acima do corte em 956.
 */
const PISO_LETRAS = 150;
/**
 * Teto sem palavra real: 0,34, logo abaixo do corte de 0,35 do `partition`.
 * Visível na gaveta — o que importa é a chave no rótulo — e nunca no topo.
 */
const TETO_SEM_PALAVRA = 0.34;
/**
 * Proporção mínima de letras na entrada. Uma cifra Vigenère é texto; se metade
 * da entrada é dígito ou pontuação, é base64/hash/coordenada e a análise de
 * frequência não tem o que dizer. Barato e barra o grosso do fan-out.
 */
const MIN_FRACAO_LETRAS = 0.5;
/**
 * TETO DE IC — o portão que a revisão adversária arrancou deste decoder.
 *
 * O caso que o pegou: **Atbash**. Rodando 25 textos em Atbash de 300 letras
 * pela bancada com a lista de palavras de verdade carregada, este decoder
 * produziu **7 cards acima de 0,35** — chave inventada, no rótulo, com nota de
 * resposta. Atbash é uma reflexão do alfabeto (a↔z), não um deslocamento, então
 * NENHUMA chave Vigenère o desfaz; a subida de encosta simplesmente escolhia a
 * menos ruim, e em 300 letras o acaso entregava palavra real bastante para o
 * portão 3 abrir. Os portões 1, 2 e 4 não pegavam: tem chave nenhuma, tem 300
 * letras, e a chave vencedora não colapsava em 1.
 *
 * O que separa os dois casos é justamente a ferramenta que este arquivo
 * introduziu. Substituição MONO-alfabética (César, Atbash, disco, substituição
 * livre) **não mexe no IC**: trocar o alfabeto não muda quantos pares iguais
 * existem. Poli-alfabética mexe, e muito. Medido no corpus cego, 500 amostras
 * por ponto:
 *
 *      letras   claro/César/Atbash p05   Vigenère L=3 p95   L=4 p95   L=6 p95
 *        100            0,0667                 0,0580        0,0586    0,0545
 *        150            0,0677                 0,0569        0,0567    0,0521
 *        300            0,0709                 0,0544        0,0541    0,0500
 *
 * O vão em 100 letras vai de 0,0586 a 0,0667; **0,062** fica no meio dele. O
 * que esse corte faz, medido:
 *
 *      letras   mono rejeitado   L=2 aceito   L=3 aceito   L=4 aceito   L=6 aceito
 *        100        98,0%           59,6%        99,2%        98,8%        99,2%
 *        150       100,0%           57,0%        99,8%       100,0%       100,0%
 *        300       100,0%           58,4%       100,0%       100,0%       100,0%
 *
 * ── O PREÇO, DECLARADO: CHAVE DE 2 LETRAS ────────────────────────────────
 * Só ~58% das cifras de chave 2 passam, e isso é escolha, não descuido: com
 * L=2 metade das letras leva um deslocamento e metade o outro, então o IC fica
 * em ~0,056 e a cauda encosta na do texto mono-alfabético (p95 de L=2 em 100
 * letras: 0,0747, ACIMA do p05 do mono). Não existe corte que aceite L=2 e
 * recuse Atbash — e chave de 2 letras é quase um César, terreno que o
 * `caesar-bruteforce` e o campo de chave já cobrem. Entre perder metade de um
 * caso raro e emitir chave inventada em cima de Atbash, perde-se o caso raro.
 */
const TETO_IC = 0.062;

function pct(x: number): number {
  return Math.round(100 * Math.min(1, Math.max(0, x)));
}

/**
 * ── POLIMENTO PELO VOCABULÁRIO: TENTADO, MEDIDO, DESCARTADO ──────────────
 * A cauda que sobra são **quase-acertos**: uma letra fora da chave
 * (`relogios` sai `RELOGIOE`), e o texto vira português com buracos, que ainda
 * carrega palavra real e por isso atravessa o portão 3.
 *
 * O conserto óbvio é uma segunda subida de encosta maximizando letras cobertas
 * por palavra real — o vocabulário sabe que "relogios" fecha as palavras e
 * "relogioe" não. Implementei e medi, cinco estratégias nas MESMAS amostras
 * (480 tentativas por comprimento, chaves de 3 a 8, corpus cego, lista de
 * verdade carregada). Erros de chave:
 *
 *      estratégia                 100   120   150   200   300   total
 *      sem polimento                0     0     0     0     0       0
 *      ≥4 letras, margem 1          1     1     0     0     0       2
 *      ≥6 letras, margem 1          4     1     0     0     0       5
 *      ≥6 letras, margem 6          1     1     0     0     0       2
 *      ≥8 letras, margem 8          6     5     4     2     1      18
 *
 * **Toda** variante piorou. O motivo está escrito no próprio `score.ts`: a
 * lista tem 7.402 palavras de 4 letras, "1 em ~57 strings aleatórias é
 * palavra". Maximizar cobertura convida o otimizador a inventar uma palavra
 * curta por acaso e quebrar a leitura verdadeira — a mesmíssima armadilha que
 * o realce de palavra real já tinha documentado. O sinal do vocabulário serve
 * para **conferir** uma resposta (portão 3), não para escolhê-la.
 *
 * Fica sem polimento, e a cauda fica declarada nas ressalvas.
 */

/**
 * A nota do card conta a evidência, não o resultado: o IC do texto cifrado (que
 * diz "poli-alfabética"), o IC por coluna que elegeu o comprimento, e o que o
 * Kasiski votou. É o que permite ao analista discordar.
 */
function nota(c: ChaveCandidata, letras: number, icCifra: number): string {
  const idioma = c.idioma === "pt" ? "português" : "inglês";
  const kas =
    c.votosKasiski > 0
      ? `O Kasiski deu ${c.votosKasiski} distâncias entre trigramas repetidos divisíveis por ${c.comprimentoTestado}.`
      : "O Kasiski não achou repetição de trigrama que ajudasse — o IC decidiu sozinho.";
  return [
    `${letras} letras. IC do texto cifrado ${icCifra.toFixed(4)} (aleatório 0,0385; português corrido 0,073) — poli-alfabética.`,
    `Fatiado em ${c.comprimentoTestado} colunas, o IC médio sobe para ${c.icMedio.toFixed(4)}, ${pct(c.encaixe)}% do caminho até o português.`,
    kas,
    `Cada coluna virou um César, resolvido por qui-quadrado contra o perfil do ${idioma}, e a chave foi refinada por verossimilhança de bigrama.`,
  ].join(" ");
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "classical",
  decode(input, ctx) {
    // Portão 1 — com chave dada, quem responde é o `vigenere`.
    if (soLetras(ctx.key ?? "").length > 0) return [];

    const letras = soLetras(input);
    // Portão 2 e o filtro de forma: texto, e texto o bastante.
    if (letras.length < PISO_LETRAS) return [];
    if (letras.length / input.length < MIN_FRACAO_LETRAS) return [];

    // Portão 2c — IC de língua significa MONO-alfabética (ou texto em claro), e
    // não é isto que este decoder resolve. Ver `TETO_IC`.
    const icCifra = indiceCoincidencia(letras);
    if (icCifra >= TETO_IC) return [];

    const candidatos = quebrarVigenere(input);
    if (candidatos.length === 0) return [];
    const melhor = candidatos[0];

    // Portão 4 — comprimento 1 é César, e o `caesar-bruteforce` já cobre.
    if (melhor.chave.length < 2) return [];

    const claro = decifrarVigenere(input, melhor.chave);

    // Portão 3 — a régua da casa. Só se cobra palavra real quando dá para
    // conferir: antes de a lista carregar (e nos testes, onde ela nunca chega)
    // o critério volta a ser o `scorePlaintext`, como no resto da bancada.
    // Punir por dado que não chegou é o bug que esta bancada já teve.
    const podeConferir = wordsProntas();
    /**
     * Cifra COLADA (sem espaços) precisa da cobertura, não do `realWords`.
     *
     * `realWords` só reporta token INTEIRO do dicionário, e texto colado é um
     * token só. Medido: com 267 letras sem espaço o cracker achava a chave
     * CERTA (`navio`, `estrela`, `montanha`) e o card ficava em 0,340, na
     * gaveta — escondendo justamente a resposta da prova. A cobertura por
     * colagem, que o `scorePlaintext` já usa, enxerga o que o token inteiro não
     * mostra.
     *
     * O CORTE FOI MEDIDO, não escolhido. Na mesma cifra colada de 172 letras:
     *
     *   chave CERTA (navio)              0,256
     *   chave errada por UMA letra (navia) 0,128   ← o pior adversário
     *   mavio · navip                    0,070 · 0,099
     *   lima · sol · porta · carro       0,000
     *   navios (uma letra a mais)        0,047
     *
     * Texto colado corta a cobertura pela metade (0,529 com espaços → 0,256),
     * porque a colagem só reconhece pedaço, não a palavra inteira. O vão entre
     * 0,128 e 0,256 é de dobro, e 0,20 fica no meio com folga dos dois lados.
     */
    const COBERTURA_COLADA = 0.2;
    const c = coverage(claro);
    const cobre = c.total > 0 && c.covered / c.total >= COBERTURA_COLADA;
    const temPalavra = !podeConferir || realWords(claro).length > 0 || cobre;
    const natural = scorePlaintext(claro);

    const candidato: DecodeCandidate = {
      decoderId: ID,
      decoderName: NAME,
      category: "classical",
      label: `chave: ${melhor.chave.toUpperCase()}`,
      output: claro,
      notes: nota(melhor, letras.length, icCifra),
      chainValue: melhor.chave,
    };
    // TETO, nunca piso: sem palavra real a nota é limitada; com ela, o
    // `scorePlaintext` decide sozinho e este decoder não empurra nada.
    return [
      temPalavra ? candidato : { ...candidato, forcedScore: Math.min(natural, TETO_SEM_PALAVRA) },
    ];
  },
});
