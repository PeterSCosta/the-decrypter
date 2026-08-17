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
  } else if (formato === "mp3") {
    const { textos, fim } = lerId3(bytes);
    ficha.textos.push(...textos);
    if (fim > 0) ficha.fimDeclarado = null; // o ID3 é o começo, não o fim
    // ID3v1: 128 bytes finais começando com "TAG".
    if (bytes.length > 128 && ASCII(bytes, bytes.length - 128, 3) === "TAG") {
      const t = textoLegivel(bytes.subarray(bytes.length - 125, bytes.length - 30));
      if (t) ficha.textos.push({ fonte: "ID3v1", texto: t });
    }
  }

  if (ficha.fimDeclarado != null && bytes.length > ficha.fimDeclarado) {
    ficha.bytesDepoisDoFim = bytes.length - ficha.fimDeclarado;
  }

  // Varredura de assinatura. Começa em 4 para não acusar o próprio cabeçalho.
  for (const a of ASSINATURAS) {
    for (let i = 4; i <= bytes.length - a.bytes.length; i++) {
      let bate = true;
      for (let j = 0; j < a.bytes.length; j++) {
        if (bytes[i + j] !== a.bytes[j]) {
          bate = false;
          break;
        }
      }
      if (bate) {
        ficha.embutidos.push({ tipo: a.tipo, offset: i, bytesAteOFim: bytes.length - i });
        break; // uma ocorrência por tipo basta para levantar a mão
      }
    }
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
