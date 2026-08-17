import { type Recorte, procurarEmbutidos } from "./carve";
import { type MapaDeEntropia, mapearEntropia } from "./entropia";
import { type FimDeclarado, fimDeclarado, sobra } from "./fim";
import { type Identidade, identificar } from "./identidade";
import { type TrechoDeTexto, acharBase64, acharTextos } from "./strings";

/**
 * Um arquivo analisado — e um NÓ, não uma folha.
 *
 * A sobra de um WAV é um arquivo. A entrada de um ZIP é um arquivo. O anexo de
 * um PDF é um arquivo. Se cada um deles voltar ao topo do mesmo funil, uma
 * camada a mais de esconderijo não exige código novo — exige um clique. É por
 * isso que a análise devolve `Recorte[]` com bytes dentro, e não só offsets.
 */
export interface NoDeArquivo {
  nome: string;
  bytes: Uint8Array;
  /** De onde este nó veio. Vazio no arquivo que a pessoa soltou. */
  origem: string;
  profundidade: number;
  analise: Analise;
}

export interface Analise {
  identidade: Identidade;
  fim: FimDeclarado | null;
  sobra: { inicio: number; tamanho: number; comoSoube: string } | null;
  embutidos: Recorte[];
  textos: TrechoDeTexto[];
  base64: TrechoDeTexto[];
  entropia: MapaDeEntropia;
  /** As frases da "primeira olhada", já em ordem de importância. */
  achados: Achado[];
}

export interface Achado {
  /** `forte` vai destacado; `fraco` fica na lista, marcado. */
  peso: "forte" | "medio" | "fraco";
  /**
   * O rótulo do selo, escrito por CADA achado.
   *
   * Um rótulo fixo por peso mentia nos dois sentidos: a frase real "A RESPOSTA
   * E A PONTE DE FERRO", com 29 caracteres, saía marcada como "provável acaso"
   * só por ser curta. Peso é o quanto o achado sobe na lista; o rótulo é o que
   * ele afirma — e as duas coisas não são a mesma.
   */
  rotulo: string;
  titulo: string;
  detalhe: string;
  /** Byte a que este achado se refere — clicar leva o hexdump até lá. */
  offset?: number;
}

/**
 * Profundidade máxima da recursão.
 *
 * Sem teto, a tela vira um explorador infinito e a pessoa se perde no relógio
 * da gincana. Quatro camadas cobrem o que aparece na vida real (arquivo →
 * sobra → zip → entrada).
 */
export const PROFUNDIDADE_MAXIMA = 4;

/**
 * As regiões de amostras de um WAV, para a busca de texto não confundir PCM
 * silencioso com string UTF-16 — ver o cabeçalho de `strings.ts`.
 */
function regioesDeAmostras(bytes: Uint8Array, id: Identidade): [number, number][] {
  if (id.tipo !== "WAV") return [];
  // O chunk `data` vai do fim do próprio cabeçalho até o fim declarado.
  let off = 12;
  while (off + 8 <= bytes.length) {
    const nome = String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
    const tam =
      bytes[off + 4] |
      (bytes[off + 5] << 8) |
      (bytes[off + 6] << 16) |
      (bytes[off + 7] * 0x1000000);
    if (nome === "data") return [[off + 8, Math.min(off + 8 + tam, bytes.length)]];
    if (tam <= 0) break;
    off += 8 + tam + (tam % 2);
  }
  return [];
}

const kb = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : n >= 1024
      ? `${Math.round(n / 1024)} KB`
      : `${n} bytes`;

/**
 * Monta a lista de achados — a "primeira olhada".
 *
 * A ordem é a da importância, e o vocabulário é deliberadamente descritivo. Um
 * achado diz o que ESTÁ no arquivo; quem decide se é a resposta é quem olha.
 */
