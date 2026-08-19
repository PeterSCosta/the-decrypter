import { stripDiacritics } from "./util";

/**
 * CRIPTANÁLISE CLÁSSICA — as ferramentas que dizem QUAL cifra é, e com que
 * chave. Tudo aqui é **puro**: entra string, sai número. Sem rede, sem estado,
 * sem `DecodeContext`.
 *
 * Por que existe: a bancada registrava **27** decoders de categoria
 * `classical` antes deste arquivo — contados no registry, não no grep, que
 * conta 27 OCORRÊNCIAS da string e não bate com o número de decoders (o
 * `a1z26-ciclico` a escreve duas vezes) — e nenhuma ferramenta para escolher
 * entre eles. O analista testava os 27 no olho. E o `vigenere` de
 * `ciphers.ts:57` devolve `null` sem `ctx.key`, ou seja, só serve para quem já
 * sabe a chave. Este arquivo é a estatística que falta; `decoders/vigenere-crack.ts`
 * é quem a usa para descobrir a chave sozinho.
 *
 * ── OS NÚMEROS SÃO MEDIDOS NESTE REPOSITÓRIO, NÃO COPIADOS ────────────────
 * Toda constante abaixo saiu de uma contagem que dá para refazer. Os corpora:
 *
 *   A. `public/data/words-pt.txt`  — 259.220 palavras → 2.414.230 letras
 *   B. `public/data/words-en.txt`  — 204.216 palavras → 1.928.447 letras
 *   C. prosa pt-BR corrida do repo — `docs/*.md` (sem blocos de código, sem
 *      tabela, sem link) + comentários de bloco `/** *\/` em pt-BR do `src/`,
 *      EXCLUINDO `features/help` e `features/reference` → 1.322.882 letras
 *   D. prosa en corrida — parágrafos em inglês dos READMEs de `node_modules`
 *      (146 arquivos, sem blocos de código) → 104.782 letras
 *   E. **teste cego** — prosa pt-BR de `features/help` + `features/reference`,
 *      41.747 letras, deixada de fora de C exatamente para medir generalização
 *
 * ── DESCOBERTA QUE MUDOU O DESENHO: LISTA DE PALAVRAS ≠ TEXTO CORRIDO ─────
 * O primeiro corte tirou o perfil de letras da wordlist (A), que é a fonte
 * óbvia. **Não funciona**, e a diferença não é sutil. Medido:
 *
 *      letra   texto corrido (C)   wordlist (A)   diferença
 *        d           5,65%             2,88%        2,0×
 *        e          12,05%             9,08%
 *        i           6,60%            10,97%        1,7× ao contrário
 *        s           6,48%             4,59%
 *        l           3,00%             4,62%
 *
 * A wordlist conta cada palavra UMA vez ("abacaxi" pesa igual a "de"), então
 * ela mede o vocabulário, não a língua. Texto corrido é dominado por
 * "de/que/para/não", que é onde moram o `d` e o `e`.
 *
 * O efeito na quebra de Vigenère, medido ponta a ponta no corpus cego (E),
 * chave de 3 a 8 letras, comprimento não informado:
 *
 *      letras do texto     perfil da wordlist (A)   perfil de texto corrido (C)
 *          150                     não passa de ~94%          100%
 *          600                            ~60%                100%
 *          900                            ~70%                100%
 *
 * Por isso o `PERFIL_PT` abaixo vem de C, não de A. A wordlist continua sendo
 * a fonte do **IC** (ver adiante) — nisso ela é fiel.
 *
 * ── ÍNDICE DE COINCIDÊNCIA: A LISTA ACERTA, O PERFIL NÃO ──────────────────
 * O IC é a probabilidade de duas letras sorteadas do texto serem iguais:
 * `Σ nᵢ(nᵢ−1) / N(N−1)`. Ele depende só de quão desigual é a distribuição, e
 * isso a wordlist reproduz bem. Medido nas cinco fontes:
 *
 *      wordlist pt (A)                    0,07556
 *      docs/ + comentários pt (C)         0,07303
 *      teste cego pt (E)                  0,07689
 *      comentários pt do src/ sozinhos    0,07690
 *      docs/ sozinho                      0,07256
 *      wordlist en (B)                    0,06277
 *      READMEs en corridos (D)            0,06555
 *      200.000 letras uniformes           0,03846
 *
 * Ou seja: o IC do português vive em **0,073–0,077** por qualquer caminho que
 * se meça, o do inglês em **0,063–0,066**, e o aleatório crava 1/26 = 0,03846
 * (o valor teórico — a medição bateu no quinto decimal). Adotei o valor do
 * corpus C para o português e do D para o inglês, porque é texto corrido que
 * o analista vai colar, e porque são os mesmos corpora dos perfis.
 *
 * ── O IC DECAI COM O COMPRIMENTO DA CHAVE ────────────────────────────────
 * É isto que torna o IC uma ferramenta e não uma curiosidade. Cifrando o corpus
 * C com chaves de tamanho L e medindo o IC do resultado:
 *
 *      L =  1 → 0,07623      L =  6 → 0,04167
 *      L =  2 → 0,05222      L =  8 → 0,04040
 *      L =  3 → 0,04845      L = 10 → 0,03989
 *      L =  4 → 0,04524      L = 12 → 0,03952
 *      L =  5 → 0,04313      L = 16 → 0,03894
 *
 * Chave longa embaralha até virar ruído. Mas se você fatia o texto em L colunas
 * (letra 0, L, 2L… numa; 1, L+1… noutra), cada coluna sofreu UM César só — e o
 * IC dela volta a ~0,073. É o `icPorColuna`, e é o melhor detector de
 * comprimento que existe aqui: medido, o comprimento certo (ou um múltiplo)
 * aparece no top-3 em 100% dos casos a partir de 60 letras.
 */

/** Alfabeto de trabalho. Tudo aqui é a–z minúsculo, sem acento. */
const ALFABETO_N = 26;

