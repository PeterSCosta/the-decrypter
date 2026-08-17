/**
 * A camada dos BYTES CRUS do arquivo — a primeira, e a que mais gente esquece.
 *
 * O `decodeAudioData` do navegador entrega som: amostras em float, já
 * reamostradas, com todo o resto do arquivo jogado fora. Tudo que estiver
 * ESCONDIDO FORA das amostras — um zip colado depois do fim, um chunk RIFF que
 * ninguém lê, uma tag com texto, uma taxa de amostragem mentirosa — desaparece
 * ali e não volta. Por isso os bytes originais são guardados antes de qualquer
 * decodificação, e analisados aqui.
 *
 * Nada neste arquivo depende do navegador: é `Uint8Array` puro, e por isso é
 * inteiramente testável.
 */

export type FormatoAudio =
  | "wav"
  | "mp3"
  | "flac"
  | "ogg"
  | "m4a"
  | "aiff"
  | "amr"
  | "wma"
  | "desconhecido";

export interface ChunkRiff {
  id: string;
  offset: number;
  tamanho: number;
  /** Chunks fora do conjunto conhecido são candidatos a esconderijo. */
  conhecido: boolean;
}

export interface AchadoEmbutido {
  /** "ZIP", "PNG", "PDF"… */
  tipo: string;
  offset: number;
  /** Um arquivo inteiro colado no fim pesa diferente de 4 bytes por acaso. */
  bytesAteOFim: number;
  /**
   * Quão sério é o achado — e esta distinção é a diferença entre a ferramenta
   * ser útil e ser um gerador de ruído.
   *
   * `depois-do-fim` é evidência forte: a assinatura está no espaço que o próprio
   * cabeçalho declara não pertencer ao áudio. É onde cai o arquivo colado com
   * `cat foto.jpg >> musica.wav`.
   *
   * `dentro-do-dado` é fraco por natureza. Uma assinatura de 3 ou 4 bytes casa
   * por acaso dentro de qualquer massa de dados — e casou de verdade: na
   * primeira versão deste módulo, um WAV de 1 s com uma foto no fim fazia o
   * detector apontar um "JPEG" no offset 46.592, dentro das amostras, em vez do
   * arquivo real em 176.444. Marcar em vez de esconder: o achado fraco continua
   * visível para quem quiser cavar, mas não se disfarça de descoberta.
   */
  forca: "depois-do-fim" | "dentro-do-dado";
}

export interface FichaDoArquivo {
  formato: FormatoAudio;
  /** A extensão mente com frequência; o magic, não. */
  extensaoBate: boolean;
  /** Lida do cabeçalho, não do decodificador — as duas podem divergir. */
  taxaDeclarada: number | null;
  canaisDeclarados: number | null;
  bitsPorAmostra: number | null;
  /** Onde o áudio declara terminar, e quantos bytes vêm depois disso. */
  fimDeclarado: number | null;
  bytesDepoisDoFim: number;
  chunks: ChunkRiff[];
  embutidos: AchadoEmbutido[];
  textos: { fonte: string; texto: string }[];
  /** O que merece o olho humano, em pt-BR, sem afirmar que é mensagem. */
  observacoes: string[];
}

const ASCII = (b: Uint8Array, off: number, n: number) =>
  String.fromCharCode(...b.subarray(off, off + n));

const u32le = (b: Uint8Array, o: number) =>
  b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] * 0x1000000);
const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32be = (b: Uint8Array, o: number) =>
  b[o] * 0x1000000 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);

/** Chunks RIFF que um WAV normal tem. O resto é, no mínimo, curioso. */
const CHUNKS_NORMAIS = new Set([
  "fmt ",
  "data",
  "fact",
  "LIST",
  "cue ",
  "PEAK",
  "bext",
  "JUNK",
  "id3 ",
]);

/**
 * Assinaturas de arquivo. Um zip/rar/png dentro de um mp3 é o truque mais
 * barato que existe, e o mais usado em CTF — `cat musica.mp3 segredo.zip > x.mp3`
 * continua tocando normalmente.
 */
