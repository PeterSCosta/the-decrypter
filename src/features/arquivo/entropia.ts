/**
 * Mapa de entropia — o gráfico que denuncia um bloco cifrado ou comprimido
 * dentro de um arquivo comum.
 *
 * A entropia de Shannon por bloco mede quanta surpresa há em cada trecho, de 0
 * (um byte só, repetido) a 8 bits/byte (todos os 256 igualmente prováveis).
 * Cada tipo de conteúdo tem uma faixa característica, e um DEGRAU no meio do
 * arquivo é o que interessa: texto a 4,5 seguido de um platô a 7,99 é um bloco
 * que não pertence ali.
 *
 * ── O LIMITE HONESTO, que precisa ir para a tela ───────────────────────────
 * Entropia alta NÃO distingue cifrado de comprimido. Um ZIP, um JPEG e um
 * arquivo cifrado com AES ficam todos perto de 7,99 — e é assim por construção,
 * porque compressão boa remove justamente a redundância que a cifra também
 * remove. O que a entropia responde é "há um bloco de natureza diferente aqui",
 * e a resposta seguinte vem da assinatura, não deste número.
 */

export interface BlocoDeEntropia {
  offset: number;
  tamanho: number;
  /** Bits por byte, de 0 a 8. */
  entropia: number;
}

export interface MapaDeEntropia {
  blocos: BlocoDeEntropia[];
  media: number;
  minimo: number;
  maximo: number;
  /** Trechos que destoam do resto — o que merece o olho. */
  degraus: { offset: number; tamanho: number; de: number; para: number; leitura: string }[];
  leitura: string;
}

/** 4 KB: fino o bastante para achar um bloco pequeno, grosso o bastante para a conta ser estável. */
export const BLOCO_PADRAO = 4096;

export function entropiaDe(bytes: Uint8Array, inicio: number, fim: number): number {
  const contagem = new Uint32Array(256);
  const n = fim - inicio;
  if (n <= 0) return 0;
  for (let i = inicio; i < fim; i++) contagem[bytes[i]]++;
  let h = 0;
  for (const c of contagem) {
    if (c === 0) continue;
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
}

/**
 * Qui-quadrado contra a distribuição uniforme.
 *
 * Complementa a entropia num ponto em que ela é cega: dados comprimidos têm
 * entropia altíssima mas ainda carregam estrutura (cabeçalhos, tabelas de
 * Huffman), enquanto uma saída de cifra é uniforme de verdade. Valor muito
 * baixo — perto dos 255 graus de liberdade — é o que a uniformidade produz.
 */
export function quiQuadradoUniforme(bytes: Uint8Array, inicio: number, fim: number): number {
  const contagem = new Uint32Array(256);
  const n = fim - inicio;
  if (n < 256) return Number.NaN;
  for (let i = inicio; i < fim; i++) contagem[bytes[i]]++;
  const esperado = n / 256;
  let x = 0;
  for (const c of contagem) x += (c - esperado) ** 2 / esperado;
  return x;
}

export function mapearEntropia(bytes: Uint8Array, tamanhoDoBloco = BLOCO_PADRAO): MapaDeEntropia {
  const blocos: BlocoDeEntropia[] = [];
  for (let off = 0; off < bytes.length; off += tamanhoDoBloco) {
    const fim = Math.min(off + tamanhoDoBloco, bytes.length);
    // Bloco final curto demais dá entropia artificialmente baixa e viraria
    // degrau falso no fim de todo arquivo.
    if (fim - off < tamanhoDoBloco / 4 && blocos.length > 0) break;
    blocos.push({ offset: off, tamanho: fim - off, entropia: entropiaDe(bytes, off, fim) });
  }

  if (!blocos.length) {
    return {
      blocos,
      media: 0,
      minimo: 0,
      maximo: 0,
      degraus: [],
      leitura: "Arquivo pequeno demais para medir.",
    };
  }

  const valores = blocos.map((b) => b.entropia);
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);

  // Degrau: uma corrida de blocos claramente acima da mediana geral.
  const ordenados = [...valores].sort((a, b) => a - b);
  const mediana = ordenados[Math.floor(ordenados.length / 2)];
  const degraus: MapaDeEntropia["degraus"] = [];
  let corridaInicio = -1;
  for (let i = 0; i <= blocos.length; i++) {
    const alto =
      i < blocos.length && blocos[i].entropia > 7.5 && blocos[i].entropia - mediana > 1.5;
    if (alto && corridaInicio < 0) corridaInicio = i;
    if (!alto && corridaInicio >= 0) {
      const de = blocos[corridaInicio].offset;
      const ate = blocos[i - 1].offset + blocos[i - 1].tamanho;
      // Corridas de um bloco só são ruído; duas ou mais é padrão.
      if (i - corridaInicio >= 2) {
        degraus.push({
          offset: de,
          tamanho: ate - de,
          de: mediana,
          para: Math.max(...valores.slice(corridaInicio, i)),
          leitura:
            "Trecho de entropia bem acima do resto do arquivo — é a marca de dado comprimido OU cifrado; a entropia sozinha não separa os dois.",
        });
      }
      corridaInicio = -1;
    }
  }

  let leitura: string;
  if (media > 7.9) {
    leitura =
      "O arquivo inteiro tem entropia máxima — é o esperado de qualquer formato já comprimido (MP3, JPEG, ZIP). Nada a concluir daqui.";
  } else if (degraus.length) {
    leitura = `${degraus.length} trecho(s) destoam do resto do arquivo. Vale olhar o que começa em ${degraus[0].offset.toLocaleString("pt-BR")}.`;
  } else if (maximo - minimo < 1) {
    leitura = "Entropia uniforme do começo ao fim: nenhum bloco destoa.";
  } else {
    leitura =
      "Variação normal de entropia, sem trecho que destoe o bastante para levantar suspeita.";
  }

  return { blocos, media, minimo, maximo, degraus, leitura };
}
