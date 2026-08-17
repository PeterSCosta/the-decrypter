/**
 * O que este arquivo É — pelos bytes, não pela extensão.
 *
 * A extensão é a única parte do arquivo que qualquer pessoa muda em dois
 * segundos, e renomear é o truque mais barato do repertório. Um `.wav` que é
 * JPEG, um `.png` que é ZIP, um `.txt` que é PDF: nenhum deles se anuncia, e
 * todos se denunciam nos primeiros bytes.
 *
 * Este módulo generaliza o `detectaFormato` que vivia em `audio/container.ts` e
 * só conhecia som. Nada aqui depende do navegador.
 */

export type Familia = "audio" | "imagem" | "video" | "documento" | "arquivo-comprimido" | "outro";

export interface Assinatura {
  /** Rótulo curto, em pt-BR quando faz sentido. */
  tipo: string;
  familia: Familia;
  /** Bytes esperados. `null` numa posição = curinga. */
  bytes: (number | null)[];
  /** Onde a assinatura começa. `ftyp` do MP4 mora em 4, não em 0. */
  offset: number;
  /** Segunda checagem, quando o magic sozinho não decide (RIFF é WAV, AVI ou WEBP). */
  confirma?: { offset: number; ascii: string };
  /** Extensões que combinam com este conteúdo. */
  extensoes: string[];
}

const A = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));

/**
 * A ordem importa: a primeira que casar vence, então as mais específicas vêm
 * antes. `RIFF` sem confirmação casaria com WAV, AVI e WEBP.
 */
