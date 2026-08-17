/**
 * O CATÁLOGO de um ZIP — os nomes, não o conteúdo.
 *
 * Um `.docx`, `.xlsx`, `.pptx`, `.odt`, `.epub` e `.jar` são todos ZIP. Abrir o
 * conteúdo exigiria descompactar (deflate, ~3 KB de código); listar o catálogo
 * não exige nada — e é o catálogo que denuncia.
 *
 * A crítica do plano nomeou o que se perde ao ler só o conteúdo: o COMENTÁRIO
 * do EOCD (campo de tamanho livre que sobrevive a qualquer extrator), o
 * comentário por entrada, os nomes de caminho, a ORDEM das entradas, e — o mais
 * interessante — a DIVERGÊNCIA entre o cabeçalho local e o diretório central.
 * Dois nomes para a mesma entrada fazem extratores diferentes verem arquivos
 * diferentes, e é um esconderijo que quase nenhuma ferramenta reporta.
 */

export interface EntradaZip {
  nome: string;
  tamanho: number;
  comprimido: number;
  /** Data e hora no formato DOS que o ZIP guarda. */
  modificado: string | null;
  /** Comentário da própria entrada — campo livre, quase sempre vazio. */
  comentario: string;
  /** `true` quando o cabeçalho local declara um nome diferente do central. */
  nomeDivergente: string | null;
  /** Entrada cifrada (bit 0 do flag). */
  cifrada: boolean;
  metodo: string;
  offsetLocal: number;
}

export interface LeituraZip {
  entradas: EntradaZip[];
  /** Comentário do arquivo inteiro — o canal de tamanho livre do formato. */
  comentario: string;
  /** O que merece o olho, em pt-BR. */
  observacoes: string[];
}

const ascii = (b: Uint8Array, off: number, n: number) => {
  let s = "";
  for (let i = 0; i < n && off + i < b.length; i++) s += String.fromCharCode(b[off + i]);
  return s;
};
const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) =>
  b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] * 0x1000000);

const METODOS: Record<number, string> = {
  0: "sem compressão",
  8: "deflate",
  9: "deflate64",
  12: "bzip2",
  14: "LZMA",
  93: "zstd",
  95: "xz",
  99: "AES",
};

/** Data/hora no formato DOS: dois campos de 16 bits. */
function dataDos(data: number, hora: number): string | null {
  const dia = data & 0x1f;
  const mes = (data >> 5) & 0x0f;
  const ano = ((data >> 9) & 0x7f) + 1980;
  if (!dia || !mes) return null;
  const h = (hora >> 11) & 0x1f;
  const m = (hora >> 5) & 0x3f;
  const s = (hora & 0x1f) * 2;
  const dd = (n: number) => String(n).padStart(2, "0");
  return `${dd(dia)}/${dd(mes)}/${ano} ${dd(h)}:${dd(m)}:${dd(s)}`;
}

export function lerZip(b: Uint8Array): LeituraZip | null {
  // O EOCD mora no fim, e o comentário vem depois dele.
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) {
    if (b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 0x05 && b[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const quantas = u16(b, eocd + 10);
  const inicioCentral = u32(b, eocd + 16);
  const tamComentario = u16(b, eocd + 20);
  const comentario = ascii(b, eocd + 22, tamComentario);

  const entradas: EntradaZip[] = [];
  let off = inicioCentral;
  for (let i = 0; i < quantas && off + 46 <= b.length; i++) {
    if (u32(b, off) !== 0x02014b50) break;
    const flags = u16(b, off + 8);
    const metodo = u16(b, off + 10);
    const tamNome = u16(b, off + 28);
    const tamExtra = u16(b, off + 30);
    const tamCom = u16(b, off + 32);
    const offLocal = u32(b, off + 42);
    const nome = ascii(b, off + 46, tamNome);

    // O cabeçalho LOCAL repete o nome. Quando os dois divergem, extratores
    // diferentes veem arquivos diferentes — e é um esconderijo raro de reportar.
    let nomeDivergente: string | null = null;
    if (offLocal + 30 <= b.length && u32(b, offLocal) === 0x04034b50) {
      const tamNomeLocal = u16(b, offLocal + 26);
      const nomeLocal = ascii(b, offLocal + 30, tamNomeLocal);
      if (nomeLocal !== nome) nomeDivergente = nomeLocal;
    }

    entradas.push({
      nome,
      tamanho: u32(b, off + 24),
      comprimido: u32(b, off + 20),
      modificado: dataDos(u16(b, off + 14), u16(b, off + 12)),
      comentario: ascii(b, off + 46 + tamNome + tamExtra, tamCom),
      nomeDivergente,
      cifrada: (flags & 1) === 1,
      metodo: METODOS[metodo] ?? `método ${metodo}`,
      offsetLocal: offLocal,
    });
    off += 46 + tamNome + tamExtra + tamCom;
  }

  const observacoes: string[] = [];
  if (comentario.trim()) {
    observacoes.push(
      `O ZIP tem um comentário de arquivo com ${comentario.length} caracteres. É um campo de texto livre que sobrevive a qualquer extrator e que quase nenhuma ferramenta mostra.`,
    );
  }
  const divergentes = entradas.filter((e) => e.nomeDivergente);
  if (divergentes.length) {
    observacoes.push(
      `${divergentes.length} entrada(s) declaram um nome no cabeçalho local e OUTRO no diretório central. Extratores diferentes veem arquivos diferentes — é esconderijo, não corrupção.`,
    );
  }
  const cifradas = entradas.filter((e) => e.cifrada);
  if (cifradas.length) {
    observacoes.push(
      `${cifradas.length} entrada(s) estão protegidas por senha. O nome continua legível; o conteúdo, não.`,
    );
  }
  const comComentario = entradas.filter((e) => e.comentario.trim());
  if (comComentario.length) {
    observacoes.push(`${comComentario.length} entrada(s) têm comentário próprio.`);
  }
  // Restos de macOS entregam o sistema de origem, e às vezes um arquivo a mais.
  if (entradas.some((e) => e.nome.startsWith("__MACOSX/"))) {
    observacoes.push(
      "Há entradas `__MACOSX/`: o ZIP foi feito no Finder do macOS, e elas carregam metadados do sistema.",
    );
  }
  if (entradas.some((e) => e.nome.includes("..") || e.nome.startsWith("/"))) {
    observacoes.push(
      "Há caminho com `..` ou absoluto — além de suspeito, é a assinatura do zip-slip.",
    );
  }

  return { entradas, comentario, observacoes };
}

/** Um ZIP que é documento do Office traz estes nomes. */
export function ehOoxml(l: LeituraZip): "word" | "excel" | "powerpoint" | null {
  const nomes = l.entradas.map((e) => e.nome);
  if (nomes.some((n) => n.startsWith("word/"))) return "word";
  if (nomes.some((n) => n.startsWith("xl/"))) return "excel";
  if (nomes.some((n) => n.startsWith("ppt/"))) return "powerpoint";
  return null;
}

/**
 * As entradas que NÃO deveriam estar num OOXML.
 *
 * Um `.docx` tem uma estrutura previsível. Um arquivo solto na raiz, ou uma
 * mídia com nome fora do padrão, é o esconderijo mais fácil de usar: continua
 * abrindo no Word e ninguém repara.
 */
export function estranhasNoOoxml(l: LeituraZip): EntradaZip[] {
  const PREFIXOS = ["word/", "xl/", "ppt/", "docProps/", "_rels/", "customXml/", "[Content_Types]"];
  return l.entradas.filter((e) => !PREFIXOS.some((p) => e.nome.startsWith(p)));
}
