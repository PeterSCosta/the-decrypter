/**
 * ── A TABELA ENTRA SOB DEMANDA, E ISSO NÃO É DETALHE ────────────────────────
 * `quadgramas-pt.ts` tem 161 KB de fonte. Importada estaticamente, ela ia no
 * chunk de entrada de TODO visitante: medido em A/B, +59,5 KB gzip — para um
 * decoder que só se aplica a texto de 100 letras ou mais, ou seja quase nunca.
 *
 * O hábito desta casa é o oposto: ruas (204 KB), eixos (197 KB), vocabulário e
 * a lib do Mapcode são todos preguiçosos. O molde é o `carregarH3` de
 * `location/formats.ts`, e o trato com o fan-out é o mesmo: `decode` é
 * SÍNCRONO, então quando a tabela ainda não chegou o decoder dispara a carga e
 * devolve `[]`; quem observa `aoCarregarQuadgramas` refaz a rodada.
 */
type TabelaModulo = typeof import("./quadgramas-pt");
let MODULO: TabelaModulo | null = null;
let carregando: Promise<void> | null = null;
const ouvintes = new Set<() => void>();

export function quadgramasProntos(): boolean {
  return MODULO !== null;
}

export function carregarQuadgramas(): Promise<void> {
  if (MODULO) return Promise.resolve();
  if (!carregando) {
    carregando = import("./quadgramas-pt")
      .then((m) => {
        MODULO = m;
        for (const cb of ouvintes) cb();
      })
      .catch(() => {
        // Falhar aqui só significa "sem solver de substituição". Zerar o
        // controle deixa a próxima tentativa refazer, em vez de travar a
        // função para sempre — mesma disciplina do `loadOnce` dos datasets.
        carregando = null;
      });
  }
  return carregando;
}

/** Avisa quando a tabela chega, para quem precisa refazer a rodada. */
export function aoCarregarQuadgramas(cb: () => void): () => void {
  ouvintes.add(cb);
  return () => {
    ouvintes.delete(cb);
  };
}
import { stripDiacritics } from "./util";

/**
 * Solver de SUBSTITUIÇÃO MONOALFABÉTICA — subida de encosta com reinício.
 *
 * É a cifra que o fan-out não quebra por força bruta: o espaço de chaves é 26!
 * (≈ 4·10²⁶ alfabetos). Não dá para enumerar; dá para SUBIR. Troca-se um par de
 * letras da chave, mede-se se o texto ficou mais parecido com português, e
 * repete-se enquanto melhorar. O que decide "mais parecido" é a soma das
 * log-probabilidades dos QUADRIGRAMAS (`quadgramas-pt.ts`, gerada por
 * `scripts/build-quadgramas.ts`).
 *
 * ── DETERMINISMO: `Math.random` aqui seria um card piscando ───────────────
 * Este `decode` roda a cada tecla. Com aleatoriedade livre, a mesma entrada
 * daria leituras diferentes a cada rodada e o card mudaria de texto sozinho,
 * inclusive nas rodadas que o React refaz sem o usuário digitar nada. Então o
 * gerador é xorshift32 semeado por um FNV-1a das LETRAS da entrada: mesma
 * entrada, mesma semente, mesma sequência de reinícios, mesma resposta. Nenhum
 * `Math.random`, nenhum `Date.now`.
 *
 * ── ORÇAMENTO: o teto é de trabalho, não de relógio ──────────────────────
 * A tentação é abortar por `performance.now()`, mas isso mata o determinismo:
 * a mesma entrada devolveria respostas diferentes conforme a máquina estivesse
 * ocupada. O teto aqui é o PRODUTO reinícios × letras (`ORCAMENTO_TRABALHO`),
 * que é proporcional ao tempo e não depende do relógio. O número saiu de medir:
 * uma subida custa ~1,5 µs por (reinício · letra), então 16.600 de orçamento
 * dão ~25 ms — metade do teto de 50 ms do enunciado, porque este decoder corre
 * junto de outros ~110.
 *
 * A JANELA existe pelo mesmo motivo: texto colado pode ter 5.000 letras, e o
 * custo é linear nelas. A chave é resolvida nas primeiras `JANELA` letras (onde
 * a precisão já satura: 100% de acerto a partir de ~160) e depois aplicada ao
 * texto inteiro.
 */

const A = 97;
const ALFABETO = 26;
/** Ordem de frequência das letras em pt-BR — o chute inicial da subida. */
const ORDEM_PT = "aeosridmntucplvghqbfzjxkwy";
/** Teto do produto reinícios × letras. Ver o bloco ORÇAMENTO. */
export const ORCAMENTO_TRABALHO = 16_600;
/** Reinícios: nunca menos que isto (texto longo converge fácil)… */
const MIN_REINICIOS = 8;
/** …e nunca mais que isto (texto curto não melhora indefinidamente). */
const MAX_REINICIOS = 200;
/** Letras que entram na subida. O resto do texto é decifrado com a chave achada. */
export const JANELA = 700;