export const ASSINATURAS: Assinatura[] = [
  // ── áudio ────────────────────────────────────────────────────────────────
  {
    tipo: "WAV",
    familia: "audio",
    bytes: A("RIFF"),
    offset: 0,
    confirma: { offset: 8, ascii: "WAVE" },
    extensoes: ["wav", "wave"],
  },
  { tipo: "FLAC", familia: "audio", bytes: A("fLaC"), offset: 0, extensoes: ["flac"] },
  {
    tipo: "OGG",
    familia: "audio",
    bytes: A("OggS"),
    offset: 0,
    extensoes: ["ogg", "oga", "opus", "ogv"],
  },
  {
    tipo: "AIFF",
    familia: "audio",
    bytes: A("FORM"),
    offset: 0,
    confirma: { offset: 8, ascii: "AIFF" },
    extensoes: ["aif", "aiff"],
  },
  { tipo: "AMR", familia: "audio", bytes: A("#!AMR"), offset: 0, extensoes: ["amr"] },
  { tipo: "MP3 (com ID3)", familia: "audio", bytes: A("ID3"), offset: 0, extensoes: ["mp3"] },
  // O frame sync do MP3 são 11 bits em 1: 0xFF seguido de 0xEx ou 0xFx.
  { tipo: "MP3", familia: "audio", bytes: [0xff, null], offset: 0, extensoes: ["mp3", "aac"] },
  {
    tipo: "WMA/ASF",
    familia: "audio",
    bytes: [0x30, 0x26, 0xb2, 0x75],
    offset: 0,
    extensoes: ["wma", "asf", "wmv"],
  },
  { tipo: "MIDI", familia: "audio", bytes: A("MThd"), offset: 0, extensoes: ["mid", "midi"] },

  // ── imagem ───────────────────────────────────────────────────────────────
  {
    tipo: "PNG",
    familia: "imagem",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    offset: 0,
    extensoes: ["png"],
  },
  {
    tipo: "JPEG",
    familia: "imagem",
    bytes: [0xff, 0xd8, 0xff],
    offset: 0,
    extensoes: ["jpg", "jpeg", "jpe"],
  },
  { tipo: "GIF", familia: "imagem", bytes: A("GIF8"), offset: 0, extensoes: ["gif"] },
  {
    tipo: "WEBP",
    familia: "imagem",
    bytes: A("RIFF"),
    offset: 0,
    confirma: { offset: 8, ascii: "WEBP" },
    extensoes: ["webp"],
  },
  { tipo: "BMP", familia: "imagem", bytes: A("BM"), offset: 0, extensoes: ["bmp"] },
  {
    tipo: "TIFF (LE)",
    familia: "imagem",
    bytes: [0x49, 0x49, 0x2a, 0x00],
    offset: 0,
    extensoes: ["tif", "tiff"],
  },
  {
    tipo: "TIFF (BE)",
    familia: "imagem",
    bytes: [0x4d, 0x4d, 0x00, 0x2a],
    offset: 0,
    extensoes: ["tif", "tiff"],
  },
  {
    tipo: "ICO",
    familia: "imagem",
    bytes: [0x00, 0x00, 0x01, 0x00],
    offset: 0,
    extensoes: ["ico"],
  },
  { tipo: "PSD", familia: "imagem", bytes: A("8BPS"), offset: 0, extensoes: ["psd"] },
  { tipo: "HEIC", familia: "imagem", bytes: A("ftyphei"), offset: 4, extensoes: ["heic", "heif"] },
  { tipo: "AVIF", familia: "imagem", bytes: A("ftypavif"), offset: 4, extensoes: ["avif"] },

  // ── vídeo ────────────────────────────────────────────────────────────────
  {
    tipo: "AVI",
    familia: "video",
    bytes: A("RIFF"),
    offset: 0,
    confirma: { offset: 8, ascii: "AVI " },
    extensoes: ["avi"],
  },
  {
    tipo: "MP4/MOV",
    familia: "video",
    bytes: A("ftyp"),
    offset: 4,
    extensoes: ["mp4", "m4v", "mov", "m4a", "m4b"],
  },
  {
    tipo: "Matroska/WebM",
    familia: "video",
    bytes: [0x1a, 0x45, 0xdf, 0xa3],
    offset: 0,
    extensoes: ["mkv", "webm"],
  },
  {
    tipo: "MPEG-PS",
    familia: "video",
    bytes: [0x00, 0x00, 0x01, 0xba],
    offset: 0,
    extensoes: ["mpg", "mpeg", "vob"],
  },
  { tipo: "MPEG-TS", familia: "video", bytes: [0x47], offset: 0, extensoes: ["ts", "m2ts"] },

  // ── comprimido ───────────────────────────────────────────────────────────
  {
    tipo: "ZIP",
    familia: "arquivo-comprimido",
    bytes: [0x50, 0x4b, 0x03, 0x04],
    offset: 0,
    extensoes: ["zip", "docx", "xlsx", "pptx", "odt", "jar", "apk", "epub"],
  },
  {
    tipo: "ZIP (vazio)",
    familia: "arquivo-comprimido",
    bytes: [0x50, 0x4b, 0x05, 0x06],
    offset: 0,
    extensoes: ["zip"],
  },
  {
    tipo: "RAR",
    familia: "arquivo-comprimido",
    bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07],
    offset: 0,
    extensoes: ["rar"],
  },
  {
    tipo: "7z",
    familia: "arquivo-comprimido",
    bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
    offset: 0,
    extensoes: ["7z"],
  },
  {
    tipo: "GZIP",
    familia: "arquivo-comprimido",
    bytes: [0x1f, 0x8b, 0x08],
    offset: 0,
    extensoes: ["gz", "tgz"],
  },
  { tipo: "BZIP2", familia: "arquivo-comprimido", bytes: A("BZh"), offset: 0, extensoes: ["bz2"] },
  {
    tipo: "XZ",
    familia: "arquivo-comprimido",
    bytes: [0xfd, 0x37, 0x7a, 0x58, 0x5a],
    offset: 0,
    extensoes: ["xz"],
  },
  {
    tipo: "ZSTD",
    familia: "arquivo-comprimido",
    bytes: [0x28, 0xb5, 0x2f, 0xfd],
    offset: 0,
    extensoes: ["zst"],
  },

  // ── documento ────────────────────────────────────────────────────────────
  { tipo: "PDF", familia: "documento", bytes: A("%PDF"), offset: 0, extensoes: ["pdf"] },
  { tipo: "RTF", familia: "documento", bytes: A("{\\rtf"), offset: 0, extensoes: ["rtf"] },
  {
    tipo: "Office antigo (OLE)",
    familia: "documento",
    bytes: [0xd0, 0xcf, 0x11, 0xe0],
    offset: 0,
    extensoes: ["doc", "xls", "ppt", "msg"],
  },
  {
    tipo: "SQLite",
    familia: "documento",
    bytes: A("SQLite format 3"),
    offset: 0,
    extensoes: ["db", "sqlite", "sqlite3"],
  },
  { tipo: "ELF", familia: "outro", bytes: [0x7f, 0x45, 0x4c, 0x46], offset: 0, extensoes: [] },
  {
    tipo: "Class Java",
    familia: "outro",
    bytes: [0xca, 0xfe, 0xba, 0xbe],
    offset: 0,
    extensoes: ["class"],
  },
];

