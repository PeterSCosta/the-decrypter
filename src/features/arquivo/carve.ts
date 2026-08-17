import { fimDeclarado, sobra } from "./fim";
import { ASSINATURAS, type Assinatura, casaAssinatura, forcaDaAssinatura } from "./identidade";

/**
 * Carving: achar um arquivo dentro de outro e RECORTÁ-LO.
 *
 * Achar não basta — o que resolve a prova é poder abrir. Este módulo devolve os
 * bytes recortados, prontos para virar um nó novo na árvore (e para baixar).
 *
 * A disciplina aqui é a mesma que já custou uma correção no `audio/container.ts`:
 * uma assinatura de 3 ou 4 bytes casa por acaso dentro de qualquer massa de
 * dados. Então um candidato só vira ACHADO depois de passar por validação
 * estrutural — e o que não passa não some, aparece como fraco.
 */

export type ForcaDoAchado = "confirmado" | "na-sobra" | "fraco";

export interface Recorte {
  tipo: string;
  inicio: number;
  /** Tamanho recortado; `null` quando não foi possível delimitar o fim. */
  tamanho: number | null;
  forca: ForcaDoAchado;
  /** Por que este achado tem essa força — vai para a tela. */
  porque: string;
  /** Os bytes, quando deu para delimitar. */
  bytes: Uint8Array | null;
}

/**
 * Percorre os segmentos de um JPEG a partir do SOI e devolve onde ele termina.
 *
 * PROCURAR O TERMINADOR NÃO É VALIDAR — e a primeira versão desta função fazia
 * exatamente isso, com consequência concreta: num WAV com uma foto colada no
 * fim, um `FF D8 FF` casual dentro das amostras "fechava" no `FF D9` da foto
 * real, 136 KB adiante, e virava um JPEG confirmado que não existe. O teste
 * pegou porque exige o offset certo, não só que algo tenha sido achado.
 *
 * Caminhar pela estrutura é o que separa os dois casos: cada segmento declara o
 * próprio tamanho, e um começo falso descarrila em um ou dois saltos.
 */
function fimDoJpeg(b: Uint8Array, inicio: number): number | null {
  // Depois do SOI (FFD8) vem sempre um marcador, não dado solto.
  let p = inicio + 2;
  let segmentos = 0;
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff) return null; // descarrilou: não era JPEG
    const marcador = b[p + 1];
    // Preenchimento: sequências de FF são legais entre segmentos.
    if (marcador === 0xff) {
      p++;
      continue;
    }
    // Marcadores sem carga.
    if (marcador === 0xd8 || (marcador >= 0xd0 && marcador <= 0xd9)) {
      if (marcador === 0xd9) return segmentos >= 2 ? p + 2 - inicio : null;
      p += 2;
      continue;
    }
    const tamanho = (b[p + 2] << 8) | b[p + 3];
    if (tamanho < 2) return null;
    segmentos++;
    // SOS: daqui em diante é dado comprimido, e só resta procurar o EOI —
    // pulando os marcadores de reinício, que são FFD0-FFD7.
    if (marcador === 0xda) {
      let q = p + 2 + tamanho;
      while (q + 1 < b.length) {
        if (b[q] === 0xff && b[q + 1] === 0xd9) return q + 2 - inicio;
        if (b[q] === 0xff && b[q + 1] !== 0x00 && !(b[q + 1] >= 0xd0 && b[q + 1] <= 0xd7)) {
          // Outro marcador no meio do fluxo: JPEG multi-scan, segue.
        }
        q++;
      }
      return null; // truncado
    }
    p += 2 + tamanho;
  }
  return null;
}

/** Percorre os chunks de um PNG até o IEND. Cada chunk declara o próprio tamanho. */
function fimDoPng(b: Uint8Array, inicio: number): number | null {
  let p = inicio + 8; // assinatura
  let chunks = 0;
  while (p + 8 <= b.length) {
    const tamanho = b[p] * 0x1000000 + ((b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]);
    if (tamanho < 0 || p + 12 + tamanho > b.length) return null;
    const tipo = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
    if (!/^[A-Za-z]{4}$/.test(tipo)) return null;
    chunks++;
    p += 12 + tamanho; // tamanho + tipo + dados + CRC
    if (tipo === "IEND") return chunks >= 2 ? p - inicio : null;
  }
  return null;
}

/**
 * Valida um candidato tentando delimitá-lo como arquivo de verdade.
 *
 * Formato com estrutura navegável ganha um caminhador próprio. Para os demais,
 * o `fimDeclarado` só é aceito quando o candidato está NA SOBRA — porque ali o
 * contexto já é evidência independente, e a busca não pode confundir o
 * terminador de outro arquivo com o deste.
 */
function delimitar(
  bytes: Uint8Array,
  inicio: number,
  a: Assinatura,
  naSobra: boolean,
): number | null {
  // Assinaturas ancoradas fora do byte 0 (o `ftyp` do MP4) precisam do contexto
  // anterior; recortar a partir do magic quebraria a estrutura.
  if (a.offset !== 0) return null;

  if (a.tipo === "JPEG") return fimDoJpeg(bytes, inicio);
  if (a.tipo === "PNG") return fimDoPng(bytes, inicio);

  if (!naSobra) return null;
  const f = fimDeclarado(bytes.subarray(inicio));
  if (!f || f.fim < 16 || f.fim > bytes.length - inicio) return null;
  return f.fim;
}

