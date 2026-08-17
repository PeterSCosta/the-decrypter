import { type FichaDoArquivo, analisarContainer } from "./container";

/**
 * Carregar um arquivo de áudio — a única parte desta feature que toca o
 * navegador, e a que esconde duas armadilhas MEDIDAS que falham em silêncio.
 *
 * ── ARMADILHA 1: `decodeAudioData` DESTRÓI o buffer de entrada ──────────────
 * Ele faz *detach* do `ArrayBuffer` que recebe. Medido: 176.444 bytes entram,
 * 0 bytes sobram. Quem tentar ler os bytes crus DEPOIS de decodificar recebe
 * comprimento zero — sem erro, sem exceção, passando por TypeScript e por
 * Biome. E é justamente dos bytes crus que saem o LSB, os chunks RIFF, o zip
 * colado no fim e as tags. Toda a camada de esteganografia morreria muda.
 *
 * Defesa: copiar os bytes ANTES, e decodificar a cópia.
 *
 * ── ARMADILHA 2: `decodeAudioData` REAMOSTRA em silêncio ────────────────────
 * O áudio sai na taxa do `AudioContext`, não na do arquivo — e
 * `AudioBuffer.sampleRate` devolve a taxa do CONTEXTO, então não há API
 * nenhuma que revele a original. Um arquivo de 96 kHz aberto num contexto de
 * 48 kHz perde tudo acima de 24 kHz: uma portadora ultrassônica de 30 kHz
 * simplesmente não existe mais, e o espectrograma mostra a faixa alta vazia,
 * com toda a cara de estar correta.
 *
 * Defesa dupla: o `AudioContext` é criado na taxa que o CABEÇALHO declara (que
 * `container.ts` lê dos bytes crus), e quando as duas divergem a interface
 * avisa em vez de deixar quem procura concluir que não há nada lá.
 */

export interface AudioCarregado {
  nome: string;
  /** Os bytes ORIGINAIS, intactos — a base de toda análise de esteganografia. */
  bytes: Uint8Array;
  /** O que os bytes contam sobre o arquivo, antes de qualquer decodificação. */
  ficha: FichaDoArquivo;
  /** Um `Float32Array` por canal. */
  canais: Float32Array[];
  /** A taxa em que as amostras acima estão — a do contexto, não necessariamente a do arquivo. */
  taxa: number;
  duracao: number;
  /**
   * Preenchido quando o cabeçalho declara uma taxa e a decodificação entregou
   * outra. Silenciar isso é esconder que a faixa alta foi jogada fora.
   */
  avisoDeReamostragem: string | null;
}

type ComWebkit = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
  webkitOfflineAudioContext?: typeof OfflineAudioContext;
};

/** Limites que o `OfflineAudioContext` aceita. Fora disso ele lança. */
const TAXA_MINIMA = 8000;
const TAXA_MAXIMA = 96000;

export async function carregarAudio(arquivo: File | Blob, nome: string): Promise<AudioCarregado> {
  const original = new Uint8Array(await arquivo.arrayBuffer());
  const ficha = analisarContainer(original, nome);

  // A CÓPIA é o que vai para o decodificador; `original` fica intacto.
  const paraDecodificar = original.slice().buffer;

  // Preferir a taxa declarada evita a reamostragem silenciosa. Fora da faixa
  // aceita, cai no padrão do dispositivo — e o aviso registra o que houve.
  const declarada = ficha.taxaDeclarada;
  const taxaPedida =
    declarada && declarada >= TAXA_MINIMA && declarada <= TAXA_MAXIMA ? declarada : undefined;

  const g = globalThis as ComWebkit;
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  if (!Ctor) throw new Error("Este navegador não tem Web Audio.");

  const ctx = new Ctor(taxaPedida ? { sampleRate: taxaPedida } : undefined);
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(paraDecodificar);
  } finally {
    // Um AudioContext aberto por arquivo esgota o limite do navegador (~6).
    await ctx.close().catch(() => {});
  }

  const canais: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) canais.push(buffer.getChannelData(c));

  let aviso: string | null = null;
  if (declarada && declarada !== buffer.sampleRate) {
    const hz = (n: number) => Math.round(n).toLocaleString("pt-BR");
    aviso = `O arquivo declara ${hz(declarada)} Hz, mas foi decodificado a ${hz(buffer.sampleRate)} Hz. Tudo acima de ${hz(buffer.sampleRate / 2)} Hz foi descartado na conversão — se havia portadora ali, ela não aparece mais no espectrograma.`;
  }

  return {
    nome,
    bytes: original,
    ficha,
    canais,
    taxa: buffer.sampleRate,
    duracao: buffer.duration,
    avisoDeReamostragem: aviso,
  };
}

/**
 * Escreve um WAV PCM 16 bits a partir de canais em float.
 *
 * Existe porque **nenhum navegador grava WAV**: o `MediaRecorder` só entrega
 * webm/ogg/mp4. Sem isto não há como baixar o canal de diferença, o trecho
 * isolado ou o áudio invertido para abrir noutra ferramenta — e não há como
 * gerar as fixtures sintéticas que testam os detectores.
 */
export function montarWavBytes(canais: Float32Array[], taxa: number): Uint8Array {
  const nCanais = canais.length;
  const nAmostras = canais[0]?.length ?? 0;
  const bytesDeDados = nAmostras * nCanais * 2;
  const b = new ArrayBuffer(44 + bytesDeDados);
  const dv = new DataView(b);

  const ascii = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };

  ascii(0, "RIFF");
  dv.setUint32(4, 36 + bytesDeDados, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); // PCM
  dv.setUint16(22, nCanais, true);
  dv.setUint32(24, taxa, true);
  dv.setUint32(28, taxa * nCanais * 2, true); // bytes por segundo
  dv.setUint16(32, nCanais * 2, true); // alinhamento do bloco
  dv.setUint16(34, 16, true);
  ascii(36, "data");
  dv.setUint32(40, bytesDeDados, true);

  let off = 44;
  for (let i = 0; i < nAmostras; i++) {
    for (let c = 0; c < nCanais; c++) {
      // Saturar em vez de deixar estourar: um valor acima de 1 daria a volta e
      // viraria estalo, que num canal de diferença amplificado é a regra.
      const v = Math.max(-1, Math.min(1, canais[c][i]));
      dv.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      off += 2;
    }
  }
  return new Uint8Array(b);
}

/**
 * O mesmo WAV, embrulhado para download.
 *
 * Fica separado de `montarWavBytes` de propósito: o `Blob` é do navegador e não
 * tem `arrayBuffer()` no ambiente de teste, então a lógica que importa — o
 * cabeçalho RIFF e a saturação — mora na função pura e é testada de verdade.
 */
export function montarWav(canais: Float32Array[], taxa: number): Blob {
  return new Blob([montarWavBytes(canais, taxa) as unknown as BlobPart], { type: "audio/wav" });
}