/** IC do português. Medido: 0,07303 no corpus C; 0,073–0,077 nas cinco fontes. */
export const IC_PORTUGUES = 0.073;
/** IC do inglês. Medido: 0,06555 no corpus D; 0,06277 na wordlist. */
export const IC_INGLES = 0.0656;
/** IC de letra aleatória uniforme: 1/26. Medido em 200 mil sorteios: 0,03846. */
export const IC_ALEATORIO = 1 / ALFABETO_N;

export type Idioma = "pt" | "en";

/**
 * Frequência de letra do PORTUGUÊS em texto corrido (%), corpus C —
 * 1.322.882 letras. Não é a da wordlist; ver o bloco "lista ≠ corrido".
 */
export const PERFIL_PT: readonly number[] = [
  13.09, 1.42, 4.71, 5.65, 12.05, 1.47, 1.37, 1.06, 6.6, 0.26, 0.26, 3.0, 4.53, 4.85, 10.66, 2.98,
  0.87, 6.93, 6.48, 5.28, 3.4, 1.51, 0.18, 0.69, 0.23, 0.47,
].map((p) => p / 100);

/** Frequência de letra do INGLÊS em texto corrido (%), corpus D — 104.782 letras. */
export const PERFIL_EN: readonly number[] = [
  7.39, 1.58, 3.51, 3.5, 12.56, 2.26, 1.77, 4.11, 7.41, 0.36, 0.58, 4.3, 2.33, 7.06, 7.55, 2.67,
  0.11, 6.38, 7.09, 9.47, 3.21, 1.07, 1.59, 0.38, 1.66, 0.08,
].map((p) => p / 100);

const PERFIS: Record<Idioma, readonly number[]> = { pt: PERFIL_PT, en: PERFIL_EN };

/**
 * Os 40 bigramas e trigramas mais frequentes de cada idioma, em % das
 * ocorrências, medidos nos corpora C e D. Servem ao qui-quadrado reduzido
 * (`quiQuadradoNgramas`): 40 células observadas + uma célula "outros".
 *
 * Por que só 40, e não a tabela inteira: com 1,3 milhão de letras, 39% das
 * 17.576 casas de trigrama nunca aparecem (medido: 10.775 vistas). Qui-quadrado
 * com esperado zero não é qui-quadrado. Os 40 primeiros cobrem 44,5% dos
 * bigramas e 12,7% dos trigramas do português — sinal de sobra, e cada célula
 * com contagem alta o bastante para o teste valer.
 *
 * Nota: os corpora são medidos SEM espaços (como o texto que chega aqui), então
 * "ode" e "oco" aparecem porque atravessam a fronteira de palavra ("…o de…").
 * Isso é proposital: é exatamente o que se observa numa cifra sem espaços.
 */
// O "ha": 0.693 do inglês é frequência medida, não Math.LN2 (0,6931…). A regra
// noApproximativeNumericConstant não tem como saber, e trocar por Math.LN2 —
// que é o que ela sugere — corromperia a tabela.
// biome-ignore format: tabela — uma linha por idioma/ordem lê melhor compacta.
const TOP_BI: Record<Idioma, readonly (readonly [string, number])[]> = {
  pt: [["de",2.135],["ra",1.726],["co",1.598],["ad",1.590],["es",1.565],["ar",1.491],["en",1.385],["ca",1.370],["te",1.352],["do",1.341],["re",1.323],["or",1.267],["os",1.200],["er",1.190],["as",1.184],["em",1.119],["ao",1.107],["od",1.086],["ta",1.083],["nt",1.070],["se",1.051],["ma",0.998],["da",0.986],["on",0.946],["me",0.929],["al",0.920],["om",0.913],["an",0.887],["na",0.883],["st",0.882],["ec",0.882],["ac",0.869],["in",0.846],["to",0.840],["qu",0.828],["ro",0.818],["am",0.747],["tr",0.745],["oe",0.695],["is",0.678]],
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: 0.693 em "ha" é frequência medida, não Math.LN2.
  en: [["th",2.758],["he",1.998],["in",1.961],["er",1.649],["re",1.630],["es",1.546],["on",1.407],["an",1.292],["st",1.285],["or",1.231],["en",1.213],["ti",1.152],["nt",1.150],["at",1.097],["se",1.058],["et",1.053],["ed",1.030],["te",0.955],["to",0.943],["ng",0.919],["is",0.912],["it",0.896],["nd",0.863],["de",0.856],["al",0.851],["ec",0.830],["ou",0.813],["ea",0.789],["le",0.782],["ar",0.778],["as",0.757],["sa",0.735],["ro",0.722],["si",0.716],["io",0.708],["ha",0.693],["co",0.654],["so",0.651],["ri",0.651],["ll",0.649]],
};
// biome-ignore format: idem.
const TOP_TRI: Record<Idioma, readonly (readonly [string, number])[]> = {
  pt: [["ent",0.568],["ado",0.543],["com",0.540],["ode",0.530],["que",0.511],["ade",0.480],["ara",0.412],["nte",0.396],["par",0.387],["ada",0.363],["tra",0.344],["ica",0.342],["con",0.337],["men",0.331],["nao",0.330],["por",0.311],["oco",0.301],["aca",0.301],["eco",0.297],["cao",0.296],["est",0.296],["res",0.286],["ame",0.272],["dec",0.260],["sta",0.258],["aco",0.256],["rad",0.248],["ase",0.247],["tes",0.240],["des",0.235],["sde",0.229],["are",0.225],["ede",0.225],["cad",0.224],["sco",0.224],["ont",0.224],["dos",0.217],["ere",0.211],["sem",0.209],["ste",0.208]],
  en: [["the",1.682],["ing",0.807],["ion",0.655],["and",0.556],["tio",0.511],["ent",0.465],["for",0.428],["eth",0.412],["tha",0.387],["sth",0.368],["you",0.343],["thi",0.320],["ith",0.306],["est",0.305],["ons",0.293],["all",0.293],["ati",0.291],["ere",0.291],["hat",0.285],["ver",0.282],["his",0.274],["nth",0.274],["are",0.272],["use",0.271],["ect",0.268],["wit",0.267],["int",0.264],["her",0.262],["ers",0.262],["res",0.246],["ont",0.243],["our",0.241],["con",0.239],["ate",0.237],["pro",0.236],["str",0.233],["sin",0.231],["ort",0.220],["fth",0.218],["rea",0.217]],
};

