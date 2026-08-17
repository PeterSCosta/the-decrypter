/**
 * EXIF, com parser próprio.
 *
 * O plano previa a lib `exifr` (14,8 KB gz) e a crítica derrubou: o que ela
 * acrescenta é MakerNote e cobertura de formatos exóticos — exatamente o que
 * este projeto declarou que não vai decodificar. E ela traz uma armadilha
 * própria: com o padrão `reviveValues`, a string `'2017:08:12 14:03:22'` volta
 * como `Date`, deslocada pelo fuso — três horas de diferença numa string que
 * pode SER a resposta da prova. Aqui o valor volta cru, sempre.
 *
 * O que interessa numa prova cabe em 4 KB: data, GPS, câmera, e a MINIATURA
 * embutida — que muitas vezes é do original NÃO editado, e revela o que foi
 * apagado da imagem grande.
 */

export interface CampoExif {
  tag: string;
  valor: string;
  /** O grupo de onde veio, para a tela agrupar. */
  grupo: "Imagem" | "Câmera" | "Data" | "GPS" | "Outro";
}

export interface Exif {
  campos: CampoExif[];
  /** Coordenada, quando o GPS está preenchido. */
  coordenada: { lat: number; lng: number } | null;
  /** A miniatura embutida, se houver — bytes de um JPEG. */
  miniatura: Uint8Array | null;
}

/** Só as tags que resolvem prova. Uma tabela completa seria peso sem uso. */
const TAGS: Record<number, { nome: string; grupo: CampoExif["grupo"] }> = {
  271: { nome: "Fabricante", grupo: "Câmera" },
  272: { nome: "Modelo", grupo: "Câmera" },
  274: { nome: "Orientação", grupo: "Imagem" },
  282: { nome: "Resolução X", grupo: "Imagem" },
  283: { nome: "Resolução Y", grupo: "Imagem" },
  305: { nome: "Programa", grupo: "Câmera" },
  306: { nome: "Data do arquivo", grupo: "Data" },
  315: { nome: "Autor", grupo: "Outro" },
  33432: { nome: "Direitos", grupo: "Outro" },
  33434: { nome: "Tempo de exposição", grupo: "Câmera" },
  33437: { nome: "Abertura", grupo: "Câmera" },
  34855: { nome: "ISO", grupo: "Câmera" },
  36867: { nome: "Data original", grupo: "Data" },
  36868: { nome: "Data digitalizada", grupo: "Data" },
  37386: { nome: "Distância focal", grupo: "Câmera" },
  37510: { nome: "Comentário", grupo: "Outro" },
  40962: { nome: "Largura (EXIF)", grupo: "Imagem" },
  40963: { nome: "Altura (EXIF)", grupo: "Imagem" },
  42032: { nome: "Dono da câmera", grupo: "Outro" },
  42035: { nome: "Fabricante da lente", grupo: "Câmera" },
  42036: { nome: "Lente", grupo: "Câmera" },
};

const GPS_TAGS: Record<number, string> = {
  1: "latRef",
  2: "lat",
  3: "lngRef",
  4: "lng",
  5: "altRef",
  6: "alt",
  7: "hora",
  29: "data",
};

/** Tamanho em bytes de cada tipo do TIFF. */
const TAMANHO = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];

function leitor(b: Uint8Array, bigEndian: boolean) {
  const u16 = (o: number) => (bigEndian ? (b[o] << 8) | b[o + 1] : b[o] | (b[o + 1] << 8));
  const u32 = (o: number) =>
    bigEndian
      ? b[o] * 0x1000000 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3])
      : b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] * 0x1000000);
  return { u16, u32 };
}

/** Grau/minuto/segundo do EXIF → grau decimal. */
function dms(valores: number[], ref: string): number | null {
  if (valores.length < 3) return null;
  const g = valores[0] + valores[1] / 60 + valores[2] / 3600;
  return ref === "S" || ref === "W" ? -g : g;
}

/** Acha o começo do bloco TIFF: no JPEG ele mora dentro do segmento APP1. */
function acharTiff(b: Uint8Array): number | null {
  // TIFF puro já começa com o cabeçalho.
  if ((b[0] === 0x49 && b[1] === 0x49) || (b[0] === 0x4d && b[1] === 0x4d)) return 0;
  if (!(b[0] === 0xff && b[1] === 0xd8)) return null;
  let p = 2;
  while (p + 4 < b.length) {
    if (b[p] !== 0xff) return null;
    const marcador = b[p + 1];
    const tamanho = (b[p + 2] << 8) | b[p + 3];
    if (marcador === 0xe1) {
      // "Exif\0\0" logo depois do tamanho.
      const assinatura = String.fromCharCode(...b.subarray(p + 4, p + 8));
      if (assinatura === "Exif") return p + 10;
    }
    if (marcador === 0xda) return null; // começou o dado comprimido
    p += 2 + tamanho;
  }
  return null;
}

