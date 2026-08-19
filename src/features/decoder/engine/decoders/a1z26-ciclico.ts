import { defineDecoder } from "../define";
import { realWords, scorePlaintext, wordsProntas } from "../score";
import type { DecodeCandidate } from "../types";
import { mod } from "../util";

/**
 * A1Z26 CÍCLICO: a contagem que passou de 26 e continuou contando.
 * 27→A, 28→B, 53→A — `letra = alfabeto[(v − base) mod 26]`.
 *
 * Por que existe: a família A1Z26 inteira **para** no 26 e a entrada some da
 * bancada. Medido rodando `runDecoders` antes deste arquivo:
 *
 *   "27 5 12 1"       → 12 resultados, ZERO de a1z26 / a1z26-reverse / roda
 *   "34 31 38 38 41"  → 13 resultados, ZERO da família (a resposta é "hello")
 *
 * Cada um dos três tem um portão legítimo para o caso dele, e por isso nenhum
 * foi tocado: `a1z26` e `a1z26-reverse` exigem token de 1–2 dígitos e faixa
 * 1..26; a roda exige que a lista INTEIRA caiba nas 26 casas do disco. Mexer
 * neles trocaria o portão de todo mundo — e o `runDecoders` deduplica por saída
 * exata, então as leituras iguais se matariam na sorte do score.
 *
 * ── 1. Só acende quando ALGUM valor passa de 26 ───────────────────────────
 * Sem isso, a leitura base 1 de uma lista 1..26 é **byte a byte** a do `a1z26`,
 * e o dedup mataria um dos dois pelo score. Medido: para "21 13 1 2 9 3" a
 * família já devolve 5 cartões (a1z26 "umabic" 0.480, roda 0.380/0.370/0.360,
 * a1z26-reverse "fnzyrx" 0.146) — não falta nada ali. Este decoder fica calado.
 *
 * ── 2. Base 1 e base 0, as duas, rotuladas ────────────────────────────────
 * A base é a numeração da primeira casa (1=A ou 0=A) e nada na lista revela
 * qual foi usada. As duas leituras diferem sempre por exatamente uma letra, e a
 * grafia não decide entre elas — quem decide é o texto que sai. Então saem as
 * duas, com a base no rótulo, ordenadas por `scorePlaintext`.
 *
 * ── 3. `forcedScore`: piso 0.32, sem teto ────────────────────────────────
 * A evidência da grafia é o valor >26 (isso é assinatura de verdade: nenhuma
 * outra leitura da família aceita a lista), mas a base é um parâmetro livre —
 * é um palpite bem fundamentado, não um acerto confirmado. Então:
 *   • a melhor leitura recebe `max(scorePlaintext, 0.32)`. O 0.32 é DE PROPÓSITO
 *     abaixo do corte de 0.35 do `partition` — mesmo raciocínio (e mesmo
 *     número) do piso do `math-helper`: sem palavra, a leitura é hipótese e
 *     hipótese não disputa o topo, mas continua visível na gaveta;
 *   • sem teto, porque o `a1z26` também corre solto no score natural ("umabic"
 *     sobe a 0.480 sozinho) e é justamente o `scorePlaintext` que separa "hello"
 *     (0.598) de "ifmmp" (0.129) — pôr teto achataria o único sinal que importa;
 *   • a segunda leitura recebe `min(natural, melhor − 0.01)`. É só desempate: o
 *     `runDecoders` empata por COMPRIMENTO da saída, e as duas bases têm sempre
 *     o mesmo comprimento (a armadilha que a roda já documentou).
 *
 * ── 4. Teto: 78 (três voltas). `999999` NÃO é contagem ───────────────────
 * Todo inteiro tem resto mod 26, então sem teto este decoder acenderia em CEP,
 * telefone, data e código — e não é raro o lixo formar palavra: medido, o
 * `math-helper` (cujo mod 26 não tem teto) lê "999999 5 12 1" como **MELA**,
 * 0.562, acima do corte. 78 = três voltas completas: cabe o 53 do enunciado (a
 * 3ª volta começando) e não cabe ASCII, que é a leitura concorrente de verdade
 * nessa faixa — "84 79 80 79" é "TOPO" pelo `decimal` (0.394) e
 * "72 69 76 76 79" é "HELLO" (0.598); as duas listas carregam um valor ≥ 79 e
 * este decoder não abre a boca. Uma contagem à mão que passou de três voltas
 * não é contagem à mão.
 *
 * ── 5. Piso de 4 valores e nada de sinal: a coordenada GMS ───────────────
 * O falso positivo caro desta bancada (que tem uma aba de Geolocalização
 * inteira) é grau/minuto/segundo. Medido com piso 3: "-26 54 32" — coordenada
 * de Blumenau — acendia com dois cartões ("acg" 0.32 e "zbf"). Minuto e segundo
 * correm 0..59, então 33 dos 60 valores passam de 26: quase toda coordenada GMS
 * ganharia cartão. Duas travas, as duas baratas:
 *   • **piso de 4 valores** (a família usa 3) — a tripla GMS não entra, e uma
 *     contagem de 3 letras é rara o bastante para valer o troco;
 *   • **sinal barra a entrada** — contagem não tem sinal, e no Brasil as duas
 *     metades da coordenada são negativas ("-26 54 32 -49 4 12", que tem 6
 *     valores e escaparia do piso). O "-" ENTRE dígitos segue sendo separador,
 *     como no resto da família: "27-5-12-1" continua lendo "aela".
 */

