import { CONFUSAVEIS, normalizaConfusaveis } from "@/features/reference/confusaveis";
import { defineDecoder } from "../define";
import { realWords, wordsProntas } from "../score";

/**
 * Letra de outra escrita escondida no meio de palavra latina.
 *
 * ── O DEFEITO, MEDIDO NO FAN-OUT REAL ─────────────────────────────────────
 * `a рorta рreta` (com `р` cirílico) devolvia no TOPO, a **0,62**, o card do
 * `alfabeto`: `"a rorta rreta"`. Ele translitera por SOM, e por som o `р`
 * cirílico é mesmo `r`. Mas quem esconde uma letra numa prova não esconde um
 * som — esconde um **desenho**. A resposta é `a porta preta`.
 *
 * ── E O CASO QUE NÃO PODE QUEBRAR ─────────────────────────────────────────
 * `Привет мир` → `Privet mir` está **certo**, e o `alfabeto` tem de continuar
 * respondendo isso. A diferença entre os dois casos não está no caractere: está
 * no CONTEXTO dele. Daí o portão ser por TOKEN, e ter três cláusulas.
 */

const ID = "confusaveis";
const NAME = "Letra de outra escrita (homóglifo)";

/** Um token precisa de ao menos duas latinas para o intruso ser intruso. */
const MIN_LATINAS_NO_TOKEN = 2;
/** E a maioria do token tem de ser latina, senão é texto da outra escrita. */
const RAZAO_LATINA_MINIMA = 0.5;

const LATINA = /[a-zA-ZÀ-ɏ]/;
/** Letra que não é latina nem está na tabela — grego/cirílico de verdade, ou outra escrita. */
const OUTRA_ESCRITA = /\p{L}/u;

/**
 * O portão. Um token só denuncia homóglifo quando as TRÊS valem:
 *
 * 1. o intruso está na tabela de confusáveis — não basta "fora do latino", ou
 *    `Ελληνικά` e `Привет` acenderiam;
 * 2. o token tem ao menos duas letras latinas — é o que separa `рorta` (uma
 *    letra escondida numa palavra) de `β` sozinho em `β-caroteno`, onde o
 *    hífen já separa os tokens;
 * 3. e nenhuma letra de terceira escrita, além da maioria latina — é o que
 *    cala `Москва` e `το κείμενο`.
 *
 * Medido: rejeição de **100,00%** sobre as 259.221 palavras de `words-pt`, as
 * 204.217 de `words-en` e as linhas de prova do acervo. O portão ingênuo
 * ("tem caractere fora de `[a-zA-Z]`") rejeita só 64% do português — porque
 * 92.611 palavras nossas têm acento — e reprovaria a régua da casa.
 */
function tokensSuspeitos(texto: string): boolean {
  // Hífen e travessão separam: em `β-caroteno`, o `β` é token próprio.
  for (const token of texto.split(/[\s\p{P}]+/u)) {
    if (!token) continue;
    let latinas = 0;
    let confusaveis = 0;
    let terceiras = 0;
    for (const ch of token) {
      if (CONFUSAVEIS.has(ch)) confusaveis++;
      else if (LATINA.test(ch)) latinas++;
      else if (OUTRA_ESCRITA.test(ch)) terceiras++;
    }
    if (confusaveis === 0 || terceiras > 0) continue;
    if (latinas < MIN_LATINAS_NO_TOKEN) continue;
    if (latinas / (latinas + confusaveis) < RAZAO_LATINA_MINIMA) continue;
    return true;
  }
  return false;
}

/** Exportado porque o `alfabeto` e o sniffer precisam do MESMO portão. */
export const pareceHomoglifo = tokensSuspeitos;

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input) {
    const texto = input.trim();
    if (texto.length < 3 || !tokensSuspeitos(texto)) return [];

    const leitura = normalizaConfusaveis(texto);
    if (leitura.texto === texto) return [];

    // A segunda porta, no molde do `mojibake`: a troca tem de GANHAR português
    // que o original não tinha. Sem vocabulário conferido, a nota fica no
    // patamar de quem só tem a assinatura — que aqui é o caractere, e é forte,
    // mas não é a palavra.
    const pronto = wordsProntas();
    const ganhou = pronto && realWords(leitura.texto).length > realWords(texto).length;
    const nota = ganhou ? 0.88 : 0.55;

    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup" as const,
        label: `${leitura.pares.length} letra(s) trocada(s)`,
        output: leitura.texto,
        forcedScore: nota,
        chainValue: leitura.texto,
      },
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup" as const,
        label: "posições das intrusas",
        // A lista de posições é a saída que mais vale numa prova: ela entra
        // direto no `letter-index`, que é a mecânica nº 1 do acervo.
        output: leitura.posicoes.map((p) => p + 1).join(" "),
        // Amarrado à leitura, e sempre um degrau abaixo dela: a resposta é o
        // texto limpo, as posições são o que se faz DEPOIS com ele. Solto num
        // número fixo, este card passava à frente da resposta enquanto o
        // vocabulário ainda não tinha carregado.
        forcedScore: nota - 0.08,
        chainValue: leitura.posicoes.map((p) => p + 1).join(" "),
      },
    ];
  },
  encode(input) {
    /**
     * O inverso é o DISFARCE, e disfarce não troca tudo.
     *
     * Trocar toda letra por sósia cirílica produz uma palavra 100% cirílica —
     * que não é homóglifo escondido, é texto em outra escrita, e o portão
     * (corretamente) a recusa. O que uma prova faz é esconder UMA letra dentro
     * de uma palavra latina. É isso que se faz aqui: a primeira letra de cada
     * palavra que tenha sósia, e só ela.
     */
    const inverso = new Map<string, string>();
    for (const [de, para] of CONFUSAVEIS) {
      // Cirílico primeiro: é o alfabeto com mais sósias do latino, e o disfarce
      // mais usado.
      const cp = de.codePointAt(0) ?? 0;
      if (cp >= 0x0400 && cp <= 0x04ff && !inverso.has(para)) inverso.set(para, de);
    }
    return input
      .split(/(\s+)/)
      .map((palavra) => {
        if (/^\s*$/.test(palavra)) return palavra;
        let trocou = false;
        return [...palavra]
          .map((ch) => {
            if (trocou) return ch;
            const sosia = inverso.get(ch);
            if (!sosia) return ch;
            trocou = true;
            return sosia;
          })
          .join("");
      })
      .join("");
  },
});
