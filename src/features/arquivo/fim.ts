/**
 * Onde o arquivo DECLARA que termina — e quantos bytes vêm depois disso.
 *
 * Esta é a pergunta que resolve o truque mais barato de todos:
 * `cat foto.jpg >> musica.wav` continua tocando, `cat segredo.zip >> capa.png`
 * continua abrindo. O visualizador para no fim declarado; o resto do arquivo
 * fica ali, invisível, esperando quem souber olhar.
 *
 * Cada formato declara o fim de um jeito, e é por isso que este módulo é uma
 * tabela e não uma heurística. Nada aqui depende do navegador.
 */

export interface FimDeclarado {
  /** Offset logo após o último byte que pertence ao formato. */
  fim: number;
  /** Como se chegou a esse número — vai para a tela, é a evidência. */
  comoSoube: string;
}

const ascii = (b: Uint8Array, off: number, n: number): string => {
  let s = "";
  for (let i = 0; i < n && off + i < b.length; i++) s += String.fromCharCode(b[off + i]);
  return s;
};

const u32le = (b: Uint8Array, o: number) =>
  b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] * 0x1000000);
const u32be = (b: Uint8Array, o: number) =>
  b[o] * 0x1000000 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);

/** Última ocorrência de um padrão — os marcadores de fim moram no fim. */
function ultimoIndiceDe(b: Uint8Array, padrao: number[], apartirDoFim = b.length): number {
  for (let i = Math.min(apartirDoFim, b.length - padrao.length); i >= 0; i--) {
    let bate = true;
    for (let j = 0; j < padrao.length; j++) {
      if (b[i + j] !== padrao[j]) {
        bate = false;
        break;
      }
    }
    if (bate) return i;
  }
  return -1;
}

/**
 * Calcula o fim declarado, quando o formato permite.
 *
 * Devolve `null` quando não há como saber — e isso é uma resposta legítima,
 * não uma falha. Um MP3 sem tag não declara tamanho nenhum: a sequência de
 * frames simplesmente acaba, e qualquer lixo depois é indistinguível de frame
 * corrompido. Fingir um número aqui seria pior que admitir a ignorância.
 */
export function fimDeclarado(bytes: Uint8Array): FimDeclarado | null {
  if (bytes.length < 12) return null;
  const inicio = ascii(bytes, 0, 4);

  // RIFF (WAV, AVI, WEBP): o campo de tamanho conta tudo depois dos 8 primeiros.
  if (inicio === "RIFF") {
    const tamanho = u32le(bytes, 4) + 8;
    if (tamanho > 8 && tamanho <= bytes.length) {
      return {
        fim: tamanho,
        comoSoube: `o cabeçalho RIFF declara ${tamanho.toLocaleString("pt-BR")} bytes`,
      };
    }
    return null;
  }

  // PNG: o chunk IEND é o último por especificação. 8 bytes: tamanho + tipo,
  // mais 4 de CRC.
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") {
    const i = ultimoIndiceDe(bytes, [0x49, 0x45, 0x4e, 0x44]); // "IEND"
    if (i > 0) return { fim: i + 8, comoSoube: "o chunk IEND fecha o PNG" };
    return null;
  }

  // JPEG: FFD9 é o End Of Image.
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const i = ultimoIndiceDe(bytes, [0xff, 0xd9]);
    if (i > 0) return { fim: i + 2, comoSoube: "o marcador FFD9 fecha o JPEG" };
    return null;
  }

  // GIF: o trailer é um único byte 0x3B.
  if (ascii(bytes, 0, 4) === "GIF8") {
    const i = ultimoIndiceDe(bytes, [0x3b]);
    if (i > 0) return { fim: i + 1, comoSoube: "o trailer 0x3B fecha o GIF" };
    return null;
  }

  // ZIP: o End Of Central Directory guarda offset e tamanho do diretório.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const i = ultimoIndiceDe(bytes, [0x50, 0x4b, 0x05, 0x06]);
    if (i > 0 && i + 22 <= bytes.length) {
      const comentario = bytes[i + 20] | (bytes[i + 21] << 8);
      return { fim: i + 22 + comentario, comoSoube: "o EOCD fecha o ZIP" };
    }
    return null;
  }

  // PDF: %%EOF.
  if (ascii(bytes, 0, 4) === "%PDF") {
    const i = ultimoIndiceDe(bytes, [0x25, 0x25, 0x45, 0x4f, 0x46]); // "%%EOF"
    if (i > 0) return { fim: i + 5, comoSoube: "o marcador %%EOF fecha o PDF" };
    return null;
  }

  // ISO-BMFF (MP4/MOV/HEIC): soma dos boxes de topo.
  //
  // ATENÇÃO à armadilha que a crítica do plano nomeou: `size == 0` é LEGAL e
  // significa "vai até o fim do arquivo", e `size == 1` manda ler um tamanho de
  // 64 bits logo depois do tipo. Tratar os dois como tamanho literal faria o
  // parser declarar sobra fantasma do meio do arquivo em diante — um falso
  // positivo grave, porque parece exatamente com um arquivo colado.
  if (ascii(bytes, 4, 4) === "ftyp") {
    let off = 0;
    while (off + 8 <= bytes.length) {
      const tamanho = u32be(bytes, off);
      if (tamanho === 0)
        return {
          fim: bytes.length,
          comoSoube: "o último box do MP4 declara ir até o fim (size 0)",
        };
      if (tamanho === 1) {
        // largesize de 64 bits. O alto quase sempre é 0; se não for, o arquivo
        // passa de 4 GB e não é caso desta bancada.
        if (off + 16 > bytes.length) return null;
        const alto = u32be(bytes, off + 8);
        const baixo = u32be(bytes, off + 12);
        if (alto !== 0) return null;
        off += baixo;
      } else if (tamanho < 8) {
        return null; // tamanho impossível: cabeçalho adulterado
      } else {
        off += tamanho;
      }
      if (off > bytes.length) return null;
    }
    return { fim: off, comoSoube: "a soma dos boxes do MP4 fecha aqui" };
  }

  // MP3 com ID3v1: os últimos 128 bytes.
  if (bytes.length > 128 && ascii(bytes, bytes.length - 128, 3) === "TAG") {
    return { fim: bytes.length, comoSoube: "a tag ID3v1 é o último bloco do MP3" };
  }

  return null;
}

/** Quantos bytes existem depois do fim declarado. Zero quando não há como saber. */
export function sobra(
  bytes: Uint8Array,
): { inicio: number; tamanho: number; comoSoube: string } | null {
  const f = fimDeclarado(bytes);
  if (!f || f.fim >= bytes.length) return null;
  return { inicio: f.fim, tamanho: bytes.length - f.fim, comoSoube: f.comoSoube };
}