/**
 * Log-probabilidade condicional de bigrama, `ln P(b|a)`, uma casa por par —
 * 26×26 = 676, na ordem `a*26+b`. Medida nos corpora C (pt) e D (en) com
 * suavização add-1.
 *
 * Empacotada em texto porque 676 números por idioma em decimal seriam ~4 KB de
 * fonte ilegível. Cada caractere é um nível do alfabeto seguro abaixo; a faixa
 * é [−13, 0] nats em 89 degraus, o que dá passo 0,148 e **erro máximo de
 * quantização de 0,0738 nat** (medido contra a tabela em float). A faixa real
 * observada foi [−9,35; −0,05] no pt e [−9,20; −0,28] no en, então nada é
 * cortado nas pontas. Refeita a medição com a tabela quantizada, a taxa de
 * acerto da quebra não mudou em nenhuma célula.
 */
const ALFA_Q =
  "!#%&()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~";
const Q_LOG_MIN = -13;
const Q_PASSO = (0 - Q_LOG_MIN) / (ALFA_Q.length - 1);

const BI_PACK: Record<Idioma, string> = {
  pt: "felphbcUhUSlklmh]onjdePVSYs_cdp__Sq[Rlb[jdSpd[kVUPkRvTZZkSKjnC]dWYwWIgXffNFMG?r]XZwXOIoLJVTVtVJa[VeRMMFEjalihcfVgXTinohganpibcQfMWrW_aokUWtUKi^WrZNngcdQRTNJq^_arY]^qQHbccmbRqdZoUVRO_wRW_oUOQlMORYXt[SbZbnPMISmn^nmafgKVQIfkpkeWiomViCeCcxQVUrXEE_QNQUXlkPPnLpNEJEEhpfit_XqjU^^hcdgValfbaV]WJrZdfq[^irLQbb_paaZhjgfIHUItgghs_YXkUU_caon[_hbg^WNGQrSmnkbfkhQYUSXnVTQhthbLOORiekolda[dXUgmnejbpogfcXUKVtUb_pTUYjOQk[]t_MqdddOKWSHNIQWPMFFSDLRRLKJKcVM~INI==uZhhs[^QnPTZgbpbegeid_MLTLmclkrcX]lTWafcoj__lpe^SOQNsV]ZuYN[nLHV[TrYOqd[iRQQSNndajr[ZImSKkrl]cSmliWZGX@]tVWWwVSMrEHRYSsXJcZUONLM>Ew_^ZpbYklXOWbkpfRhh^YTaUOQt]eckbPRrPR[d^pkT[^rVTRc^Ngegflb^[aQUhckjm_dhxUX_XQYtbfkt^WZqUYaddifa_fcc]VRNT",
  en: "RgkfM_eVfV[ohrRiMooqceXTcKm[[UuNJNgmJpYJlYJmf[oNQJlJqNaLqNDpiOigRIsVIhbqhONDVDmfeftfX^pVNcaancLejmi[gIaDkalmfga[g[PggnffZppm^dcd^EnTaXlhOVqXTbV[t[LlcpmS]GiGlae^sdaiqWUgbekbNhkniYgIZPrT]VyWTUpHMV[YlTHc^i[RXCXCcdifgidGSO]lhunb?cppTcKXI]nSSSwSSS[SSSSSkSSSxSiSSSSSpccPweX[qPU[XejUPcniaUfPZPkdbhr_WXqNTqX[l_Haijk^^JlHsiZZuYOSoULbebooGWgfcY]GXLl_lplbpXiTXa^am^G[nrc__MaDcfck^kYV_Tbgjseh?rfkodhVRDpSW[sYRXkFFn[QnlFqdnhNRFYF[[[[a[[a[[[d[[[[[i[[|[[[[[n]hcua_WoN[afgo^Hgklc^aEf@oagaqdSenPVaccnhIalrhYfPbDk]e[n^SvpPOa[[n_EiiifVe>g>dbiek_eTeJPokoTiErqoWP_LEEsTQQzYTLqLLVTTcLLTYYQLQLTLpUVWnUXsvJQZVflSJijbYNSJVJr_lZocSZmSXdgZbrSXarXXXSkSlefffe[bkTTdfhuoIekmc^gIYNp]]]y]]]o]]h]]]]]]c]]]]]c]",
};

function desempacotar(pack: string): Float64Array {
  const lp = new Float64Array(ALFABETO_N * ALFABETO_N);
  for (let i = 0; i < lp.length; i++) lp[i] = Q_LOG_MIN + ALFA_Q.indexOf(pack[i]) * Q_PASSO;
  return lp;
}
const BIGRAMAS: Record<Idioma, Float64Array> = {
  pt: desempacotar(BI_PACK.pt),
  en: desempacotar(BI_PACK.en),
};

// ─────────────────────────────────────────────────────────────────────────────
// Básico
// ─────────────────────────────────────────────────────────────────────────────