/**
 * Mínimo de bytes concretos para uma assinatura entrar no carving.
 *
 * Com 3, o MP3 sem tag (`FF` + 3 bits) e o MPEG-TS (um único `0x47`) ficam de
 * fora — e é o que se quer: eles casam a cada poucos KB em qualquer arquivo, e
 * o único efeito de mantê-los seria reivindicar arquivos alheios.
 */
const FORCA_MINIMA_PARA_CARVING = 3;

/** Tamanho mínimo para um recorte valer a pena virar nó. */
export const RECORTE_MINIMO = 512;

/**
 * Varre o arquivo procurando outros arquivos dentro dele.
 *
 * `maxPorTipo` existe porque um JPEG contém miniaturas que também são JPEG:
 * sem limite, um arquivo legítimo produziria uma lista longa e inútil.
 */
export function procurarEmbutidos(
  bytes: Uint8Array,
  opcoes: { maxPorTipo?: number } = {},
): Recorte[] {
  const maxPorTipo = opcoes.maxPorTipo ?? 3;
  // Cota SEPARADA para o fraco. Sem isso, os casamentos por acaso dentro das
  // amostras esgotavam o orçamento do tipo e a varredura nunca chegava à sobra
  // — ou seja, o achado que importa era engolido pelo ruído que ele deveria
  // superar.
  const maxFracos = 2;
  const s = sobra(bytes);
  const inicioDaSobra = s?.inicio ?? null;

  const achados: Recorte[] = [];
  const contagem = new Map<string, number>();
  const fracos = new Map<string, number>();

  /**
   * Índice das assinaturas pelo PRIMEIRO byte.
   *
   * Sem ele a varredura testa toda assinatura em toda posição: 35 × 4,5 milhões
   * = 157 milhões de comparações, medidas em 7,9 s. Num arquivo de 50 MB isso
   * seria um minuto e meio de interface parada. Com o índice, a esmagadora
   * maioria das posições custa uma consulta a um Map e segue.
   */
  const porPrimeiroByte = new Map<number, Assinatura[]>();
  for (const a of ASSINATURAS) {
    if (a.offset !== 0) continue;
    if (forcaDaAssinatura(a) < FORCA_MINIMA_PARA_CARVING) continue;
    const primeiro = a.bytes[0];
    if (primeiro === null) continue; // curinga no byte 0 não é indexável
    const lista = porPrimeiroByte.get(primeiro) ?? [];
    lista.push(a);
    porPrimeiroByte.set(primeiro, lista);
  }

  // Começa em 1 para não acusar o próprio cabeçalho do arquivo.
  for (let i = 1; i < bytes.length; i++) {
    const candidatas = porPrimeiroByte.get(bytes[i]);
    if (candidatas === undefined) continue;
    for (const a of candidatas) {
      if ((contagem.get(a.tipo) ?? 0) >= maxPorTipo) continue;
      if (!casaAssinatura(bytes, i, a)) continue;

      const naSobra = inicioDaSobra !== null && i >= inicioDaSobra;
      const tamanho = delimitar(bytes, i, a, naSobra);

      let forca: ForcaDoAchado;
      let porque: string;
      if (tamanho !== null && naSobra) {
        forca = "confirmado";
        porque = "está depois do fim declarado do arquivo E fecha a própria estrutura";
      } else if (tamanho !== null) {
        forca = "confirmado";
        porque = "fecha a própria estrutura (começo e fim casam)";
      } else if (naSobra) {
        forca = "na-sobra";
        porque =
          "está depois do fim declarado, mas a estrutura não fecha — pode estar truncado ou cifrado";
      } else {
        forca = "fraco";
        porque = "assinatura casou no meio dos dados e a estrutura não fecha — provavelmente acaso";
      }

      // O fraco não entra na lista principal se for pequeno demais para ser
      // arquivo: aí é só coincidência de bytes, e poluir a tela com isso é o
      // oposto de ajudar.
      if (forca === "fraco") {
        const jaFracos = fracos.get(a.tipo) ?? 0;
        if (jaFracos >= maxFracos) continue;
        fracos.set(a.tipo, jaFracos + 1);
        achados.push({ tipo: a.tipo, inicio: i, tamanho: null, forca, porque, bytes: null });
        continue;
      }

      contagem.set(a.tipo, (contagem.get(a.tipo) ?? 0) + 1);
      achados.push({
        tipo: a.tipo,
        inicio: i,
        tamanho,
        forca,
        porque,
        // `slice` e não `subarray`: o recorte precisa ser dono dos próprios
        // bytes para virar um nó independente e para baixar.
        bytes: tamanho !== null ? bytes.slice(i, i + tamanho) : null,
      });
      // Pular o arquivo recortado evita achar as miniaturas dentro dele.
      if (tamanho !== null) i += tamanho - 1;
    }
  }

  // Confirmados primeiro; entre iguais, o maior.
  const peso: Record<ForcaDoAchado, number> = { confirmado: 0, "na-sobra": 1, fraco: 2 };
  return achados.sort(
    (x, y) => peso[x.forca] - peso[y.forca] || (y.tamanho ?? 0) - (x.tamanho ?? 0),
  );
}
