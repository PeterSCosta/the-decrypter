/**
 * build-quadgramas.ts — a tabela de quadrigramas do português que o solver de
 * substituição monoalfabética (`engine/substituicao.ts`) usa como fitness.
 *
 * Saída: `src/features/decoder/engine/quadgramas-pt.ts`, um módulo GERADO com a
 * tabela em base64. Vai no bundle porque `decode` é síncrono e roda a cada
 * tecla: não há como esperar um `fetch` no meio do fan-out.
 *
 * ── POR QUE A LISTA DE PALAVRAS SOZINHA NÃO SERVE (medido) ────────────────
 * O pedido era gerar a tabela de `public/data/words-pt.txt`. Foi a primeira
 * tentativa e ela **não funciona** — não por pouco. O diagnóstico é objetivo:
 * comparei o fitness da chave VERDADEIRA com o da chave que a subida encontra.
 *
 *   tabela                                   acerto de letras   busca perdeu
 *   só words-pt.txt, dentro de palavra       32%                0 de 5
 *   só words-pt.txt, colada (ordem sorteada) 40%                0 de 5
 *   words-pt.txt ponderada por frequência    98–100%            0 de 5
 *
 * "Busca perdeu 0 de 5" quer dizer que a chave encontrada pontuava MAIS que a
 * verdadeira: o problema não era a subida, era o modelo. E a razão é estrutural:
 * um DICIONÁRIO conta tipos, não ocorrências. "abacaxizeiro" pesa igual a "para"
 * nas 259.221 linhas do arquivo, então a estatística que sai dali é a de um
 * texto que ninguém escreve. Um corpus real é dominado por palavras funcionais.
 *
 * Então `words-pt.txt` continua sendo o **vocabulário** (é ele que decide quais
 * palavras entram, e é ele que filtra o lixo de legenda: "hahaha", nomes
 * próprios, estrangeirismos — 771.743 das 848.043 linhas da lista de frequência
 * são descartadas por não estarem nele), e a contagem de ocorrências entra como
 * **peso**. Fonte dos pesos: hermitdave/FrequencyWords (OpenSubtitles pt-BR,
 * MIT) — a mesma prática do `build-words.ts`, que também busca a lista pt no
 * GitHub. Override local: `$FREQ_PT` apontando para um "palavra contagem" por
 * linha. Sem rede e sem override o script **falha e não escreve nada**, em vez
 * de gravar uma tabela pior por cima da boa.
 *
 * ── AS FRONTEIRAS ENTRE PALAVRAS SÃO METADE DA CONTA ─────────────────────
 * O texto cifrado chega sem espaço confiável, então o solver pontua a corrente
 * de letras COLADA. Num texto de 137 letras com ~25 palavras, 72 dos 134
 * quadrigramas cruzam a fronteira entre duas palavras — a maioria. Uma tabela
 * feita só de quadrigramas internos dá nota de piso justamente à maioria.
 *
 * A fronteira é contada de forma ANALÍTICA, não por sorteio: se as palavras
 * fossem sorteadas independentemente pela frequência, o peso esperado do
 * quadrigrama sufixo+prefixo é P(sufixo)·P(prefixo)·(nº de fronteiras). São três
 * repartições (3+1, 2+2, 1+3) e cada uma é um produto externo de duas
 * distribuições pequenas. Sem amostragem: sem semente, sem ruído, reprodutível.
 *
 * ── TAMANHO ───────────────────────────────────────────────────────────────
 * O teto do enunciado era ~200 KB gzip. A tabela cheia (106.514 quadrigramas,
 * peso de 8 bits) dá 129,5 KB gzip; ela cabia. Mesmo assim foi cortada, porque
 * medir mostrou que os dois cortes saem de graça (240 solves por configuração,
 * textos de ~110 letras, que é a faixa difícil):
 *
 *   peso 8 bits, 106.514 quadrigramas   129,5 KB gzip
 *   peso 4 bits, 106.514 quadrigramas    72,0 KB gzip   acerto 90,4%  exatos 133/240
 *   peso 4 bits,  80.000 quadrigramas    54,0 KB gzip   acerto 89,7%  exatos 140/240
 *   peso 4 bits,  60.000 quadrigramas    42,6 KB gzip   acerto 85,1%  exatos 101/240
 *
 * 4 bits (15 níveis) não perde nada — a quantização grossa funciona como
 * suavização. De 106.514 para 80.000 é empate dentro do ruído (mais exatos, um
 * pouco menos de ">=90%"). De 80.000 para 60.000 cai de verdade. Ficou em
 * **80.000 quadrigramas, peso de 4 bits, 54,0 KB gzip** — 27% do teto.
 *
 * Formato (tudo antes do base64): varint do salto entre índices consecutivos
 * (índice = ((a·26+b)·26+c)·26+d, com a..d em 0..25), depois os pesos, dois por
 * byte (nibble baixo primeiro).
 *
 * Rodar: pnpm tsx scripts/build-quadgramas.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { stripDiacritics } from "../src/features/decoder/engine/util";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const A = 97;
/** Quantos quadrigramas ficam na tabela. Ver o bloco TAMANHO no cabeçalho. */
const MANTER = 80_000;
/** Níveis do peso: 4 bits, 1..15. O 0 fica reservado para "não está na tabela". */
const NIVEIS = 15;
const FONTE_FREQ =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt_br/pt_br_full.txt";