export function lerExif(bytes: Uint8Array): Exif | null {
  const base = acharTiff(bytes);
  if (base === null || base + 8 > bytes.length) return null;

  const bigEndian = bytes[base] === 0x4d;
  const { u16, u32 } = leitor(bytes, bigEndian);
  if (u16(base + 2) !== 42) return null; // a "resposta" que marca um TIFF

  const campos: CampoExif[] = [];
  const gps: Record<string, string | number[]> = {};
  let miniatura: Uint8Array | null = null;

  const valorDe = (off: number): { texto: string; numeros: number[] } => {
    const tipo = u16(off + 2);
    const quantos = u32(off + 4);
    const tam = (TAMANHO[tipo] ?? 1) * quantos;
    const dados = tam <= 4 ? off + 8 : base + u32(off + 8);
    if (dados + tam > bytes.length) return { texto: "", numeros: [] };

    if (tipo === 2) {
      let s = "";
      for (let i = 0; i < quantos && bytes[dados + i] !== 0; i++) {
        s += String.fromCharCode(bytes[dados + i]);
      }
      // CRU, sem converter para Date: a string exata pode ser a resposta.
      return { texto: s.trim(), numeros: [] };
    }
    const numeros: number[] = [];
    for (let i = 0; i < quantos; i++) {
      const o = dados + i * (TAMANHO[tipo] ?? 1);
      if (tipo === 3) numeros.push(u16(o));
      else if (tipo === 4) numeros.push(u32(o));
      else if (tipo === 5 || tipo === 10) {
        const num = u32(o);
        const den = u32(o + 4);
        numeros.push(den === 0 ? 0 : num / den);
      } else numeros.push(bytes[o]);
    }
    return {
      texto: numeros.map((n) => (Number.isInteger(n) ? n : n.toFixed(4))).join(", "),
      numeros,
    };
  };

  const lerIfd = (offsetIfd: number, dentroDoGps: boolean, ehMiniatura: boolean) => {
    if (offsetIfd + 2 > bytes.length) return 0;
    const n = u16(offsetIfd);
    if (n > 512) return 0; // IFD absurdo = corrompido ou adulterado
    let compMiniatura = 0;
    let offMiniatura = 0;

    for (let i = 0; i < n; i++) {
      const off = offsetIfd + 2 + i * 12;
      if (off + 12 > bytes.length) break;
      const tag = u16(off);
      const { texto, numeros } = valorDe(off);

      if (dentroDoGps) {
        const nome = GPS_TAGS[tag];
        if (nome) gps[nome] = numeros.length ? numeros : texto;
        continue;
      }
      if (ehMiniatura) {
        if (tag === 0x0201) offMiniatura = numeros[0] ?? u32(off + 8);
        if (tag === 0x0202) compMiniatura = numeros[0] ?? u32(off + 8);
      }

      // Ponteiros para sub-IFDs.
      if (tag === 0x8769 || tag === 0xa005) {
        lerIfd(base + (numeros[0] ?? u32(off + 8)), false, false);
        continue;
      }
      if (tag === 0x8825) {
        lerIfd(base + (numeros[0] ?? u32(off + 8)), true, false);
        continue;
      }

      const conhecida = TAGS[tag];
      if (conhecida && texto)
        campos.push({ tag: conhecida.nome, valor: texto, grupo: conhecida.grupo });
    }

    if (ehMiniatura && offMiniatura && compMiniatura) {
      const de = base + offMiniatura;
      if (de + compMiniatura <= bytes.length) miniatura = bytes.slice(de, de + compMiniatura);
    }
    return offsetIfd + 2 + n * 12;
  };

  const ifd0 = base + u32(base + 4);
  const fim = lerIfd(ifd0, false, false);
  // O IFD1 é o da miniatura, e o ponteiro para ele fica logo depois do IFD0.
  if (fim > 0 && fim + 4 <= bytes.length) {
    const ifd1 = u32(fim);
    if (ifd1 > 0) lerIfd(base + ifd1, false, true);
  }

  const lat = Array.isArray(gps.lat) ? dms(gps.lat as number[], String(gps.latRef ?? "N")) : null;
  const lng = Array.isArray(gps.lng) ? dms(gps.lng as number[], String(gps.lngRef ?? "E")) : null;
  if (lat !== null && lng !== null) {
    campos.push({ tag: "Coordenada", valor: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, grupo: "GPS" });
  }
  if (typeof gps.data === "string" && gps.data) {
    campos.push({ tag: "Data do GPS", valor: gps.data, grupo: "GPS" });
  }

  if (!campos.length && !miniatura) return null;
  return { campos, coordenada: lat !== null && lng !== null ? { lat, lng } : null, miniatura };
}