const ASSINATURAS: { tipo: string; bytes: number[] }[] = [
  { tipo: "ZIP", bytes: [0x50, 0x4b, 0x03, 0x04] },
  { tipo: "ZIP (vazio/spanned)", bytes: [0x50, 0x4b, 0x05, 0x06] },
  { tipo: "RAR", bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] },
  { tipo: "7z", bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { tipo: "GZIP", bytes: [0x1f, 0x8b, 0x08] },
  { tipo: "PNG", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { tipo: "JPEG", bytes: [0xff, 0xd8, 0xff] },
  { tipo: "GIF", bytes: [0x47, 0x49, 0x46, 0x38] },
  { tipo: "PDF", bytes: [0x25, 0x50, 0x44, 0x46] },
  { tipo: "BZIP2", bytes: [0x42, 0x5a, 0x68] },
  { tipo: "XZ", bytes: [0xfd, 0x37, 0x7a, 0x58, 0x5a] },
  { tipo: "ELF", bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { tipo: "SQLite", bytes: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65] },
];

function detectaFormato(b: Uint8Array): FormatoAudio {
  if (b.length < 12) return "desconhecido";
  const quatro = ASCII(b, 0, 4);
  if (quatro === "RIFF" && ASCII(b, 8, 4) === "WAVE") return "wav";
  if (quatro === "fLaC") return "flac";
  if (quatro === "OggS") return "ogg";
  if (quatro === "FORM" && (ASCII(b, 8, 4) === "AIFF" || ASCII(b, 8, 4) === "AIFC")) return "aiff";
  if (ASCII(b, 4, 4) === "ftyp") return "m4a";
  if (ASCII(b, 0, 5) === "#!AMR") return "amr";
  if (b[0] === 0x30 && b[1] === 0x26 && b[2] === 0xb2 && b[3] === 0x75) return "wma";
  // MP3: ou começa com ID3, ou com um frame sync (11 bits em 1).
  if (ASCII(b, 0, 3) === "ID3") return "mp3";
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return "mp3";
  return "desconhecido";
}

/** Varre os chunks de um RIFF/WAV e devolve onde o `data` termina. */
function lerRiff(b: Uint8Array): {
  chunks: ChunkRiff[];
  fimDoData: number | null;
  fmt: Partial<FichaDoArquivo>;
} {
  const chunks: ChunkRiff[] = [];
  const fmt: Partial<FichaDoArquivo> = {};
  let fimDoData: number | null = null;
  let off = 12;

  while (off + 8 <= b.length) {
    const id = ASCII(b, off, 4);
    const tamanho = u32le(b, off + 4);
    // Tamanho absurdo = cabeçalho corrompido ou adulterado; parar é mais honesto
    // que varrer o arquivo inteiro atrás de lixo.
    if (tamanho < 0 || off + 8 + tamanho > b.length + 8) break;
    chunks.push({ id, offset: off, tamanho, conhecido: CHUNKS_NORMAIS.has(id) });

    if (id === "fmt " && off + 8 + 16 <= b.length) {
      fmt.canaisDeclarados = u16le(b, off + 10);
      fmt.taxaDeclarada = u32le(b, off + 12);
      fmt.bitsPorAmostra = u16le(b, off + 22);
    }
    if (id === "data") fimDoData = off + 8 + tamanho;

    // Chunks RIFF têm padding para tamanho par.
    off += 8 + tamanho + (tamanho % 2);
  }
  return { chunks, fimDoData, fmt };
}

/** Texto legível dentro de uma fatia — para tags e chunks desconhecidos. */
function textoLegivel(b: Uint8Array, min = 4): string {
  let atual = "";
  let melhor = "";
  for (const byte of b) {
    if (byte >= 0x20 && byte < 0x7f) {
      atual += String.fromCharCode(byte);
      if (atual.length > melhor.length) melhor = atual;
    } else {
      atual = "";
    }
  }
  return melhor.length >= min ? melhor : "";
}

/**
 * Taxa de amostragem de um AAC cru (ADTS) — 4 bits de índice numa tabela fixa.
 *
 * Entra porque a crítica do plano mediu o acervo real: 78 mp3, **18 aac e 1
 * m4a**. Um parser que só lê WAV e MP3 deixa 20% dos arquivos sem taxa — e a
 * taxa é o que evita a reamostragem silenciosa do `decodeAudioData`, que
 * descarta a faixa alta sem avisar. Ficar sem ela em 1 de cada 5 arquivos é
 * exatamente onde uma portadora ultrassônica sumiria sem deixar rastro.
 */
const TAXAS_ADTS = [
  96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350,
];

function taxaDoAdts(b: Uint8Array): { taxa: number; canais: number } | null {
  // Sync de 12 bits: FF Fx.
  if (b.length < 7 || b[0] !== 0xff || (b[1] & 0xf0) !== 0xf0) return null;
  const indice = (b[2] >> 2) & 0x0f;
  if (indice >= TAXAS_ADTS.length) return null;
  // channel_configuration: 3 bits, atravessando os bytes 2 e 3.
  const canais = ((b[2] & 0x01) << 2) | ((b[3] >> 6) & 0x03);
  return { taxa: TAXAS_ADTS[indice], canais: canais || 0 };
}

/**
 * Taxa de um M4A/MP4: o `timescale` do átomo `mdhd`, dentro de
 * `moov > trak > mdia`.
 *
 * Percorrer a árvore é obrigatório — os átomos declaram o próprio tamanho e a
 * ordem não é garantida. As mesmas armadilhas do `fim.ts` valem aqui:
 * `size == 0` significa "até o fim" e `size == 1` manda ler 64 bits.
 */
function taxaDoM4a(b: Uint8Array): { taxa: number; canais: number | null } | null {
  const nome = (o: number) => ASCII(b, o + 4, 4);

  const procurar = (inicio: number, fim: number, alvo: string, dentro: string[]): number | null => {
    let off = inicio;
    while (off + 8 <= fim) {
      let tamanho = u32be(b, off);
      let corpo = off + 8;
      if (tamanho === 1) {
        if (off + 16 > fim) return null;
        // Só a metade baixa: arquivo acima de 4 GB não é caso desta bancada.
        tamanho = u32be(b, off + 12);
        corpo = off + 16;
      } else if (tamanho === 0) {
        tamanho = fim - off;
      }
      if (tamanho < 8 || off + tamanho > fim) return null;
      const n = nome(off);
      if (n === alvo) return corpo;
      if (dentro.includes(n)) {
        const achado = procurar(corpo, off + tamanho, alvo, dentro);
        if (achado !== null) return achado;
      }
      off += tamanho;
    }
    return null;
  };

  const mdhd = procurar(0, b.length, "mdhd", ["moov", "trak", "mdia"]);
  if (mdhd === null || mdhd + 20 > b.length) return null;
  const versao = b[mdhd];
  // v0: versão+flags(4) + criação(4) + modificação(4) → timescale em +12.
  // v1: os tempos viram 64 bits → timescale em +20.
  const off = versao === 1 ? mdhd + 20 : mdhd + 12;
  if (off + 4 > b.length) return null;
  const taxa = u32be(b, off);
  // Timescale de faixa de áudio É a taxa de amostragem; de vídeo costuma ser
  // 600 ou 90000, e aceitar isso como "taxa" seria pior que não saber.
  if (taxa < 8000 || taxa > 192000) return null;
  return { taxa, canais: null };
}

/** Frames de texto do ID3v2 que carregam algo que uma pessoa escreveu. */
function lerId3(b: Uint8Array): { textos: { fonte: string; texto: string }[]; fim: number } {
  if (ASCII(b, 0, 3) !== "ID3" || b.length < 10) return { textos: [], fim: 0 };
  // Tamanho sincsafe: 7 bits por byte.
  const tam = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
  const fim = 10 + tam;
  const textos: { fonte: string; texto: string }[] = [];
  let off = 10;
  while (off + 10 <= Math.min(fim, b.length)) {
    const id = ASCII(b, off, 4);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const tamFrame = u32be(b, off + 4);
    if (tamFrame <= 0 || off + 10 + tamFrame > b.length) break;
    // Frames de texto começam com T; COMM é comentário; APIC é imagem embutida.
    if (id.startsWith("T") || id === "COMM" || id === "USLT" || id.startsWith("W")) {
      const t = textoLegivel(b.subarray(off + 10, off + 10 + tamFrame));
      if (t) textos.push({ fonte: `ID3 ${id}`, texto: t });
    } else if (id === "APIC") {
      textos.push({ fonte: "ID3 APIC", texto: `imagem embutida (${tamFrame} bytes)` });
    }
    off += 10 + tamFrame;
  }
  return { textos, fim };
}

/**
 * Ficha completa do arquivo, a partir dos bytes crus.
 *
 * Não decide se há mensagem. Reúne o que é FATO sobre o arquivo e deixa o
 * julgamento para quem está olhando — é a mesma disciplina do ranking que
 * "parou de mentir".
 */
export function analisarContainer(bytes: Uint8Array, nomeDoArquivo = ""): FichaDoArquivo {
  const formato = detectaFormato(bytes);
  const ext = (nomeDoArquivo.split(".").pop() ?? "").toLowerCase();
  const extPorFormato: Record<FormatoAudio, string[]> = {
    wav: ["wav", "wave"],
    mp3: ["mp3"],
    flac: ["flac"],
    ogg: ["ogg", "oga", "opus"],
    m4a: ["m4a", "mp4", "aac", "m4b"],
    aiff: ["aif", "aiff", "aifc"],
    amr: ["amr"],
    wma: ["wma"],
    desconhecido: [],
  };

  const ficha: FichaDoArquivo = {
    formato,
    extensaoBate: formato === "desconhecido" ? true : extPorFormato[formato].includes(ext),
    taxaDeclarada: null,
    canaisDeclarados: null,
    bitsPorAmostra: null,
    fimDeclarado: null,
    bytesDepoisDoFim: 0,
    chunks: [],
    embutidos: [],
    textos: [],
    observacoes: [],
  };

  if (formato === "wav") {
    const { chunks, fimDoData, fmt } = lerRiff(bytes);
    ficha.chunks = chunks;
    ficha.fimDeclarado = fimDoData;
    Object.assign(ficha, fmt);
    // O campo de tamanho do RIFF conta tudo depois dos 8 primeiros bytes.
    const tamanhoRiff = bytes.length >= 8 ? u32le(bytes, 4) + 8 : 0;
    if (tamanhoRiff > 0 && bytes.length > tamanhoRiff) {
      ficha.observacoes.push(
        `O cabeçalho RIFF declara ${tamanhoRiff} bytes, e o arquivo tem ${bytes.length}. Sobram ${bytes.length - tamanhoRiff}.`,
      );
    }
    for (const c of chunks) {
      if (!c.conhecido) {
        const t = textoLegivel(
          bytes.subarray(c.offset + 8, c.offset + 8 + Math.min(c.tamanho, 4096)),
        );
        ficha.observacoes.push(`Chunk RIFF fora do comum: "${c.id}" (${c.tamanho} bytes).`);
        if (t) ficha.textos.push({ fonte: `chunk ${c.id}`, texto: t });
      }
    }
  } else if (formato === "m4a") {
    const m = taxaDoM4a(bytes);
    if (m) {
      ficha.taxaDeclarada = m.taxa;
      ficha.canaisDeclarados = m.canais;
    } else {
      ficha.observacoes.push(
        "Não consegui ler a taxa de amostragem deste MP4/M4A — sem ela, não dá para saber se a decodificação reamostrou e descartou a faixa alta.",
      );
    }
  } else if (formato === "mp3") {
    const { textos, fim } = lerId3(bytes);
    ficha.textos.push(...textos);
    if (fim > 0) ficha.fimDeclarado = null; // o ID3 é o começo, não o fim
    // AAC cru (ADTS) costuma vir com extensão .aac e cair aqui pelo sync.
    const adts = taxaDoAdts(bytes);
    if (adts) {
      ficha.taxaDeclarada = adts.taxa;
      if (adts.canais > 0) ficha.canaisDeclarados = adts.canais;
    }
    // ID3v1: 128 bytes finais começando com "TAG".
    if (bytes.length > 128 && ASCII(bytes, bytes.length - 128, 3) === "TAG") {
      const t = textoLegivel(bytes.subarray(bytes.length - 125, bytes.length - 30));
      if (t) ficha.textos.push({ fonte: "ID3v1", texto: t });
    }
  }

  if (ficha.fimDeclarado != null && bytes.length > ficha.fimDeclarado) {
    ficha.bytesDepoisDoFim = bytes.length - ficha.fimDeclarado;
  }

  // Varredura de assinatura.
  //
  // Duas ocorrências por tipo, no máximo: a PRIMEIRA depois do fim declarado
  // (que é o achado que interessa) e a primeira dentro do dado (que fica
  // marcada como fraca). Parar na primeira ocorrência qualquer, como a versão
  // anterior fazia, escondia o arquivo colado no fim atrás de um casamento por
  // acaso lá no meio das amostras.
  const fim = ficha.fimDeclarado;
  for (const a of ASSINATURAS) {
    let dentro: AchadoEmbutido | null = null;
    let depois: AchadoEmbutido | null = null;

    for (let i = 4; i <= bytes.length - a.bytes.length; i++) {
      let bate = true;
      for (let j = 0; j < a.bytes.length; j++) {
        if (bytes[i + j] !== a.bytes[j]) {
          bate = false;
          break;
        }
      }
      if (!bate) continue;

      const eDepois = fim != null && i >= fim;
      const achado: AchadoEmbutido = {
        tipo: a.tipo,
        offset: i,
        bytesAteOFim: bytes.length - i,
        forca: eDepois ? "depois-do-fim" : "dentro-do-dado",
      };
      if (eDepois) {
        depois = achado;
        break; // o forte encerra a busca deste tipo
      }
      dentro ??= achado;
    }

    // O forte primeiro; o fraco só aparece quando não houve forte.
    if (depois) ficha.embutidos.push(depois);
    else if (dentro) ficha.embutidos.push(dentro);
  }

  if (!ficha.extensaoBate) {
    ficha.observacoes.push(
      `A extensão ".${ext}" não corresponde ao conteúdo, que é ${formato.toUpperCase()}.`,
    );
  }
  if (ficha.bytesDepoisDoFim > 0) {
    ficha.observacoes.push(
      `${ficha.bytesDepoisDoFim} bytes depois do fim declarado do áudio — um arquivo colado no fim cabe exatamente aí.`,
    );
  }

  return ficha;
}