const ALFABETO = "abcdefghijklmnopqrstuvwxyz";
/** Tamanho do alfabeto — o módulo da volta. */
const VOLTA = 26;
/** Piso de valores: 4, um a mais que a família — é o que barra a tripla GMS. Ver bloco 5. */
const MIN_VALORES = 4;
/** Teto de valor: três voltas. Ver bloco 4 do cabeçalho. */
const TETO = 3 * VOLTA;
/** Visível na gaveta, abaixo do corte de 0.35 do `partition`. Ver bloco 3. */
const PISO = 0.32;

/** Numeração da primeira casa: 1=A (clássico) ou 0=A (contagem que começa do zero). */
type Base = 0 | 1;

/**
 * Números da entrada. Mesmo separador da família (`a1z26`, roda), mas SEM o
 * limite de 2 dígitos — é ele que hoje engole a entrada cíclica.
 */
function lerContagem(input: string): number[] | null {
  // Sinal na frente de um número = coordenada/temperatura, não contagem. O "-"
  // entre dígitos continua sendo separador ("27-5-12-1"). Ver bloco 5.
  if (/(^|[\s(])[-+]\s*\d/.test(input)) return null;
  const tokens = input
    .trim()
    .split(/[\s,;.\-_/]+/)
    .filter(Boolean);
  if (tokens.length < MIN_VALORES || !tokens.every((t) => /^\d+$/.test(t))) return null;
  const nums = tokens.map(Number);
  if (!nums.every((n) => n >= 0 && n <= TETO)) return null;
  // A assinatura: alguma casa passou do fim do alfabeto. Sem isso é o `a1z26`.
  if (!nums.some((n) => n > VOLTA)) return null;
  return nums;
}

function ler(values: number[], base: Base): string {
  return values.map((v) => ALFABETO[mod(v - base, VOLTA)]).join("");
}

function nota(values: number[], base: Base): string {
  const passaram = values.filter((v) => v > VOLTA).length;
  const maior = Math.max(...values);
  const voltas = Math.floor((maior - base) / VOLTA) + 1;
  return `${passaram} de ${values.length} valores passam de 26 — o maior (${maior}) cai na ${voltas}ª volta. Com a 1ª casa valendo ${base}: letra = alfabeto[(v − ${base}) mod 26].`;
}

const ID = "a1z26-ciclico";
const NAME = "A1Z26 cíclico (a contagem deu a volta)";

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "classical",
  decode(input) {
    const values = lerContagem(input);
    if (!values) return [];

    const leituras = ([1, 0] as const)
      .map((base) => ({ base, output: ler(values, base) }))
      .map((l) => ({ ...l, s: scorePlaintext(l.output) }))
      .sort((a, b) => b.s - a.s);

    /**
     * ── O TETO QUE A REVISÃO ADVERSÁRIA EXIGIU ────────────────────────────
     * A primeira versão tinha piso 0,32 e NENHUM teto, apostando que sem
     * palavra a leitura ficaria na gaveta. Medido em 20 listas numéricas
     * realistas, **sete** cruzaram o corte de 0,35 com saída sem sentido:
     *
     *   `34 31 38 41`          (idades)      → `helo`   0,555
     *   `12 34 45 67 78`       (quina)       → `mitpa`  0,498
     *   `12 08 26 14 30`       (data+hora)   → `miaoe`  0,461
     *   `04 17 29 33 41 52`    (mega-sena)   → `erdhpa` 0,421
     *
     * O decoder acende em 98,5% das listas de 4 a 7 números até 78 — ou seja,
     * em quase toda lista de números que alguém cola. Isso é aceitável para um
     * palpite que fica na gaveta; não é aceitável para um que sobe.
     *
     * A regra passa a ser: **só cruza o corte com PALAVRA REAL confirmada.**
     * O `realWords` é o mesmo que alimenta o selo da bancada, então o critério
     * na tela e o critério aqui são o mesmo — e "hello" continua subindo,
     * enquanto "mitpa" não.
     */
    // Só se cobra palavra real quando dá para conferir: antes de a lista
    // chegar (e nos testes, onde ela nunca chega) o critério é o score, como
    // era. Punir por dado ausente seria o mesmo erro do `wordsReady` que não
    // re-ranqueava, já corrigido nesta bancada.
    const podeConferir = wordsProntas();
    const temPalavra = !podeConferir || realWords(leituras[0].output).length > 0;
    const topo = temPalavra ? Math.max(leituras[0].s, PISO) : PISO;

    return leituras.map<DecodeCandidate>((l, i) => ({
      decoderId: ID,
      decoderName: NAME,
      category: "classical",
      label: `base ${l.base} (${l.base === 1 ? "1=A, 27=A" : "0=A, 26=A"})`,
      output: l.output,
      notes: nota(values, l.base),
      forcedScore: i === 0 ? topo : Math.min(l.s, topo - 0.01),
    }));
  },
});
