import { defineDecoder } from "../define";
import { coverage, wordsProntas } from "../score";
import type { DecodeCandidate } from "../types";

/**
 * Transposição sem chave — scytale, caesar box, colunar de permutação trivial.
 *
 * ── O QUE ELA CONSERTA, E POR QUE É ONDA 0 DISFARÇADA DE CAPACIDADE NOVA ────
 * Num scytale de verdade a bancada **não calava — respondia errado**. Medido
 * antes deste arquivo existir, com `OPONTEDEFERRONORTEDEBLUMENAU…` embaralhado
 * em 5 colunas: três cards acima do corte, topo `railfence` a **0,62** com
 * `ONECTAODSOESLADIRODSROITAOCAIARPONTIEFEDBRONOJEDETNL`, e **a resposta certa
 * ausente da lista**. Em 7 colunas, quatro cards e a mesma ausência.
 *
 * O `columnar` que já existe não cobre isto: ele **exige `ctx.key`** e devolve
 * `null` sem ela — só serve para quem já sabe a resposta.
 *
 * ── A ASSINATURA É A COMBINAÇÃO, NÃO O TEXTO ───────────────────────────────
 * Transposição não muda a distribuição de letras: o texto cifrado tem índice de
 * coincidência de português e **zero palavra real**. Nenhuma outra família
 * produz essa combinação — substituição quebra o IC, codificação quebra o
 * alfabeto. Só que essa assinatura é do lado da ENTRADA, e entrada não basta:
 * é ela que faz o `railfence` disparar hoje e errar.
 *
 * ── O QUE SEGURA É A SAÍDA, E ELA SE AUTOVERIFICA ──────────────────────────
 * Toda variante é um anagrama da entrada — só a certa forma palavras. Então o
 * portão é de saída, e é duro:
 *
 *  1. **`maiorPedaco` ≥ 5.** Cobertura por razão não distingue resposta de
 *     acidente: a lista tem 7.402 palavras de 4 letras, e quatro cacos costurados
 *     cobrem 100%. O tamanho do maior pedaço reconhecido não se fabrica por acaso.
 *  2. **Cobertura ≥ 40% do analisado.** Usa `analisado`, não `total`, porque o
 *     formato desta cifra é justamente o texto colado longo — ver o bloco do
 *     `GLUED_MAX` em `score.ts`.
 *  3. **Sem vocabulário, não emite.** `wordsProntas()` falso significa que não há
 *     como verificar, e 22 anagramas sem verificação são 22 palpites. Calar aqui
 *     é a resposta certa, e o painel diz por quê.
 *  4. **Teto de duas variantes.** Trocar "a bancada cala" por "a bancada fala
 *     nove vezes" seria meia correção — o espaço do topo é o recurso escasso.
 *
 * ── A NOTA VEM DA EVIDÊNCIA, NÃO É FIXA ────────────────────────────────────
 * Quem passou no portão já provou que forma português. A nota separa o que
 * formou MUITO do que formou o mínimo, e fica abaixo de acerto pré-resolvido em
 * base real, que é evidência de outra natureza.
 */

/** Piso de comprimento: abaixo disto, anagrama forma palavra por acaso. */
const MIN_LETRAS = 20;
/** Faixa de colunas. 12 cobre o scytale de bastão e a caixa de César usuais. */
const MAX_COLUNAS = 12;

/**
 * OS TRÊS LIMIARES, CALIBRADOS CONTRA O VOCABULÁRIO REAL.
 *
 * A primeira versão usava `maior ≥ 5` e `cobertura ≥ 0,40`, números escolhidos
 * a olho e verificados contra um conjunto de teste de 15 palavras. Contra as
 * **451.016** palavras de verdade (pt + en), eles desabam: um anagrama de 55
 * letras quase sempre contém alguma sequência de 5 letras que está na lista.
 *
 * Medido sobre 6 textos claros × 9 embaralhamentos × 11 variantes = **54
 * leituras certas e 540 erradas**:
 *
 * | portão | acerto | falso |
 * |---|---|---|
 * | maior≥5 · cob≥0,40 · sem ganho | 54/54 | **70/540 (13%)** |
 * | maior≥6 · cob≥0,55 · ganho≥0,15 | 54/54 | 3/540 |
 * | **maior≥6 · cob≥0,60 · ganho≥0,20** | **54/54** | **1/540 (0,2%)** |
 * | maior≥7 · cob≥0,60 · ganho≥0,25 | 45/54 | 0/540 |
 *
 * Fica o terceiro. Subir para 7 zeraria o falso e custaria **17% dos acertos** —
 * e o único falso que sobra não lidera, porque a ordenação é por evidência e o
 * teto é de duas variantes.
 *
 * As distribuições, para quem for mexer nestes números depois:
 * a cobertura das CERTAS vai de 0,76 a 0,92; a das ERRADAS, de 0 a 0,67. O corte
 * em 0,60 fica no vão, com folga dos dois lados — de propósito, em vez de
 * colado na fronteira da amostra.
 */
const MIN_MAIOR_PEDACO = 6;
const MIN_COBERTURA = 0.6;
/**
 * E o GANHO sobre a própria entrada, que é o fator que o conjunto pequeno não
 * revelava. A entrada cifrada tem cobertura própria (0,31 no caso medido) porque
 * pedaços dela caem na lista por acaso; exigir que a saída melhore em 0,20
 * elimina a variante que só reembaralha o acaso.
 */