function montarAchados(a: Omit<Analise, "achados">, regioes: [number, number][]): Achado[] {
  const achados: Achado[] = [];

  // 1. Dois arquivos num só — o caso mais barato e o mais fácil de passar batido.
  const confirmados = a.embutidos.filter((e) => e.forca === "confirmado");
  for (const e of confirmados) {
    achados.push({
      peso: "forte",
      rotulo: "olhe isto",
      titulo: `Este arquivo contém um ${e.tipo} inteiro dentro dele`,
      detalhe: `${kb(e.tamanho ?? 0)} a partir do byte ${e.inicio.toLocaleString("pt-BR")} — ${e.porque}. Dá para abrir e analisar em separado.`,
      offset: e.inicio,
    });
  }

  // 2. Sobra sem arquivo reconhecido: alguma coisa está ali.
  if (a.sobra && !confirmados.some((e) => e.inicio >= (a.sobra?.inicio ?? 0))) {
    achados.push({
      peso: "forte",
      rotulo: "olhe isto",
      titulo: `${kb(a.sobra.tamanho)} depois do fim do arquivo`,
      detalhe: `${a.sobra.comoSoube}, mas o arquivo é maior que isso. O que vem depois não é lido por nenhum tocador ou visualizador.`,
      offset: a.sobra.inicio,
    });
  }

  // 3. A extensão mente.
  if (!a.identidade.extensaoBate) {
    achados.push({
      peso: "forte",
      rotulo: "olhe isto",
      titulo: `A extensão diz ".${a.identidade.extensao}", os bytes dizem ${a.identidade.tipo}`,
      detalhe: "Renomear é o disfarce mais barato que existe. O conteúdo manda.",
      offset: 0,
    });
  }

  // 4. Degraus de entropia.
  for (const d of a.entropia.degraus) {
    achados.push({
      peso: "medio",
      rotulo: "vale ver",
      titulo: `Trecho de ${kb(d.tamanho)} com entropia bem acima do resto`,
      detalhe: d.leitura,
      offset: d.offset,
    });
  }

  // 5. Texto legível.
  //
  // A distinção que importa aqui não é o comprimento, é ONDE o texto está.
  // Dentro das amostras de um WAV, uma onda periódica lida como ASCII produz
  // corridas legíveis de 19 caracteres o dia inteiro — foi o que apareceu na
  // primeira prova real, ao lado da frase plantada de verdade. Fora delas, uma
  // corrida legível é texto que alguém escreveu.
  const notaveis = [...a.textos].sort((x, y) => y.texto.length - x.texto.length).slice(0, 4);
  for (const t of notaveis) {
    const emAmostras = regioes.some(([de, ate]) => t.offset >= de && t.offset < ate);
    achados.push({
      peso: emAmostras ? "fraco" : t.texto.length > 20 ? "medio" : "fraco",
      rotulo: emAmostras ? "pode ser o próprio som" : "texto encontrado",
      titulo: `Texto legível de ${t.texto.length} caracteres`,
      detalhe: emAmostras
        ? `${t.texto.slice(0, 80)} — está DENTRO das amostras de áudio, onde uma onda periódica lida como texto produz isto sozinha.`
        : t.texto.length > 120
          ? `${t.texto.slice(0, 120)}…`
          : t.texto,
      offset: t.offset,
    });
  }

  if (a.base64.length) {
    achados.push({
      peso: "medio",
      rotulo: "vale ver",
      titulo: `${a.base64.length} bloco(s) com cara de Base64`,
      detalhe: "Mande ao Decodificador para ver se decodifica em algo legível.",
      offset: a.base64[0].offset,
    });
  }

  // 6. Os fracos, no fim e marcados — escondê-los seria esconder informação.
  for (const e of a.embutidos.filter((x) => x.forca !== "confirmado")) {
    achados.push({
      peso: "fraco",
      rotulo: "provável acaso",
      titulo: `Assinatura de ${e.tipo} no byte ${e.inicio.toLocaleString("pt-BR")}`,
      detalhe: e.porque,
      offset: e.inicio,
    });
  }

  return achados;
}

/** Analisa um arquivo por inteiro. Puro: entra `Uint8Array`, sai `Analise`. */
export function analisar(bytes: Uint8Array, nome: string, mime: string | null = null): Analise {
  const identidade = identificar(bytes, nome, mime);
  const regioes = regioesDeAmostras(bytes, identidade);

  const parcial: Omit<Analise, "achados"> = {
    identidade,
    fim: fimDeclarado(bytes),
    sobra: sobra(bytes),
    embutidos: procurarEmbutidos(bytes),
    textos: acharTextos(bytes, { regioesDeAmostras: regioes, max: 200 }),
    base64: acharBase64(bytes),
    entropia: mapearEntropia(bytes),
  };

  return { ...parcial, achados: montarAchados(parcial, regioes) };
}

/** Cria o nó raiz a partir do que a pessoa soltou. */
export function noRaiz(bytes: Uint8Array, nome: string, mime: string | null): NoDeArquivo {
  return { nome, bytes, origem: "", profundidade: 0, analise: analisar(bytes, nome, mime) };
}

/**
 * Extensão convencional de cada tipo recortado.
 *
 * Existe porque o nome do nó SEM ponto criava um achado falso e forte: sem
 * extensão, `nome.split(".").pop()` devolve o nome inteiro, e a primeira olhada
 * anunciava «a extensão diz ".jpeg-em-176444", os bytes dizem JPEG» no topo da
 * lista. Um recorte nasce do próprio tipo detectado — a extensão dele nunca
 * pode divergir do conteúdo.
 */
const EXTENSAO_DO_TIPO: Record<string, string> = {
  JPEG: "jpg",
  PNG: "png",
  GIF: "gif",
  BMP: "bmp",
  WEBP: "webp",
  PDF: "pdf",
  ZIP: "zip",
  RAR: "rar",
  "7z": "7z",
  GZIP: "gz",
  BZIP2: "bz2",
  XZ: "xz",
  WAV: "wav",
  MP3: "mp3",
  FLAC: "flac",
  OGG: "ogg",
  SQLite: "db",
};

/** Um recorte vira nó novo, um nível abaixo. */
export function noDeRecorte(pai: NoDeArquivo, r: Recorte): NoDeArquivo | null {
  if (!r.bytes || pai.profundidade + 1 >= PROFUNDIDADE_MAXIMA) return null;
  const base = r.tipo.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const ext = EXTENSAO_DO_TIPO[r.tipo];
  const nome = `${base}-em-${r.inicio}${ext ? `.${ext}` : ""}`;
  return {
    nome,
    bytes: r.bytes,
    origem: `${r.tipo} no byte ${r.inicio.toLocaleString("pt-BR")} de ${pai.nome}`,
    profundidade: pai.profundidade + 1,
    analise: analisar(r.bytes, nome, null),
  };
}