/** Só as letras a–z, minúsculas, acento dobrado. É a forma que tudo aqui consome. */
export function soLetras(texto: string): string {
  return stripDiacritics(texto)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** Converte para códigos 0..25. Espera a saída de `soLetras`. */
function paraCodigos(letras: string): Int8Array {
  const a = new Int8Array(letras.length);
  for (let i = 0; i < letras.length; i++) a[i] = letras.charCodeAt(i) - 97;
  return a;
}

function paraTexto(codigos: ArrayLike<number>): string {
  let s = "";
  for (let i = 0; i < codigos.length; i++) s += String.fromCharCode(97 + codigos[i]);
  return s;
}

/** Contagem das 26 letras. */
export function contagemDeLetras(texto: string): number[] {
  const c = new Array<number>(ALFABETO_N).fill(0);
  for (const ch of soLetras(texto)) c[ch.charCodeAt(0) - 97]++;
  return c;
}

/**
 * ÍNDICE DE COINCIDÊNCIA — `Σ nᵢ(nᵢ−1) / N(N−1)`.
 *
 * Probabilidade de duas letras sorteadas sem reposição saírem iguais.
 * Referências medidas neste repo (ver cabeçalho): português 0,073–0,077,
 * inglês 0,063–0,066, aleatório 0,03846. Menos de 2 letras devolve 0 — não há
 * par para sortear.
 */
export function indiceCoincidencia(texto: string): number {
  const c = contagemDeLetras(texto);
  let n = 0;
  for (const k of c) n += k;
  if (n < 2) return 0;
  let soma = 0;
  for (const k of c) soma += k * (k - 1);
  return soma / (n * (n - 1));
}

function icDeCodigos(cod: Int8Array, inicio: number, passo: number): number {
  const c = new Array<number>(ALFABETO_N).fill(0);
  let n = 0;
  for (let i = inicio; i < cod.length; i += passo) {
    c[cod[i]]++;
    n++;
  }
  if (n < 2) return 0;
  let soma = 0;
  for (const k of c) soma += k * (k - 1);
  return soma / (n * (n - 1));
}

/**
 * IC MÉDIO DAS COLUNAS para um comprimento de chave candidato.
 *
 * Fatia o texto em `comprimento` colunas (letra i vai para a coluna i mod L).
 * Se L é o comprimento certo, cada coluna sofreu um César só e o IC dela volta
 * ao do idioma; se é errado, fica perto do aleatório. É o desempate que o
 * Kasiski sozinho não dá.
 */
export function icPorColuna(texto: string, comprimento: number): number {
  if (comprimento < 1) return 0;
  const cod = paraCodigos(soLetras(texto));
  let soma = 0;
  let usadas = 0;
  for (let c = 0; c < comprimento; c++) {
    // Coluna com menos de 2 letras não tem par para sortear: não entra na média
    // em vez de entrar como zero, que puxaria o IC para baixo sem informação.
    if (Math.ceil((cod.length - c) / comprimento) < 2) continue;
    soma += icDeCodigos(cod, c, comprimento);
    usadas++;
  }
  return usadas > 0 ? soma / usadas : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kasiski
// ─────────────────────────────────────────────────────────────────────────────

export interface RepeticaoKasiski {
  /** O n-grama que se repetiu. */
  ngrama: string;
  /** Posições (em letras) onde ele aparece. */
  posicoes: number[];
  /** Distâncias entre aparições consecutivas. */
  distancias: number[];
}

export interface ResultadoKasiski {
  repeticoes: RepeticaoKasiski[];
  /** Quantas distâncias entraram na votação. Zero = o teste não disse nada. */
  totalDistancias: number;
  /** Votos por comprimento: quantas distâncias são divisíveis por ele. */
  votos: { comprimento: number; votos: number }[];
}

/**
 * TESTE DE KASISKI — distâncias entre repetições de n-gramas, e os divisores
 * mais votados.
 *
 * A ideia de 1863: um trecho repetido do texto claro que calhe de cair na mesma
 * fase da chave produz o MESMO trecho cifrado. A distância entre as duas
 * aparições é então múltiplo do comprimento da chave. Fatorando muitas
 * distâncias, o comprimento verdadeiro acumula votos.
 *
 * Fica claro o que ele NÃO faz: em texto curto quase não há repetição, e as que
 * há são coincidência. Por isso aqui ele entra só como **desempate** do
 * `icPorColuna`, com peso pequeno — medido, o IC por coluna sozinho já põe o
 * comprimento certo (ou um múltiplo dele) no top-3 em 100% dos casos a partir
 * de 60 letras, enquanto o Kasiski em 60 letras costuma ter zero distância.
 */
export function kasiski(
  texto: string,
  opcoes: { ngrama?: number; maxComprimento?: number } = {},
): ResultadoKasiski {
  const ngrama = opcoes.ngrama ?? 3;
  const maxComprimento = opcoes.maxComprimento ?? 16;
  const letras = soLetras(texto);
  const posPorGrama = new Map<string, number[]>();
  for (let i = 0; i + ngrama <= letras.length; i++) {
    const g = letras.slice(i, i + ngrama);
    const lista = posPorGrama.get(g);
    if (lista) lista.push(i);
    else posPorGrama.set(g, [i]);
  }

  const repeticoes: RepeticaoKasiski[] = [];
  const contagem = new Array<number>(maxComprimento + 1).fill(0);
  let totalDistancias = 0;
  for (const [g, posicoes] of posPorGrama) {
    if (posicoes.length < 2) continue;
    const distancias: number[] = [];
    for (let i = 1; i < posicoes.length; i++) {
      const d = posicoes[i] - posicoes[i - 1];
      if (d < 2) continue;
      distancias.push(d);
      totalDistancias++;
      for (let f = 2; f <= maxComprimento; f++) if (d % f === 0) contagem[f]++;
    }
    if (distancias.length > 0) repeticoes.push({ ngrama: g, posicoes, distancias });
  }
  repeticoes.sort((a, b) => b.posicoes.length - a.posicoes.length);

  const votos: { comprimento: number; votos: number }[] = [];
  for (let f = 2; f <= maxComprimento; f++) votos.push({ comprimento: f, votos: contagem[f] });
  votos.sort((a, b) => b.votos - a.votos || a.comprimento - b.comprimento);
  return { repeticoes, totalDistancias, votos };
}

// ─────────────────────────────────────────────────────────────────────────────
// Frequência e qui-quadrado
// ─────────────────────────────────────────────────────────────────────────────

export interface Ngrama {
  gram: string;
  contagem: number;
  /** % das ocorrências deste tamanho de n-grama no texto. */
  pct: number;
}

/** Frequência de n-gramas (n = 1 letra, 2 bigrama, 3 trigrama), do mais comum ao menos. */
export function frequencias(texto: string, n: 1 | 2 | 3 = 1, limite = 40): Ngrama[] {
  const letras = soLetras(texto);
  const total = letras.length - n + 1;
  if (total <= 0) return [];
  const m = new Map<string, number>();
  for (let i = 0; i + n <= letras.length; i++) {
    const g = letras.slice(i, i + n);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limite)
    .map(([gram, contagem]) => ({ gram, contagem, pct: (100 * contagem) / total }));
}

/**
 * Esperado mínimo por célula para o qui-quadrado valer. É a regra clássica de
 * Cochran, e aqui ela não é formalidade: a primeira versão comparava χ²/N sem
 * agrupar, e **errava o idioma** em texto curto porque a tabela mais concentrada
 * (a do inglês, cujo "the" sozinho vale 1,68%) acumula mais χ² que a mais
 * espalhada quando o esperado é fração de unidade. Célula com esperado < 5 vai
 * para o balde "outros".
 */
const MIN_ESPERADO = 5;

export interface ResultadoQui {
  /**
   * χ² REDUZIDO: χ² dividido pelos graus de liberdade. Vale ~1 quando o texto
   * é do idioma, cresce quando não é. É esta normalização — e não χ²/N — que
   * permite comparar duas tabelas de formatos diferentes.
   */
  qui: number;
  /** Células que sobreviveram ao agrupamento. Com menos de 2, o teste não diz nada. */
  celulas: number;
}

const QUI_INDEFINIDO: ResultadoQui = { qui: Number.POSITIVE_INFINITY, celulas: 0 };

function reduzir(x: number, celulas: number): ResultadoQui {
  return celulas > 1 ? { qui: x / (celulas - 1), celulas } : QUI_INDEFINIDO;
}

/**
 * QUI-QUADRADO REDUZIDO das 26 letras contra o perfil de um idioma.
 *
 * Quanto MENOR, mais parece o idioma. Valores medidos em 400 letras:
 *
 *      texto no idioma certo        1,31 (pt)   1,44 (en)
 *      texto no idioma errado       5,59        5,40
 *      Vigenère de chave 8         20,75
 *      letra uniforme aleatória    40,42
 *
 * Acerto na escolha entre pt e en, corpus cego: 96% com 100 letras, 100% de
 * 200 em diante.
 */
export function quiQuadradoLetras(texto: string, idioma: Idioma): ResultadoQui {
  const obs = contagemDeLetras(texto);
  let n = 0;
  for (const k of obs) n += k;
  if (n === 0) return QUI_INDEFINIDO;
  const perfil = PERFIS[idioma];
  let x = 0;
  let celulas = 0;
  let obsFora = 0;
  let espFora = 0;
  for (let i = 0; i < ALFABETO_N; i++) {
    const esperado = n * perfil[i];
    if (esperado >= MIN_ESPERADO) {
      x += (obs[i] - esperado) ** 2 / esperado;
      celulas++;
    } else {
      obsFora += obs[i];
      espFora += esperado;
    }
  }
  if (espFora > 0) {
    x += (obsFora - espFora) ** 2 / espFora;
    celulas++;
  }
  return reduzir(x, celulas);
}

/**
 * QUI-QUADRADO REDUZIDO de bigrama ou trigrama contra os 40 n-gramas mais
 * frequentes do idioma, mais o balde "outros" e o agrupamento de Cochran.
 *
 * Precisa de MUITO mais texto que o teste por letra, e isto é medido, não
 * temido — acerto na escolha entre pt e en, corpus cego:
 *
 *      letras     100    200    400    800   1600   3200
 *      bigrama     —     50%    99%   100%   100%   100%
 *      trigrama    —      —     50%    50%    98%   100%
 *
 * O travessão é `celulas < 2`: com pouco texto TODA célula tem esperado abaixo
 * de 5, tudo cai no balde e o teste não tem grau de liberdade. Nesse caso vem
 * `celulas: 0` e `qui: Infinity` — **não** um número que parece resposta. Quem
 * precisa de idioma em texto curto usa `quiQuadradoLetras`, que resolve com 100.
 */
export function quiQuadradoNgramas(texto: string, n: 2 | 3, idioma: Idioma): ResultadoQui {
  const letras = soLetras(texto);
  const total = letras.length - n + 1;
  if (total <= 0) return QUI_INDEFINIDO;
  const tabela = n === 2 ? TOP_BI[idioma] : TOP_TRI[idioma];
  const obs = new Map<string, number>();
  for (const [g] of tabela) obs.set(g, 0);
  for (let i = 0; i + n <= letras.length; i++) {
    const c = obs.get(letras.slice(i, i + n));
    if (c !== undefined) obs.set(letras.slice(i, i + n), c + 1);
  }
  let x = 0;
  let celulas = 0;
  let obsFora = total;
  let espFora = total;
  for (const [g, pct] of tabela) {
    const esperado = (total * pct) / 100;
    const observado = obs.get(g) ?? 0;
    if (esperado >= MIN_ESPERADO) {
      x += (observado - esperado) ** 2 / esperado;
      celulas++;
      obsFora -= observado;
      espFora -= esperado;
    }
  }
  if (espFora > 0) {
    x += (obsFora - espFora) ** 2 / espFora;
    celulas++;
  }
  return reduzir(x, celulas);
}

/** Log-probabilidade média por bigrama, `ln P(b|a)`. Quanto MAIOR, mais parece o idioma. */
export function verossimilhancaBigrama(texto: string, idioma: Idioma): number {
  const cod = paraCodigos(soLetras(texto));
  return verossimilhancaCod(cod, BIGRAMAS[idioma]);
}

function verossimilhancaCod(cod: Int8Array, lp: Float64Array): number {
  if (cod.length < 2) return Number.NEGATIVE_INFINITY;
  let s = 0;
  for (let i = 0; i + 1 < cod.length; i++) s += lp[cod[i] * ALFABETO_N + cod[i + 1]];
  return s / (cod.length - 1);
}

export interface RetratoDoTexto {
  letras: number;
  ic: number;
  /** Quão perto do IC do português: 0 = aleatório, 1 = português corrido. */
  encaixeIc: number;
  letra: Ngrama[];
  bigrama: Ngrama[];
  trigrama: Ngrama[];
  qui: {
    letras: Record<Idioma, ResultadoQui>;
    bigramas: Record<Idioma, ResultadoQui>;
    trigramas: Record<Idioma, ResultadoQui>;
  };
  bigramaLogProb: Record<Idioma, number>;
  /** Idioma que o qui-quadrado por letra reconhece; `null` quando nenhum encaixa. */
  idioma: Idioma | null;
}

/**
 * Mínimo de letras para AFIRMAR um idioma, e o corte do χ² reduzido. Os dois
 * medidos na distribuição do melhor dos dois idiomas (300 amostras por ponto):
 *
 *      letras   texto real p95   Vigenère p05   aleatório p05
 *         60         2,18            0,58           1,60   ← sem separação
 *        100         1,98            2,36           4,40
 *        150         2,04            3,65           7,63   ← o corte 3,0 cabe
 *        400         2,29           14,21          31,68
 *
 * Em 60 letras o texto cifrado às vezes casa com o perfil melhor que o texto
 * real — não há corte que separe, então nem se tenta. Em 150 o vão entre 2,04 e
 * 3,65 é largo e 3,0 fica no meio dele.
 */
const MIN_LETRAS_IDIOMA = 150;
const CORTE_IDIOMA = 3.0;

/**
 * Retrato estatístico de um texto: IC, frequências e qui-quadrado contra os dois
 * idiomas. É a resposta a "que cifra é esta?" que a bancada não tinha:
 *
 *   • `encaixeIc` perto de 1 **e** `idioma` preenchido → texto em claro;
 *   • `encaixeIc` perto de 1 **e** `idioma` nulo → substituição mono-alfabética
 *     (César, Atbash, disco, substituição livre): embaralhar o alfabeto não mexe
 *     no IC, só no perfil;
 *   • `encaixeIc` perto de 0 → poli-alfabética (Vigenère, Beaufort, Porta,
 *     autokey), transposição sobre texto já cifrado, ou não é texto nenhum.
 */
export function retratoDoTexto(texto: string): RetratoDoTexto {
  const letras = soLetras(texto);
  const qui = {
    letras: { pt: quiQuadradoLetras(letras, "pt"), en: quiQuadradoLetras(letras, "en") },
    bigramas: { pt: quiQuadradoNgramas(letras, 2, "pt"), en: quiQuadradoNgramas(letras, 2, "en") },
    trigramas: { pt: quiQuadradoNgramas(letras, 3, "pt"), en: quiQuadradoNgramas(letras, 3, "en") },
  };
  const melhor: Idioma = qui.letras.pt.qui <= qui.letras.en.qui ? "pt" : "en";
  const ic = indiceCoincidencia(letras);
  return {
    letras: letras.length,
    ic,
    encaixeIc: (ic - IC_ALEATORIO) / (IC_PORTUGUES - IC_ALEATORIO),
    letra: frequencias(letras, 1, 26),
    bigrama: frequencias(letras, 2, 20),
    trigrama: frequencias(letras, 3, 20),
    qui,
    bigramaLogProb: {
      pt: verossimilhancaBigrama(letras, "pt"),
      en: verossimilhancaBigrama(letras, "en"),
    },
    idioma:
      letras.length >= MIN_LETRAS_IDIOMA && qui.letras[melhor].qui <= CORTE_IDIOMA ? melhor : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Vigenère sem chave
// ─────────────────────────────────────────────────────────────────────────────

/** Decifra preservando maiúsculas, acentos dobrados e tudo que não é letra. */
export function decifrarVigenere(texto: string, chave: string): string {
  const k = soLetras(chave);
  if (k.length === 0) return texto;
  const base = stripDiacritics(texto);
  let out = "";
  let ki = 0;
  for (const ch of base) {
    const c = ch.charCodeAt(0);
    const maiuscula = c >= 65 && c <= 90;
    const minuscula = c >= 97 && c <= 122;
    if (maiuscula || minuscula) {
      const orig = c - (maiuscula ? 65 : 97);
      const d = (orig - (k.charCodeAt(ki % k.length) - 97) + ALFABETO_N) % ALFABETO_N;
      out += String.fromCharCode(d + (maiuscula ? 65 : 97));
      ki++;
    } else out += ch;
  }
  return out;
}

function decifrarCod(cod: Int8Array, chave: number[]): Int8Array {
  const o = new Int8Array(cod.length);
  for (let i = 0; i < cod.length; i++)
    o[i] = (cod[i] - chave[i % chave.length] + ALFABETO_N) % ALFABETO_N;
  return o;
}

/** Qui-quadrado de UMA coluna deslocada por `desloc`, contra o perfil do idioma. */
function quiColuna(
  cod: Int8Array,
  L: number,
  coluna: number,
  desloc: number,
  perfil: readonly number[],
): number {
  const obs = new Array<number>(ALFABETO_N).fill(0);
  let n = 0;
  for (let i = coluna; i < cod.length; i += L) {
    obs[(cod[i] - desloc + ALFABETO_N) % ALFABETO_N]++;
    n++;
  }
  if (n === 0) return Number.POSITIVE_INFINITY;
  let x = 0;
  for (let i = 0; i < ALFABETO_N; i++) {
    const esperado = n * perfil[i];
    if (esperado > 0) x += (obs[i] - esperado) ** 2 / esperado;
  }
  return x;
}

/** Semente da chave: a letra de cada coluna que minimiza o qui-quadrado. */
function chavePorQuiQuadrado(cod: Int8Array, L: number, perfil: readonly number[]): number[] {
  const chave: number[] = [];
  for (let c = 0; c < L; c++) {
    let melhor = 0;
    let menor = Number.POSITIVE_INFINITY;
    for (let d = 0; d < ALFABETO_N; d++) {
      const x = quiColuna(cod, L, c, d, perfil);
      if (x < menor) {
        menor = x;
        melhor = d;
      }
    }
    chave.push(melhor);
  }
  return chave;
}

/** Máximo de voltas da subida de encosta. Medido: converge em 2–3; 8 é folga. */
const MAX_VOLTAS = 8;

/**
 * SUBIDA DE ENCOSTA sobre a semente do qui-quadrado: troca uma letra da chave
 * por vez e fica com a que mais sobe a verossimilhança de bigrama.
 *
 * É a peça que faz a coisa funcionar em texto curto, e a medição é gritante.
 * Acerto exato da chave com o comprimento certo dado, corpus cego (E):
 *
 *      letras   só qui-quadrado → com subida de encosta
 *        40      L=5  24% → 84%      L=8   0% → 24%
 *        60      L=5  60% →100%      L=8   5% → 69%
 *        100     L=5  84% →100%      L=8  35% → 99%
 *        150     L=5  96% →100%      L=8  73% →100%
 *
 * Motivo: o qui-quadrado julga cada coluna ISOLADA, com N/L letras só. O
 * bigrama julga o texto inteiro, então uma letra errada da chave estraga
 * visivelmente as N/L junções que ela toca — e é essa a evidência que falta.
 *
 * Por que bigrama e não trigrama: medido, o trigrama ganha abaixo do piso
 * (60 letras: 88% → 96%) e empata acima dele (80 letras em diante, 99–100% nos
 * dois). Custaria uma tabela de 17.576 casas contra as 676 do bigrama, para
 * melhorar só onde este decoder não abre a boca. Não compensa.
 */
function subirEncosta(
  cod: Int8Array,
  semente: number[],
  lp: Float64Array,
): { chave: number[]; nota: number } {
  const chave = [...semente];
  let melhorNota = verossimilhancaCod(decifrarCod(cod, chave), lp);
  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    let mudou = false;
    for (let c = 0; c < chave.length; c++) {
      const atual = chave[c];
      let melhorLetra = atual;
      let nota = melhorNota;
      for (let v = 0; v < ALFABETO_N; v++) {
        if (v === atual) continue;
        chave[c] = v;
        const s = verossimilhancaCod(decifrarCod(cod, chave), lp);
        if (s > nota) {
          nota = s;
          melhorLetra = v;
        }
      }
      chave[c] = melhorLetra;
      if (melhorLetra !== atual) {
        melhorNota = nota;
        mudou = true;
      }
    }
    if (!mudou) break;
  }
  return { chave, nota: melhorNota };
}

/**
 * "abcabc" → "abc". Uma chave repetida decifra igualzinho à sua raiz, e é o que
 * torna inofensivo errar o comprimento **para mais**: testar L=6 quando a chave
 * é "sol" devolve "solsol", que colapsa em "sol". Sem isto, o rótulo mentiria o
 * comprimento mesmo com o texto certo.
 */
export function colapsarChave(chave: string): string {
  for (let p = 1; p <= chave.length / 2; p++) {
    if (chave.length % p !== 0) continue;
    let periodica = true;
    for (let i = p; i < chave.length && periodica; i++)
      if (chave[i] !== chave[i % p]) periodica = false;
    if (periodica) return chave.slice(0, p);
  }
  return chave;
}

export interface ChaveCandidata {
  /** A chave, já colapsada. Esta é a resposta que interessa. */
  chave: string;
  /** Comprimento testado antes de colapsar (pode ser múltiplo de `chave.length`). */
  comprimentoTestado: number;
  idioma: Idioma;
  /** IC médio das colunas para `comprimentoTestado`. */
  icMedio: number;
  /** IC médio normalizado: 0 = aleatório, 1 = português corrido. */
  encaixe: number;
  votosKasiski: number;
  /** Verossimilhança de bigrama do texto decifrado, já com a parcimônia descontada. */
  nota: number;
  /** Verossimilhança crua, sem a parcimônia — para exibir. */
  notaCrua: number;
  /** Texto decifrado, só letras. */
  claro: string;
}

export interface OpcoesQuebra {
  maxComprimento?: number;
  candidatos?: number;
  idiomas?: readonly Idioma[];
  maxLetras?: number;
}

/** Peso do Kasiski no ranqueamento dos comprimentos. Desempate, não voto principal. */
const PESO_KASISKI = 0.15;
/**
 * PARSIMÔNIA. Chave longa tem mais parâmetros livres, então a subida de encosta
 * consegue esticá-la para agradar o bigrama mesmo quando o comprimento é errado
 * — sobreajuste clássico. Desconta-se `λ·L/N` da nota.
 *
 * λ = 5 é medido, não escolhido: varrendo λ ∈ {0, 2, 5, 10, 20} × letras por
 * coluna ∈ {6, 8, 10, 12} no corpus cego, o acerto geral (60 a 300 letras) foi
 *
 *      λ=0 → 90,3%    λ=2 → 98,1%    λ=5 → 98,2%    λ=10 → 98,1%    λ=20 → 90,3%
 *
 * O patamar 2–10 é chato e largo (bom sinal: não é ajuste fino a ruído); 5 fica
 * no meio dele. λ=20 já pune demais e derruba as chaves longas legítimas.
 */
const LAMBDA_PARSIMONIA = 5;
/**
 * Mínimo de letras POR COLUNA para um comprimento entrar na disputa: 6.
 * Também medido na mesma varredura — 6 letras/coluna deu 98,2% contra 96,3%
 * com 8, 94,4% com 10 e 87,8% com 12. Mais permissivo que isso não dá: é este
 * teto que impede o L=12 de ser testado em 40 letras e vencer por sobreajuste.
 */
const LETRAS_POR_COLUNA = 6;
/**
 * Teto de letras analisadas. A subida de encosta é O(voltas·L·26·N); sem teto,
 * um texto colado de 50 KB travaria o fan-out, que roda a cada tecla. Com 2.000
 * letras a estatística já saturou muito antes (a medição crava 100% em 150).
 */
const MAX_LETRAS = 2000;

/**
 * QUEBRA VIGENÈRE SEM CHAVE. Devolve chaves candidatas, melhor primeiro.
 *
 * O caminho: IC por coluna (com o Kasiski como desempate) elege comprimentos
 * candidatos → qui-quadrado de cada coluna dá a semente da chave → subida de
 * encosta por bigrama corrige a semente → a chave colapsa → ranqueia pela
 * verossimilhança do texto decifrado, descontada a parsimônia.
 *
 * Roda para cada idioma pedido e mistura os resultados: uma chave que só faz
 * sentido em inglês compete com a que só faz sentido em português, e ganha a
 * que produz o texto mais plausível.
 *
 * TAXA DE ACERTO MEDIDA com este módulo (chave exata em 1º lugar, comprimento
 * NÃO informado, corpus cego E, texto colado sem espaços — o caso mais duro —,
 * chaves de 3 a 8 letras, 24 amostras por célula:
 *
 *      letras   L=3   L=4   L=5   L=6   L=7   L=8   geral
 *         40    98%   96%   88%   60%    —     —      57%
 *         60   100%   99%   99%   94%   83%   68%     91%
 *         80   100%  100%  100%   98%   95%   88%     97%
 *         90   100%   99%  100%  100%   99%   98%     99%
 *        100   100%  100%  100%   99%   99%   99%    100%
 *        150   100%  100%  100%  100%  100%  100%    100%
 *        300   100%  100%  100%  100%  100%  100%    100%
 *
 * O "—" não é falha de estatística: com menos de `LETRAS_POR_COLUNA`×L letras o
 * comprimento nem entra na disputa, por desenho.
 *
 * Estes números são da FUNÇÃO. O decoder `vigenere-crack` que a consome usa um
 * piso bem mais alto (150 letras), e por um motivo diferente: lá o que se mede
 * não é acerto, é quantas vezes uma chave errada consegue nota de resposta.
 */
export function quebrarVigenere(texto: string, opcoes: OpcoesQuebra = {}): ChaveCandidata[] {
  const maxComprimento = opcoes.maxComprimento ?? 16;
  const quantos = opcoes.candidatos ?? 5;
  const idiomas = opcoes.idiomas ?? (["pt", "en"] as const);
  const letras = soLetras(texto).slice(0, opcoes.maxLetras ?? MAX_LETRAS);
  const n = letras.length;
  if (n < 2 * LETRAS_POR_COLUNA) return [];

  const cod = paraCodigos(letras);
  const teto = Math.min(maxComprimento, Math.max(1, Math.floor(n / LETRAS_POR_COLUNA)));

  const porComprimento: { L: number; icMedio: number; encaixe: number }[] = [];
  for (let L = 1; L <= teto; L++) {
    let soma = 0;
    for (let c = 0; c < L; c++) soma += icDeCodigos(cod, c, L);
    const icMedio = soma / L;
    porComprimento.push({
      L,
      icMedio,
      encaixe: (icMedio - IC_ALEATORIO) / (IC_PORTUGUES - IC_ALEATORIO),
    });
  }

  const kas = kasiski(letras, { ngrama: 3, maxComprimento: teto });
  const votoPorL = new Map(kas.votos.map((v) => [v.comprimento, v.votos]));
  const maiorVoto = Math.max(1, ...kas.votos.map((v) => v.votos));
  const eleitos = [...porComprimento]
    .sort(
      (a, b) =>
        b.encaixe +
        PESO_KASISKI * ((votoPorL.get(b.L) ?? 0) / maiorVoto) -
        (a.encaixe + PESO_KASISKI * ((votoPorL.get(a.L) ?? 0) / maiorVoto)),
    )
    .slice(0, quantos);

  /**
   * Chave colapsada → candidato. Quando dois comprimentos testados desembocam na
   * MESMA chave (o 15 e o 5 chegam os dois em "navio", porque 15 é múltiplo de
   * 5), fica o de menor comprimento testado. Não é cosmética: a `notes` do card
   * conta em quantas colunas o texto foi fatiado, e anunciar 15 colunas para uma
   * chave de 5 letras seria descrever uma evidência que não é a que sustenta a
   * resposta. Entre duas explicações do mesmo fato, vale a mais curta.
   */
  const porChave = new Map<string, ChaveCandidata>();
  for (const idioma of idiomas) {
    const perfil = PERFIS[idioma];
    const lp = BIGRAMAS[idioma];
    for (const e of eleitos) {
      const { chave } = subirEncosta(cod, chavePorQuiQuadrado(cod, e.L, perfil), lp);
      const colapsada = colapsarChave(paraTexto(chave));
      const marca = `${idioma}:${colapsada}`;
      const anterior = porChave.get(marca);
      if (anterior && anterior.comprimentoTestado <= e.L) continue;
      const claroCod = decifrarCod(
        cod,
        [...colapsada].map((c) => c.charCodeAt(0) - 97),
      );
      const notaCrua = verossimilhancaCod(claroCod, lp);
      porChave.set(marca, {
        chave: colapsada,
        comprimentoTestado: e.L,
        idioma,
        icMedio: e.icMedio,
        encaixe: e.encaixe,
        votosKasiski: votoPorL.get(e.L) ?? 0,
        nota: notaCrua - (LAMBDA_PARSIMONIA * colapsada.length) / n,
        notaCrua,
        claro: paraTexto(claroCod),
      });
    }
  }
  return [...porChave.values()].sort((a, b) => b.nota - a.nota);
}