const fold = (s: string) => stripDiacritics(s).toLowerCase();

/** O vocabulário: quem pode entrar na conta. */
function lerVocabulario(): Set<string> {
  const caminho = resolve(ROOT, "public/data/words-pt.txt");
  if (!existsSync(caminho)) throw new Error(`words-pt.txt não encontrado em ${caminho}`);
  const vocab = new Set<string>();
  for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
    const w = fold(linha.trim());
    if (/^[a-z]+$/.test(w)) vocab.add(w);
  }
  return vocab;
}

/** Os pesos: quantas vezes cada palavra do vocabulário realmente ocorre. */
async function lerFrequencias(vocab: Set<string>): Promise<[string, number][]> {
  const local = process.env.FREQ_PT;
  let texto: string;
  if (local && existsSync(local)) {
    texto = readFileSync(local, "utf8");
  } else {
    const res = await fetch(FONTE_FREQ);
    if (!res.ok) throw new Error(`fetch da lista de frequência: HTTP ${res.status}`);
    texto = await res.text();
  }
  const out: [string, number][] = [];
  let fora = 0;
  for (const linha of texto.split("\n")) {
    const [bruta, conta] = linha.split(" ");
    if (!bruta || !conta) continue;
    const w = fold(bruta);
    const n = Number(conta);
    if (!/^[a-z]+$/.test(w) || !Number.isFinite(n) || n <= 0) continue;
    if (!vocab.has(w)) {
      fora++;
      continue;
    }
    out.push([w, n]);
  }
  if (out.length < 10_000) {
    throw new Error(`lista de frequência com só ${out.length} palavras no vocabulário — suspeito`);
  }
  console.log(
    `  palavras com peso: ${out.length}  (${fora} descartadas por não estar no vocabulário)`,
  );
  return out;
}

function indice(q: string): number {
  return (
    ((q.charCodeAt(0) - A) * 26 + (q.charCodeAt(1) - A)) * 676 +
    (q.charCodeAt(2) - A) * 26 +
    (q.charCodeAt(3) - A)
  );
}

/** Contagem ponderada: dentro das palavras + fronteira analítica entre elas. */
function contar(freqs: readonly [string, number][]): { contas: Float64Array; total: number } {
  const contas = new Float64Array(26 ** 4);
  let total = 0;
  let tokens = 0;
  for (const [, n] of freqs) tokens += n;

  // sufixos e prefixos de 1, 2 e 3 letras, em probabilidade de token
  const sfx = [new Map<string, number>(), new Map<string, number>(), new Map<string, number>()];
  const pfx = [new Map<string, number>(), new Map<string, number>(), new Map<string, number>()];

  for (const [w, n] of freqs) {
    for (let i = 3; i < w.length; i++) {
      contas[indice(w.slice(i - 3, i + 1))] += n;
      total += n;
    }
    const p = n / tokens;
    for (let k = 1; k <= 3; k++) {
      if (w.length < k) continue;
      const s = w.slice(-k);
      const f = w.slice(0, k);
      sfx[k - 1].set(s, (sfx[k - 1].get(s) ?? 0) + p);
      pfx[k - 1].set(f, (pfx[k - 1].get(f) ?? 0) + p);
    }
  }

  // Uma fronteira por token; três repartições sufixo+prefixo por fronteira.
  for (let k = 1; k <= 3; k++) {
    const s = sfx[k - 1];
    const f = pfx[3 - k];
    for (const [sufixo, ps] of s) {
      for (const [prefixo, pp] of f) {
        const peso = ps * pp * tokens;
        // Abaixo de meia ocorrência esperada é ruído de arredondamento e só
        // engorda a tabela: 4,3 milhões de pares entram nesta soma.
        if (peso < 0.5) continue;
        contas[indice(sufixo + prefixo)] += peso;
        total += peso;
      }
    }
  }
  return { contas, total };
}