export interface Identidade {
  /** O que os bytes dizem. `null` quando nenhuma assinatura casou. */
  tipo: string | null;
  familia: Familia;
  /** A assinatura que casou, para quem quiser o offset. */
  assinatura: Assinatura | null;
  extensao: string;
  /**
   * `true` quando a extensão combina com o conteúdo, ou quando não há como
   * saber (sem assinatura conhecida, sem extensão).
   */
  extensaoBate: boolean;
  /** O `File.type` que o navegador chutou — pela extensão, quase sempre. */
  mimeDeclarado: string | null;
}

/**
 * A regra de casamento, em UM lugar só.
 *
 * `pos` é onde a assinatura começa a ser conferida — 0 para identificar o
 * arquivo, qualquer offset para procurar embutidos. Uma segunda cópia disto
 * dentro do `carve.ts` já custou um bug: lá faltava a guarda de sync do MP3, e
 * a assinatura `[0xFF, curinga]` casou com o `FF D8` de um JPEG colado no fim,
 * reivindicou a foto como "MP3" e o salto de varredura engoliu o achado certo.
 */
export function casaAssinatura(bytes: Uint8Array, pos: number, a: Assinatura): boolean {
  const base = pos + a.offset;
  if (bytes.length < base + a.bytes.length) return false;
  for (let i = 0; i < a.bytes.length; i++) {
    const esperado = a.bytes[i];
    if (esperado === null) continue;
    if (bytes[base + i] !== esperado) return false;
  }
  if (a.confirma) {
    const { offset, ascii } = a.confirma;
    if (bytes.length < pos + offset + ascii.length) return false;
    for (let i = 0; i < ascii.length; i++) {
      if (bytes[pos + offset + i] !== ascii.charCodeAt(i)) return false;
    }
  }
  // O MP3 sem ID3 é o caso mais frouxo da tabela (0xFF + 3 bits): exigir que o
  // segundo byte seja mesmo um sync, senão qualquer 0xFF vira "MP3".
  if (a.tipo === "MP3" && (bytes[pos + 1] & 0xe0) !== 0xe0) return false;
  return true;
}

/**
 * Quantos bytes CONCRETOS a assinatura exige (curinga não conta).
 *
 * Assinatura de 1 ou 2 bytes concretos não serve para procurar arquivo dentro
 * de arquivo: casa por acaso a cada poucos KB. Serve para identificar o arquivo
 * inteiro, onde o offset 0 já é evidência.
 */
export function forcaDaAssinatura(a: Assinatura): number {
  return a.bytes.filter((b) => b !== null).length;
}

export function identificar(
  bytes: Uint8Array,
  nomeDoArquivo = "",
  mime: string | null = null,
): Identidade {
  const extensao = (nomeDoArquivo.split(".").pop() ?? "").toLowerCase();
  const achada = ASSINATURAS.find((a) => casaAssinatura(bytes, 0, a)) ?? null;

  // Sem assinatura conhecida não há como acusar ninguém de mentir.
  const extensaoBate = !achada || extensao === "" ? true : achada.extensoes.includes(extensao);

  return {
    tipo: achada?.tipo ?? null,
    familia: achada?.familia ?? "outro",
    assinatura: achada,
    extensao,
    extensaoBate,
    mimeDeclarado: mime?.length ? mime : null,
  };
}