/** Tabela decodificada uma vez só, na primeira entrada que chega até aqui. */
let TABELA: Uint8Array | null = null;

/**
 * Expande o base64 gerado: varint do salto entre índices, depois os pesos em
 * nibble. Devolve o vetor dos 26⁴ índices, com 0 em quem ficou fora da tabela.
 */
export function tabelaQuadgramas(): Uint8Array {
  if (TABELA) return TABELA;
  const bruto = atob(MODULO?.QUADGRAMAS_B64 ?? "");
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);

  // O bloco de pesos tem tamanho conhecido (meio byte por quadrigrama), então
  // o corte entre os dois blocos é aritmética, não adivinhação.
  const inicioPesos = bytes.length - Math.ceil((MODULO?.QUADGRAMAS_N ?? 0) / 2);
  const tabela = new Uint8Array(ALFABETO ** 4);
  let p = 0;
  let anterior = -1;
  for (let i = 0; i < (MODULO?.QUADGRAMAS_N ?? 0); i++) {
    let salto = 0;
    let deslocamento = 0;
    let b = 0;
    do {
      b = bytes[p++];
      salto |= (b & 127) << deslocamento;
      deslocamento += 7;
    } while (b & 128);
    const idx = anterior + 1 + salto;
    anterior = idx;
    const nibble = bytes[inicioPesos + (i >> 1)];
    tabela[idx] = i & 1 ? nibble >> 4 : nibble & 15;
  }
  TABELA = tabela;
  return tabela;
}

/** Só as letras a–z, dobradas (sem acento, minúsculas), como 0..25. */
export function letrasDe(texto: string): Uint8Array {
  const dobrado = stripDiacritics(texto).toLowerCase();
  const out: number[] = [];
  for (let i = 0; i < dobrado.length; i++) {
    const c = dobrado.charCodeAt(i) - A;
    if (c >= 0 && c < ALFABETO) out.push(c);
  }
  return Uint8Array.from(out);
}

/**
 * Índice de coincidência: a chance de duas letras sorteadas do texto serem
 * iguais. Português fica em ~0,075; texto aleatório, em 1/26 ≈ 0,038.
 *
 * Serve aqui porque a substituição monoalfabética **preserva** o IC exatamente
 * (ela só renomeia as letras). É o teste clássico de "isto pode ser uma
 * substituição", e é o que barra Vigenère (medido: 0,047–0,050) e ruído
 * (0,038) antes de gastar 25 ms subindo encosta atrás de nada.
 */
export function indiceCoincidencia(letras: Uint8Array): number {
  const n = letras.length;
  if (n < 2) return 0;
  const f = new Uint32Array(ALFABETO);
  for (const x of letras) f[x]++;
  let soma = 0;
  for (let i = 0; i < ALFABETO; i++) soma += f[i] * (f[i] - 1);
  return soma / (n * (n - 1));
}