const MIN_GANHO = 0.2;
/** Ver o portão 4. */
const MAX_VARIANTES = 2;

const ID = "transposicao";
const NAME = "Transposição sem chave";

/**
 * Escreve por linhas numa grade de `cols` colunas e lê por colunas.
 *
 * É a operação de CIFRAR do scytale — e serve de decodificação quando o texto
 * chegou cifrado no sentido oposto, por isso as duas direções entram na busca.
 */
function lerPorColunas(s: string, cols: number): string {
  let out = "";
  for (let c = 0; c < cols; c++) for (let i = c; i < s.length; i += cols) out += s[i];
  return out;
}

/**
 * O inverso — e ele NÃO é "ler por colunas com o número de linhas".
 *
 * Esse atalho só vale em grade perfeita. Com `len` não divisível por `cols` as
 * colunas têm alturas diferentes: as `len % cols` primeiras têm uma linha a
 * mais que as outras. Ignorar isso desalinha tudo a partir da primeira coluna
 * curta — medido, o decoder achava o scytale de 3 colunas (57 = 3 × 19, grade
 * perfeita) e falhava em 4, 5, 6, 7 e 8, que é a faixa inteira que importa.
 */
function lerPorLinhas(s: string, cols: number): string {
  const linhas = Math.ceil(s.length / cols);
  const sobra = s.length % cols; // colunas altas; 0 = grade perfeita
  const altura = (c: number) => (sobra === 0 || c < sobra ? linhas : linhas - 1);

  // Fatia o texto nas colunas, respeitando a altura de cada uma.
  const colunas: string[] = [];
  let pos = 0;
  for (let c = 0; c < cols; c++) {
    colunas.push(s.slice(pos, pos + altura(c)));
    pos += altura(c);
  }

  // E lê a grade linha a linha.
  let out = "";
  for (let l = 0; l < linhas; l++)
    for (let c = 0; c < cols; c++) if (l < colunas[c].length) out += colunas[c][l];
  return out;
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "classical",
  decode(input) {
    // Sem vocabulário não há verificação, e sem verificação isto é palpite. Ver
    // o portão 3 do cabeçalho.
    if (!wordsProntas()) return [];

    const letras = input.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (letras.length < MIN_LETRAS) return [];

    /**
     * A entrada é a linha de base, não um portão binário.
     *
     * A versão anterior desistia quando a ENTRADA tinha uma palavra de 5 letras,
     * supondo que isso significasse "já é português". Contra 451 mil palavras
     * isso é quase sempre verdade por acaso — medido, o próprio texto cifrado
     * tinha `maior=5`, e o decoder calava exatamente no caso que existe para
     * resolver. Aqui a entrada vira **referência**: só emite quem a supera.
     */
    const base = coverage(letras);
    const cobBase = base.analisado > 0 ? base.covered / base.analisado : 0;

    // Texto que já está claro não se embaralha: quem passa no portão inteiro
    // sozinho não é cifra, é a resposta.
    if (base.maior >= MIN_MAIOR_PEDACO && cobBase >= MIN_COBERTURA) return [];

    const teto = Math.min(MAX_COLUNAS, Math.floor(letras.length / 2));
    const candidatos: { texto: string; label: string; cobertura: number; maior: number }[] = [];
    const vistos = new Set<string>([letras]);

    for (let cols = 2; cols <= teto; cols++) {
      for (const [texto, label] of [
        [lerPorLinhas(letras, cols), `${cols} colunas · lido por linhas`],
        [lerPorColunas(letras, cols), `${cols} colunas · lido por colunas`],
      ] as const) {
        if (vistos.has(texto)) continue;
        vistos.add(texto);

        const c = coverage(texto);
        if (c.maior < MIN_MAIOR_PEDACO) continue;
        const razao = c.analisado > 0 ? c.covered / c.analisado : 0;
        if (razao < MIN_COBERTURA) continue;
        if (razao - cobBase < MIN_GANHO) continue;

        candidatos.push({ texto, label, cobertura: razao, maior: c.maior });
      }
    }

    // Ordena por EVIDÊNCIA — o maior pedaço primeiro, a cobertura desempata.
    // Nunca por `scorePlaintext`: ele mede frequência de letra, e todo anagrama
    // de português tem a frequência de português. É a razão de o `railfence`
    // liderar hoje com lixo.
    candidatos.sort((a, b) => b.maior - a.maior || b.cobertura - a.cobertura);

    return candidatos.slice(0, MAX_VARIANTES).map<DecodeCandidate>((v) => ({
      decoderId: ID,
      decoderName: NAME,
      category: "classical" as const,
      label: v.label,
      output: v.texto,
      // 0,72 é a nota que o `railfence` tira HOJE nesta mesma entrada, com lixo.
      // Quem passou por este portão provou mais que ele, e tem de aparecer
      // acima — mas abaixo de acerto confirmado em base real (0,85+).
      forcedScore: Math.min(0.82, 0.6 + v.cobertura * 0.25),
      chainValue: v.texto,
    }));
  },
});