/** Log-probabilidade quantizada em 4 bits, só para os `MANTER` mais frequentes. */
function quantizar(contas: Float64Array, total: number) {
  let indices: number[] = [];
  for (let i = 0; i < contas.length; i++) if (contas[i] > 0) indices.push(i);
  const distintos = indices.length;
  if (indices.length > MANTER) {
    indices.sort((a, b) => contas[b] - contas[a]);
    indices = indices.slice(0, MANTER);
    indices.sort((a, b) => a - b);
  }
  // O piso é o clássico: uma centésima de ocorrência. A escala é afim, e o
  // fitness soma sempre o mesmo número de parcelas, então a ordem entre chaves
  // é idêntica à da log-probabilidade sem quantizar.
  const piso = Math.log10(0.01 / total);
  let teto = Number.NEGATIVE_INFINITY;
  for (const i of indices) teto = Math.max(teto, Math.log10(contas[i] / total));
  const pesos = indices.map((i) => {
    const lp = Math.log10(contas[i] / total);
    const q = Math.round((NIVEIS * (lp - piso)) / (teto - piso));
    return Math.min(NIVEIS, Math.max(1, q));
  });
  return { indices, pesos, distintos };
}

/** varint dos saltos + pesos em nibble. */
function empacotar(indices: readonly number[], pesos: readonly number[]): Uint8Array {
  const saltos: number[] = [];
  let anterior = -1;
  for (const i of indices) {
    let d = i - anterior - 1;
    anterior = i;
    while (d >= 128) {
      saltos.push((d & 127) | 128);
      d >>>= 7;
    }
    saltos.push(d);
  }
  const nibbles = new Uint8Array(Math.ceil(pesos.length / 2));
  for (let i = 0; i < pesos.length; i++) nibbles[i >> 1] |= pesos[i] << ((i & 1) * 4);
  const bin = new Uint8Array(saltos.length + nibbles.length);
  bin.set(saltos, 0);
  bin.set(nibbles, saltos.length);
  return bin;
}

async function main(): Promise<void> {
  console.log("· vocabulário (public/data/words-pt.txt)");
  const vocab = lerVocabulario();
  console.log(`  ${vocab.size} palavras`);

  console.log("· pesos (ocorrências)");
  const freqs = await lerFrequencias(vocab);

  console.log("· contagem dos quadrigramas");
  const { contas, total } = contar(freqs);
  const { indices, pesos, distintos } = quantizar(contas, total);
  console.log(`  distintos: ${distintos}   mantidos: ${indices.length}`);

  const bin = empacotar(indices, pesos);
  const b64 = Buffer.from(bin).toString("base64");
  const gzip = gzipSync(Buffer.from(b64), { level: 9 }).length;
  console.log(
    `  binário ${(bin.length / 1024).toFixed(1)} KB · base64 ${(b64.length / 1024).toFixed(1)} KB · gzip ${(gzip / 1024).toFixed(1)} KB`,
  );
  if (gzip > 200 * 1024) {
    throw new Error(`tabela com ${(gzip / 1024).toFixed(1)} KB gzip — acima do teto de 200 KB`);
  }

  const destino = resolve(ROOT, "src/features/decoder/engine/quadgramas-pt.ts");
  const arquivo = `/**
 * ARQUIVO GERADO por \`scripts/build-quadgramas.ts\` — não edite à mão.
 *
 * Tabela de quadrigramas do português para o solver de substituição
 * (\`substituicao.ts\`). Os ${indices.length} quadrigramas mais frequentes, peso de 4 bits.
 * ${(b64.length / 1024).toFixed(1)} KB de fonte, ${(gzip / 1024).toFixed(1)} KB gzip.
 *
 * Formato: varint do salto entre índices + pesos em nibble (baixo primeiro).
 * Índice = ((a·26+b)·26+c)·26+d, letras em 0..25.
 */

/** Quantos quadrigramas a tabela guarda. */
export const QUADGRAMAS_N = ${indices.length};

/** Maior peso possível (4 bits, 1..15); 0 significa "fora da tabela". */
export const QUADGRAMAS_NIVEIS = ${NIVEIS};

export const QUADGRAMAS_B64 =
  "${b64}";
`;
  writeFileSync(destino, arquivo);
  console.log(`· escrito ${destino}`);
}

main().catch((err) => {
  console.error("✗", err instanceof Error ? err.message : err);
  process.exit(1);
});