/** xorshift32 — o gerador semeado. Ver o bloco DETERMINISMO. */
function gerador(semente: number): () => number {
  let s = semente >>> 0 || 0x9e3779b9;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** FNV-1a das letras: a semente sai da ENTRADA, nunca do relógio. */
function semeadura(letras: Uint8Array): number {
  let h = 0x811c9dc5;
  for (const x of letras) {
    h ^= x + 1;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Soma dos pesos dos quadrigramas do texto decifrado por `chave`. */
function fitness(letras: Uint8Array, chave: Uint8Array, tabela: Uint8Array): number {
  const n = letras.length;
  if (n < 4) return 0;
  let soma = 0;
  let a = chave[letras[0]];
  let b = chave[letras[1]];
  let c = chave[letras[2]];
  for (let i = 3; i < n; i++) {
    const d = chave[letras[i]];
    soma += tabela[((a * ALFABETO + b) * ALFABETO + c) * ALFABETO + d];
    a = b;
    b = c;
    c = d;
  }
  return soma;
}

/** Chute inicial: letra mais frequente do texto ↔ letra mais frequente do pt. */
function chaveInicial(letras: Uint8Array): Uint8Array {
  const conta = new Uint32Array(ALFABETO);
  for (const x of letras) conta[x]++;
  const ordem = [...Array(ALFABETO).keys()].sort((x, y) => conta[y] - conta[x] || x - y);
  const chave = new Uint8Array(ALFABETO);
  for (let i = 0; i < ALFABETO; i++) chave[ordem[i]] = ORDEM_PT.charCodeAt(i) - A;
  return chave;
}

function chaveSorteada(rnd: () => number): Uint8Array {
  const a = [...Array(ALFABETO).keys()];
  for (let i = ALFABETO - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return Uint8Array.from(a);
}

/**
 * A subida: varre os 325 pares de letras, aceita a troca que melhora, repete
 * enquanto uma varredura inteira tiver melhorado alguma coisa.
 */
function subir(letras: Uint8Array, chave: Uint8Array, tabela: Uint8Array): number {
  let melhor = fitness(letras, chave, tabela);
  let melhorou = true;
  while (melhorou) {
    melhorou = false;
    for (let i = 0; i < ALFABETO - 1; i++) {
      for (let j = i + 1; j < ALFABETO; j++) {
        const t = chave[i];
        chave[i] = chave[j];
        chave[j] = t;
        const s = fitness(letras, chave, tabela);
        if (s > melhor) {
          melhor = s;
          melhorou = true;
        } else {
          chave[j] = chave[i];
          chave[i] = t;
        }
      }
    }
  }
  return melhor;
}

export interface Solucao {
  /** chave[letra do texto cifrado] = letra em claro, ambas 0..25. */
  chave: Uint8Array;
  /** Soma dos pesos — só compara chaves do MESMO texto. */
  fitness: number;
  /** Peso médio por quadrigrama: comparável entre textos. Ver o decoder. */
  fitnessPorQuadgrama: number;
  reinicios: number;
  /** Letras que entraram na subida (o texto pode ser maior que a JANELA). */
  letrasUsadas: number;
}

/** Reinícios que cabem no orçamento para um texto deste tamanho. */
export function reiniciosPara(letras: number): number {
  if (letras <= 0) return MIN_REINICIOS;
  const cabe = Math.floor(ORCAMENTO_TRABALHO / letras);
  return Math.min(MAX_REINICIOS, Math.max(MIN_REINICIOS, cabe));
}

/**
 * Memória da última subida.
 *
 * O fan-out roda de novo, com a MESMA entrada, toda vez que uma base preguiçosa
 * chega (ruas, H3, o vocabulário) ou que o React refaz o cálculo. Sem isto,
 * cada uma dessas rodadas repagava os ~25 ms da subida para chegar exatamente
 * ao mesmo resultado — e o determinismo é justamente o que garante que o
 * resultado seja o mesmo, então guardá-lo é seguro por construção.
 *
 * Uma entrada só: quem digita muda o texto a cada tecla, e um cache maior
 * guardaria estados intermediários que ninguém vai rever.
 */
let ULTIMA: { chave: string; solucao: Solucao } | null = null;

/**
 * Resolve a substituição. Determinístico: a mesma `letras` devolve sempre a
 * mesma chave.
 */
export function resolverSubstituicao(letras: Uint8Array): Solucao {
  const memo = String.fromCharCode(...letras.subarray(0, JANELA));
  if (ULTIMA?.chave === memo) return ULTIMA.solucao;
  const tabela = tabelaQuadgramas();
  const janela = letras.length > JANELA ? letras.subarray(0, JANELA) : letras;
  const reinicios = reiniciosPara(janela.length);
  const rnd = gerador(semeadura(janela));

  const chave = chaveInicial(janela);
  let melhorFit = subir(janela, chave, tabela);
  let melhorChave = chave;

  for (let r = 0; r < reinicios; r++) {
    const tentativa = chaveSorteada(rnd);
    const s = subir(janela, tentativa, tabela);
    if (s > melhorFit) {
      melhorFit = s;
      melhorChave = tentativa;
    }
  }

  const solucao: Solucao = {
    chave: melhorChave,
    fitness: melhorFit,
    fitnessPorQuadgrama: melhorFit / Math.max(1, janela.length - 3),
    reinicios,
    letrasUsadas: janela.length,
  };
  ULTIMA = { chave: memo, solucao };
  return solucao;
}

/** Aplica a chave preservando pontuação, espaços e caixa do original. */
export function aplicarChave(texto: string, chave: Uint8Array): string {
  let out = "";
  for (const ch of texto) {
    const minuscula = stripDiacritics(ch).toLowerCase();
    const c = minuscula.charCodeAt(0) - A;
    if (minuscula.length === 1 && c >= 0 && c < ALFABETO) {
      const clara = String.fromCharCode(A + chave[c]);
      out += ch === ch.toUpperCase() && ch !== ch.toLowerCase() ? clara.toUpperCase() : clara;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Só para o rótulo do card: a chave como o alfabeto de substituição, A→?. */
export function chaveEmTexto(chave: Uint8Array): string {
  let out = "";
  for (let i = 0; i < ALFABETO; i++) out += String.fromCharCode(A + chave[i]).toUpperCase();
  return out;
}

/** Maior peso possível por quadrigrama — o denominador da normalização. */
/**
 * Maior peso possível por quadrigrama — o denominador da normalização.
 *
 * Virou FUNÇÃO quando a tabela passou a carregar sob demanda: como `const` no
 * topo do módulo, ela era avaliada no import e congelava o zero de "tabela
 * ainda não chegou", fazendo toda pontuação dividir por zero depois.
 */
export function pesoMaximo(): number {
  return MODULO?.QUADGRAMAS_NIVEIS ?? 0;
}
