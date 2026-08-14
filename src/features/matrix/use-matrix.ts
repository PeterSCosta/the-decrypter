import { useCallback, useMemo, useRef, useState } from "react";
import {
  type CellRef,
  type Matrix,
  type MatrixFormat,
  type OrdemLeitura,
  type ParseIssue,
  cellLabel,
  cluesCols,
  cluesRows,
  crop,
  emptyMatrix,
  makeDestination,
  markedRefs,
  marksPerCol,
  marksPerRow,
  matrixFromTexts,
  mirrorH,
  mirrorV,
  parseColLabel,
  parseMatrix,
  readingOrder,
  resize,
  rotate,
  setCell,
  toContiguous,
  toMarkdown,
  toText,
  transpose,
  trimEmpty,
} from "./matrix";
import { type Diagnostico, type ResultadoQr, decodeQr, diagnosticar } from "./qr";
import { baixarPng } from "./render";
import {
  type ModoComposicao,
  type Rule,
  type TipoAcao,
  applyRules,
  createRule,
  validateRule,
} from "./rules";

/**
 * O estado da aba Matriz.
 *
 * Duas grades convivem, e a divisão de trabalho é a coisa mais importante daqui:
 * a ORIGEM guarda o conteúdo (é ela que as condições leem) e o DESTINO guarda a
 * pintura (é nele que as ações escrevem). Quem cola do Excel cola na origem;
 * quem pinta à mão pinta o destino.
 *
 * O DESTINO É DERIVADO, e isso é deliberado: `destino = regras(base)`, onde a
 * base é a pintura à mão. Não existe um destino "de verdade" guardado em algum
 * lugar que as regras sobrescrevem — mexer numa regra nunca destrói pintura,
 * porque a pintura mora numa matriz separada (`pintura`) e a derivação refaz
 * tudo do zero a cada mudança. Sem isso, editar uma condição depois de meia
 * hora pintando seria roleta-russa.
 *
 * O interruptor `limparAoRecalcular` é pedido textual do dono ("opcional limpar
 * ou não") e vale exatamente o que diz: ligado, as regras partem de um destino
 * limpo (a pintura à mão fica de fora, e volta assim que ele for desligado);
 * desligado, as regras se somam ao que está pintado — que é como se aplicam
 * regras em camadas por cima do trabalho manual.
 */

/** Teto de células desenhadas. Acima disto a tela vira 6 mil botões e trava. */
export const MAX_RENDER = 6_000;
/** Teto de lado que a interface oferece. O motor aceita mais; a TELA não aguenta. */
export const MAX_LADO_UI = 128;

/** Quantas ações cabem na pilha de desfazer. */
const MAX_HISTORICO = 60;
/** Arrastar pintando gera um evento por célula; um traço inteiro é UM desfazer. */
const COALESCE_MS = 700;

export type TransformId =
  | "transpor"
  | "girar-90"
  | "girar-270"
  | "espelhar-h"
  | "espelhar-v"
  | "aparar";

export interface Cursor {
  row: number;
  col: number;
}

interface Snapshot {
  origem: Matrix;
  pintura: Matrix;
}

// ------------------------------------------------------- lista de células ---

export interface BlocosDeCelulas {
  /** Um bloco por linha do texto colado — as 8 runas de 2019 vêm assim. */
  blocos: CellRef[][];
  linhas: number;
  colunas: number;
  /** Pedaços que não são referência de célula, para a interface reclamar deles. */
  invalidos: string[];
}

const REF_LETRA = /^([A-Za-z]+)(\d+)$/;
const REF_RC = /^[Rr](\d+)[Cc](\d+)$/;
const REF_PAR = /^(\d+),(\d+)$/;

/**
 * Lê UMA referência de célula nas grafias que o acervo usa: `A1` (as runas de
 * 2019 e a Batalha Naval de 2022), `R3C2` e `3,2` (linha,coluna), em qualquer
 * caixa. Devolve 0-based.
 */
export function parseCellRef(token: string): CellRef | null {
  const t = token.trim();
  if (t === "") return null;

  const par = REF_PAR.exec(t);
  if (par) {
    const r = Number(par[1]) - 1;
    const c = Number(par[2]) - 1;
    return r >= 0 && c >= 0 ? { r, c } : null;
  }

  const rc = REF_RC.exec(t);
  if (rc) {
    const r = Number(rc[1]) - 1;
    const c = Number(rc[2]) - 1;
    return r >= 0 && c >= 0 ? { r, c } : null;
  }

  const letra = REF_LETRA.exec(t);
  if (letra) {
    const c = parseColLabel(letra[1]);
    const r = Number(letra[2]) - 1;
    if (c === null || r < 0) return null;
    return { r, c };
  }
  return null;
}

/**
 * Lê a lista colada. O separador é livre — barra, espaço, vírgula, ponto e
 * vírgula ou quebra de linha — porque o enunciado de 2019 usa barra e o de 2022
 * usa espaço, e ninguém converte isso à mão às 3 da manhã.
 *
 * Cada LINHA é um bloco: colar as 8 listas de uma vez é a diferença entre
 * economizar 30 segundos e economizar 20 minutos.
 */
export function parseCellBlocks(texto: string): BlocosDeCelulas {
  const blocos: CellRef[][] = [];
  const invalidos: string[] = [];
  let linhas = 0;
  let colunas = 0;

  for (const linha of texto.split(/\r?\n/)) {
    if (linha.trim() === "") continue;
    const refs: CellRef[] = [];
    for (const bruto of linha.split(/[\s/|;]+/)) {
      if (bruto === "") continue;
      // `3,2` é linha,coluna; `A1,B1` usa a vírgula como separador. Testar o par
      // primeiro resolve a ambiguidade sem perguntar nada a quem colou.
      const pedacos = REF_PAR.test(bruto) ? [bruto] : bruto.split(",");
      for (const p of pedacos) {
        if (p === "") continue;
        const ref = parseCellRef(p);
        if (ref) {
          refs.push(ref);
          linhas = Math.max(linhas, ref.r + 1);
          colunas = Math.max(colunas, ref.c + 1);
        } else {
          invalidos.push(p);
        }
      }
    }
    if (refs.length > 0) blocos.push(refs);
  }

  return { blocos, linhas, colunas, invalidos };
}

/** Faixa `A1:C5` (ou `A1 C5`) → retângulo 0-based. */
export function parseFaixa(
  texto: string,
): { r0: number; c0: number; rows: number; cols: number } | null {
  const partes = texto.split(/[:\s-]+/).filter(Boolean);
  if (partes.length !== 2) return null;
  const a = parseCellRef(partes[0]);
  const b = parseCellRef(partes[1]);
  if (!a || !b) return null;
  return {
    r0: Math.min(a.r, b.r),
    c0: Math.min(a.c, b.c),
    rows: Math.abs(a.r - b.r) + 1,
    cols: Math.abs(a.c - b.c) + 1,
  };
}

// ---------------------------------------------------- leitura por blocos ---

/**
 * O fecho da cadeia: a grade pintada virando caractere. Duas provas do acervo,
 * quatro anos e dois formatos de entrada diferentes (as runas de ITC 2019 e o
 * nonograma de ITC 2023, que cumpriu 1/4) terminam na MESMA fonte 3×5 de
 * segmentos.
 *
 * A tabela de glifos vive aqui por ora porque nenhum módulo do motor a reivindica
 * — quando existir um `alphabets.ts`, isto migra inteiro para lá sem mexer na
 * tela. O `6` e o `8` estão conferidos contra o acervo; os outros seguem a
 * convenção de sete segmentos, e o `3` ganha a variante de miolo curto que a
 * prova de 2019 usa. Para as fontes que não são exatamente estas, o casamento
 * por distância de Hamming devolve o candidato mais próximo com o "±n" — que é
 * o que transforma "não deu" em "você errou uma célula".
 */
const DIGITOS_3X5: { char: string; linhas: string[] }[] = [
  { char: "0", linhas: ["XXX", "X.X", "X.X", "X.X", "XXX"] },
  { char: "1", linhas: ["..X", "..X", "..X", "..X", "..X"] },
  { char: "2", linhas: ["XXX", "..X", "XXX", "X..", "XXX"] },
  { char: "3", linhas: ["XXX", "..X", "XXX", "..X", "XXX"] },
  { char: "3", linhas: ["XXX", "..X", ".XX", "..X", "XXX"] },
  { char: "4", linhas: ["X.X", "X.X", "XXX", "..X", "..X"] },
  { char: "5", linhas: ["XXX", "X..", "XXX", "..X", "XXX"] },
  { char: "6", linhas: ["XXX", "X..", "XXX", "X.X", "XXX"] },
  { char: "7", linhas: ["XXX", "..X", "..X", "..X", "..X"] },
  { char: "8", linhas: ["XXX", "X.X", "XXX", "X.X", "XXX"] },
  { char: "9", linhas: ["XXX", "X.X", "XXX", "..X", "XXX"] },
];

export type AlfabetoId = "nenhum" | "digito-3x5" | "braille-2x3" | "binario";

export const ALFABETOS: {
  valor: AlfabetoId;
  rotulo: string;
  linhas: number;
  colunas: number;
  sep: string;
  ajuda: string;
}[] = [
  {
    valor: "nenhum",
    rotulo: "só recortar os blocos",
    linhas: 5,
    colunas: 3,
    sep: " ",
    ajuda: "mostra cada bloco desenhado, sem tentar reconhecer caractere",
  },
  {
    valor: "digito-3x5",
    rotulo: "dígito 3×5 (fonte de segmentos)",
    linhas: 5,
    colunas: 3,
    sep: "",
    ajuda: "as runas de ITC 2019 e o nonograma de ITC 2023 terminam aqui",
  },
  {
    valor: "braille-2x3",
    rotulo: "Braille 2×3 (pontos 1-6)",
    linhas: 3,
    colunas: 2,
    sep: "",
    ajuda: "emite a célula ⠿ — mande para o Decodificador, que tem o decoder braille",
  },
  {
    valor: "binario",
    rotulo: "binário → número",
    linhas: 1,
    colunas: 8,
    sep: " ",
    ajuda: "lê o bloco como binário (linha a linha) e devolve o número",
  },
];

export interface BlocoLido {
  desenho: string;
  char: string;
  candidatos: { char: string; distancia: number }[];
}

/**
 * Recorta a grade em blocos `altura × largura`, pulando `folga` células entre
 * eles. A folga existe porque as 8 runas coladas de uma vez ficam lado a lado
 * com uma coluna de respiro — sem pular, o bloco 2 começaria torto.
 */
export function fatiarBlocos(
  bitmap: boolean[][],
  altura: number,
  largura: number,
  folga: number,
): boolean[][][] {
  const out: boolean[][][] = [];
  if (altura < 1 || largura < 1) return out;
  const rows = bitmap.length;
  const cols = rows === 0 ? 0 : Math.max(...bitmap.map((l) => l.length));
  const passoR = altura + folga;
  const passoC = largura + folga;
  for (let r0 = 0; r0 + altura <= rows; r0 += passoR) {
    for (let c0 = 0; c0 + largura <= cols; c0 += passoC) {
      const bloco: boolean[][] = [];
      for (let r = 0; r < altura; r++) {
        const linha: boolean[] = [];
        for (let c = 0; c < largura; c++) linha.push(bitmap[r0 + r]?.[c0 + c] === true);
        bloco.push(linha);
      }
      out.push(bloco);
    }
  }
  return out;
}

export function desenharBloco(bloco: boolean[][]): string {
  return bloco.map((l) => l.map((b) => (b ? "█" : "·")).join("")).join("\n");
}

function hamming(bloco: boolean[][], linhas: string[]): number {
  let d = 0;
  for (let r = 0; r < linhas.length; r++) {
    for (let c = 0; c < linhas[r].length; c++) {
      const aceso = linhas[r][c] === "X";
      if ((bloco[r]?.[c] === true) !== aceso) d++;
    }
  }
  return d;
}

/** Braille: os seis pontos numa célula 2 colunas × 3 linhas viram o caractere ⠿. */
function lerBraille(bloco: boolean[][]): string {
  const pontos: [number, number, number][] = [
    [0, 0, 1],
    [1, 0, 2],
    [2, 0, 4],
    [0, 1, 8],
    [1, 1, 16],
    [2, 1, 32],
  ];
  let bits = 0;
  for (const [r, c, peso] of pontos) if (bloco[r]?.[c]) bits += peso;
  return String.fromCodePoint(0x2800 + bits);
}

function lerBinario(bloco: boolean[][]): string {
  let n = 0;
  for (const linha of bloco) for (const b of linha) n = n * 2 + (b ? 1 : 0);
  return String(n);
}

export function lerBloco(bloco: boolean[][], alfabeto: AlfabetoId): BlocoLido {
  const desenho = desenharBloco(bloco);
  if (alfabeto === "braille-2x3") return { desenho, char: lerBraille(bloco), candidatos: [] };
  if (alfabeto === "binario") return { desenho, char: lerBinario(bloco), candidatos: [] };
  if (alfabeto !== "digito-3x5") return { desenho, char: "", candidatos: [] };

  const dists = DIGITOS_3X5.map((g) => ({ char: g.char, distancia: hamming(bloco, g.linhas) }));
  dists.sort((a, b) => a.distancia - b.distancia);
  if (dists[0]?.distancia === 0) return { desenho, char: dists[0].char, candidatos: [] };
  // Nenhum glifo bateu: os dois vizinhos mais próximos dizem QUANTAS células
  // teriam de mudar — quase-acerto em prova quer dizer "errei uma célula".
  const vistos = new Set<string>();
  const candidatos: { char: string; distancia: number }[] = [];
  for (const d of dists) {
    if (vistos.has(d.char)) continue;
    vistos.add(d.char);
    candidatos.push(d);
    if (candidatos.length === 2) break;
  }
  return { desenho, char: "", candidatos };
}

// --------------------------------------------------------------- contagens ---

function listaNumeros(ns: number[]): string {
  return ns.join(" ");
}

function listaPistas(pistas: number[][]): string {
  return pistas.map((p) => (p.length === 0 ? "0" : p.join(" "))).join("\n");
}

// ---------------------------------------------------------------- exemplos ---

export interface Exemplo {
  id: string;
  titulo: string;
  descricao: string;
}

export const EXEMPLOS: Exemplo[] = [
  {
    id: "runas-2019",
    titulo: "Runas 3×5 (ITC 2019)",
    descricao:
      "A 1ª das 8 runas da Seq.1 da Prova da Madrugada, colada como o enunciado dá: A1/B1/C1/A2/… Pintada numa grade 3×5, ela desenha o dígito 8 — e as oito juntas dão o CEP 88.306-445.",
  },
  {
    id: "pares",
    titulo: "Pintar os pares",
    descricao: "O canônico: uma grade 6×6 de números e uma regra por elemento — se par(n), pinte.",
  },
  {
    id: "media-da-linha",
    titulo: "Maior que a média da linha",
    descricao:
      "Mostra o agregado: a condição usa media(linha), que só existe porque o escopo enxerga a linha inteira.",
  },
  {
    id: "estencil-vogais",
    titulo: "Máscara lendo a origem",
    descricao:
      "Pinta as vogais e lê o conteúdo da ORIGEM só onde o destino ficou pintado — é a Batalha Naval de 2022 (a grade de tiros sobre o crachá).",
  },
];

function grade(linhas: string[]): string[][] {
  return linhas.map((l) => l.split(" "));
}

// ------------------------------------------------------------------- hook ---

export function useMatrix() {
  const [origem, setOrigemRaw] = useState<Matrix>(() => emptyMatrix(5, 5));
  /** A pintura à mão. O destino mostrado é isto passado pelas regras. */
  const [pintura, setPinturaRaw] = useState<Matrix>(() => emptyMatrix(5, 5));

  const [regras, setRegras] = useState<Rule[]>([]);
  const [modo, setModo] = useState<ModoComposicao>("camadas");

  const [limparAoRecalcular, setLimparAoRecalcular] = useState(true);
  /** Destino nasce com o texto da origem: é o que deixa ver a letra sob a pintura. */
  const [espelharTexto, setEspelharTexto] = useState(true);
  const [mostrarTexto, setMostrarTexto] = useState(true);
  const [avisoPintura, setAvisoPintura] = useState<string | null>(null);

  const [estados, setEstados] = useState(2);
  const [rotulosEstado, setRotulosEstado] = useState<string[]>([]);
  const [estadoAtivo, setEstadoAtivo] = useState(1);
  const [pintando, setPintando] = useState(true);
  const [tamanho, setTamanho] = useState<"s" | "m" | "g">("m");

  const [cursorOrigem, setCursorOrigem] = useState<Cursor | null>(null);
  const [cursorDestino, setCursorDestino] = useState<Cursor | null>(null);

  const [colagem, setColagem] = useState("");
  const [formatoColagem, setFormatoColagem] = useState<MatrixFormat | "auto">("auto");
  const [issues, setIssues] = useState<ParseIssue[]>([]);

  const [recorte, setRecorte] = useState("");
  const [erroRecorte, setErroRecorte] = useState<string | null>(null);

  const [listaCelulas, setListaCelulas] = useState("");
  const [resumoLista, setResumoLista] = useState<string | null>(null);

  const [alfabeto, setAlfabeto] = useState<AlfabetoId>("nenhum");
  const [blocoLinhas, setBlocoLinhas] = useState(5);
  const [blocoColunas, setBlocoColunas] = useState(3);
  const [blocoFolga, setBlocoFolga] = useState(1);

  const [ordem, setOrdem] = useState<OrdemLeitura>("linhas");
  const [saidaAtual, setSaidaAtual] = useState("mascara");

  const [qrResultado, setQrResultado] = useState<ResultadoQr | null>(null);
  const [qrCarregando, setQrCarregando] = useState(false);
  const [avisoPng, setAvisoPng] = useState<string | null>(null);

  // -------------------------------------------------------------- histórico

  const passado = useRef<Snapshot[]>([]);
  const futuro = useRef<Snapshot[]>([]);
  const ultimaAcao = useRef<{ nome: string; em: number } | null>(null);
  /**
   * A pilha vive em `ref` (empilhar não deve redesenhar nada), mas `podeDesfazer`
   * é lido no render. Este contador é o empurrão que sincroniza os dois — sem
   * ele, o botão de desfazer ficaria cinza depois da primeira pintura.
   */
  const [, setVersao] = useState(0);

  const marcar = useCallback((nome: string, o: Matrix, p: Matrix) => {
    const agora = Date.now();
    const anterior = ultimaAcao.current;
    // Um traço de pintura é uma ação só: sem isto, desfazer devolveria célula a
    // célula e trinta cliques não desfariam nada de útil.
    const mesmo = anterior && anterior.nome === nome && agora - anterior.em < COALESCE_MS;
    ultimaAcao.current = { nome, em: agora };
    if (mesmo) return;
    passado.current.push({ origem: o, pintura: p });
    if (passado.current.length > MAX_HISTORICO) passado.current.shift();
    futuro.current = [];
    setVersao((v) => v + 1);
  }, []);

  const desfazer = useCallback(() => {
    const anterior = passado.current.pop();
    if (!anterior) return;
    futuro.current.push({ origem, pintura });
    ultimaAcao.current = null;
    setOrigemRaw(anterior.origem);
    setPinturaRaw(anterior.pintura);
    setVersao((v) => v + 1);
  }, [origem, pintura]);

  const refazer = useCallback(() => {
    const proximo = futuro.current.pop();
    if (!proximo) return;
    passado.current.push({ origem, pintura });
    ultimaAcao.current = null;
    setOrigemRaw(proximo.origem);
    setPinturaRaw(proximo.pintura);
    setVersao((v) => v + 1);
  }, [origem, pintura]);

  /** Toda escrita passa por aqui — é o que garante que o desfazer nunca fura. */
  const aplicar = useCallback(
    (nome: string, proxima: { origem?: Matrix; pintura?: Matrix }) => {
      marcar(nome, origem, pintura);
      if (proxima.origem) setOrigemRaw(proxima.origem);
      if (proxima.pintura) setPinturaRaw(proxima.pintura);
    },
    [marcar, origem, pintura],
  );

  // ----------------------------------------------------------- as matrizes

  const setDim = useCallback(
    (rows: number, cols: number) => {
      const r = Math.max(0, Math.min(MAX_LADO_UI, Math.floor(rows) || 0));
      const c = Math.max(0, Math.min(MAX_LADO_UI, Math.floor(cols) || 0));
      aplicar("dim", { origem: resize(origem, r, c), pintura: resize(pintura, r, c) });
    },
    [aplicar, origem, pintura],
  );

  const editarOrigem = useCallback(
    (r: number, c: number, v: string) => {
      aplicar("editar", { origem: setCell(origem, r, c, { v }) });
    },
    [aplicar, origem],
  );

  const temRegraAtiva = regras.some((r) => r.ativa);

  const pintar = useCallback(
    (r: number, c: number, estado: number) => {
      // Pintar com "limpar a cada recálculo" ligado seria um clique morto: as
      // regras recomeçam do zero e comem a pintura. Em vez de recusar em
      // silêncio, desligo o interruptor e digo que desliguei.
      if (limparAoRecalcular && temRegraAtiva) {
        setLimparAoRecalcular(false);
        setAvisoPintura(
          "Desliguei “limpar a cada recálculo” para a sua pintura não sumir na próxima passada das regras.",
        );
      }
      aplicar("pintar", { pintura: setCell(pintura, r, c, { mark: estado }) });
    },
    [aplicar, pintura, limparAoRecalcular, temRegraAtiva],
  );

  const limparPintura = useCallback(() => {
    aplicar("limpar", { pintura: makeDestination(origem, espelharTexto) });
    setAvisoPintura(null);
  }, [aplicar, origem, espelharTexto]);

  /** A transformação vale para as DUAS matrizes: se só uma girasse, a máscara descolaria do conteúdo. */
  const transformar = useCallback(
    (t: TransformId) => {
      const fn = (m: Matrix): Matrix => {
        switch (t) {
          case "transpor":
            return transpose(m);
          case "girar-90":
            return rotate(m, 90);
          case "girar-270":
            return rotate(m, 270);
          case "espelhar-h":
            return mirrorH(m);
          case "espelhar-v":
            return mirrorV(m);
          case "aparar":
            return trimEmpty(m);
        }
      };
      aplicar("transformar", { origem: fn(origem), pintura: fn(pintura) });
    },
    [aplicar, origem, pintura],
  );

  const aplicarColagem = useCallback(() => {
    const r = parseMatrix(colagem, formatoColagem === "auto" ? undefined : formatoColagem);
    setIssues(r.issues);
    if (r.matrix.rows === 0) return;
    aplicar("colar", { origem: r.matrix, pintura: makeDestination(r.matrix, espelharTexto) });
  }, [aplicar, colagem, formatoColagem, espelharTexto]);

  const aplicarRecorte = useCallback(() => {
    const faixa = parseFaixa(recorte);
    if (!faixa) {
      setErroRecorte("Não entendi a faixa. Use algo como A1:C5.");
      return;
    }
    setErroRecorte(null);
    aplicar("recortar", {
      origem: crop(origem, faixa.r0, faixa.c0, faixa.rows, faixa.cols),
      pintura: crop(pintura, faixa.r0, faixa.c0, faixa.rows, faixa.cols),
    });
  }, [aplicar, recorte, origem, pintura]);

  /**
   * Pinta a lista colada. Com vários blocos (as 8 runas de 2019), eles vão lado
   * a lado com uma coluna de folga — que é exatamente o que a leitura por blocos
   * precisa para fatiar depois, e por isso a folga já sai configurada.
   */
  const aplicarListaCelulas = useCallback(() => {
    const { blocos, linhas, colunas, invalidos } = parseCellBlocks(listaCelulas);
    if (blocos.length === 0) {
      setResumoLista(
        invalidos.length > 0
          ? `Não reconheci nenhuma célula. Descartei: ${invalidos.slice(0, 6).join(", ")}`
          : "Cole as células (ex.: A1/B1/C1/A2).",
      );
      return;
    }

    const n = blocos.length;
    const largura = n > 1 ? n * colunas + (n - 1) : colunas;
    let m = emptyMatrix(Math.max(linhas, 1), Math.max(largura, 1));
    blocos.forEach((refs, i) => {
      const desloc = i * (colunas + 1);
      for (const { r, c } of refs) m = setCell(m, r, c + desloc, { mark: estadoAtivo || 1 });
    });

    aplicar("lista", { origem: resize(origem, m.rows, m.cols), pintura: m });
    setLimparAoRecalcular(false);
    setBlocoLinhas(linhas);
    setBlocoColunas(colunas);
    setBlocoFolga(n > 1 ? 1 : 0);
    const descartes =
      invalidos.length > 0 ? ` · ignorei ${invalidos.length} pedaço(s) que não são célula` : "";
    setResumoLista(`${n} ${n === 1 ? "bloco" : "blocos"} de ${linhas}×${colunas}${descartes}`);
  }, [aplicar, listaCelulas, estadoAtivo, origem]);

  // ----------------------------------------------------------------- regras

  const base = useMemo(
    () => (limparAoRecalcular ? makeDestination(origem, espelharTexto) : pintura),
    [limparAoRecalcular, origem, espelharTexto, pintura],
  );

  const resultado = useMemo(
    () => applyRules(origem, base, regras, { modo, ordem }),
    [origem, base, regras, modo, ordem],
  );

  const destino = resultado.matrix;

  const addRegra = useCallback(() => {
    setRegras((rs) => [...rs, createRule()]);
  }, []);

  const removerRegra = useCallback((id: string) => {
    setRegras((rs) => rs.filter((r) => r.id !== id));
  }, []);

  const moverRegra = useCallback((id: string, direcao: -1 | 1) => {
    setRegras((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      const j = i + direcao;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const out = [...rs];
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
  }, []);

  /** A interface fala em campos planos; a regra do motor tem a ação aninhada. */
  const alterarRegra = useCallback(
    (
      id: string,
      patch: {
        ativa?: boolean;
        escopo?: string;
        condicao?: string;
        acao?: string;
        estado?: number;
        texto?: string;
      },
    ) => {
      setRegras((rs) =>
        rs.map((r) => {
          if (r.id !== id) return r;
          return {
            ...r,
            ativa: patch.ativa ?? r.ativa,
            escopo: (patch.escopo as Rule["escopo"]) ?? r.escopo,
            condicao: patch.condicao ?? r.condicao,
            acao: {
              tipo: (patch.acao as TipoAcao) ?? r.acao.tipo,
              estado: patch.estado ?? r.acao.estado,
              texto: patch.texto ?? r.acao.texto,
            },
          };
        }),
      );
    },
    [],
  );

  /** As regras já no formato da lista: contagem de células e erro legível junto. */
  const regrasView = useMemo(
    () =>
      regras.map((r) => {
        const sintaxe = validateRule(r);
        const execucao = resultado.errors.find((e) => e.regraId === r.id) ?? null;
        const erro = sintaxe
          ? `${sintaxe.mensagem} (caractere ${sintaxe.pos + 1})`
          : execucao
            ? `${execucao.mensagem}${execucao.celula ? ` — em ${execucao.celula}` : ""}`
            : null;
        return {
          id: r.id,
          ativa: r.ativa,
          escopo: r.escopo as string,
          condicao: r.condicao,
          acao: r.acao.tipo as string,
          estado: r.acao.estado ?? 1,
          texto: r.acao.texto ?? "",
          atingidas: r.ativa ? (resultado.hits[r.id] ?? null) : null,
          erro,
        };
      }),
    [regras, resultado],
  );

  // ---------------------------------------------------------------- saídas

  const bitmap = useMemo(() => destino.cells.map((l) => l.map((c) => c.mark > 0)), [destino]);

  /**
   * A máscara lendo a ORIGEM: só onde o destino está pintado, na ordem de
   * leitura. É a Batalha Naval de 2022 (a grade de tiros sobre o crachá) e é a
   * leitura mais útil da aba — devolve texto direto para o Decodificador.
   */
  const estencil = useMemo(() => {
    let out = "";
    for (const { r, c } of readingOrder(destino, ordem)) {
      if (destino.cells[r][c].mark <= 0) continue;
      out += origem.cells[r]?.[c]?.v ?? "";
    }
    return out;
  }, [destino, origem, ordem]);

  const coordenadas = useMemo(
    () =>
      markedRefs(destino, ordem)
        .map(({ r, c }) => cellLabel(r, c))
        .join(" "),
    [destino, ordem],
  );

  const contagens = useMemo(
    () => ({
      linhas: listaNumeros(marksPerRow(destino)),
      colunas: listaNumeros(marksPerCol(destino)),
      pistasLinhas: listaPistas(cluesRows(destino)),
      pistasColunas: listaPistas(cluesCols(destino)),
    }),
    [destino],
  );

  const formatos = useMemo(
    () => [
      {
        id: "mascara",
        label: "Desenho",
        hint: "A pintura em blocos. É aqui que a runa, o dígito ou o QR aparecem.",
        value: toText(destino),
      },
      {
        id: "bits",
        label: "0 e 1",
        hint: "Bitmap por linha. Cada linha vira um binário — e o Decodificador lê binário.",
        value: toText(destino, { cheio: "1", vazio: "0", usarGlifo: false }),
      },
      {
        id: "estencil",
        label: "Letras marcadas",
        hint: "O conteúdo da ORIGEM só onde o destino está pintado, na ordem de leitura. É a máscara.",
        value: estencil,
      },
      {
        id: "extraido",
        label: "Extraído pelas regras",
        hint: "O que as ações “extrair” colheram, na ordem de leitura.",
        value: resultado.extracted,
      },
      {
        id: "coords",
        label: "Coordenadas",
        hint: "As células marcadas em A1, na ordem de leitura — o formato do enunciado.",
        value: coordenadas,
      },
      {
        id: "md-destino",
        label: "Tabela (destino)",
        hint: "O conteúdo do destino em tabela markdown.",
        value: toMarkdown(destino),
      },
      {
        id: "md-origem",
        label: "Tabela (origem)",
        hint: "A origem em tabela markdown. Mande para o Decodificador e deixe o caminho de leitura (espiral, quatro braços, serpentina) ser eleito lá.",
        value: toMarkdown(origem),
      },
      {
        id: "cont-origem",
        label: "Contígua (origem)",
        hint: "A origem sem separador, uma letra por célula — o outro formato que o Decodificador aceita.",
        value: toContiguous(origem),
      },
    ],
    [destino, origem, estencil, coordenadas, resultado.extracted],
  );

  // ------------------------------------------------------- blocos e alfabeto

  const leitura = useMemo(() => {
    const blocos = fatiarBlocos(bitmap, blocoLinhas, blocoColunas, blocoFolga).map((b) =>
      lerBloco(b, alfabeto),
    );
    const meta = ALFABETOS.find((a) => a.valor === alfabeto);
    const texto = blocos.map((b) => b.char).join(meta?.sep ?? "");
    const semLeitura = blocos.filter((b) => b.char === "").length;
    return {
      texto,
      blocos,
      aviso:
        alfabeto === "nenhum"
          ? undefined
          : blocos.length === 0
            ? "Nenhum bloco cabe na grade com esse tamanho — confira linhas, colunas e folga."
            : semLeitura > 0
              ? `${semLeitura} ${semLeitura === 1 ? "bloco não bateu" : "blocos não bateram"} com nenhum glifo. O “±n” é quantas células teriam de mudar.`
              : undefined,
    };
  }, [bitmap, blocoLinhas, blocoColunas, blocoFolga, alfabeto]);

  const escolherAlfabeto = useCallback((id: AlfabetoId) => {
    setAlfabeto(id);
    const meta = ALFABETOS.find((a) => a.valor === id);
    if (meta && id !== "nenhum") {
      setBlocoLinhas(meta.linhas);
      setBlocoColunas(meta.colunas);
    }
  }, []);

  // -------------------------------------------------------------- QR e PNG

  const diagnostico: Diagnostico = useMemo(() => diagnosticar(bitmap), [bitmap]);

  const lerQr = useCallback(async () => {
    setQrCarregando(true);
    setQrResultado(null);
    try {
      setQrResultado(await decodeQr(bitmap));
    } finally {
      setQrCarregando(false);
    }
  }, [bitmap]);

  const salvarPng = useCallback(() => {
    const ok = baixarPng(bitmap, "matriz.png");
    setAvisoPng(ok ? null : "Este navegador não deixou gerar a imagem (canvas bloqueado).");
  }, [bitmap]);

  // ------------------------------------------------------------- exemplos

  const carregarExemplo = useCallback(
    (id: string) => {
      const trocar = (textos: string[][], novasRegras: Rule[], limpar: boolean) => {
        const m = matrixFromTexts(textos);
        aplicar("exemplo", { origem: m, pintura: makeDestination(m, espelharTexto) });
        setRegras(novasRegras);
        setLimparAoRecalcular(limpar);
        setColagem("");
        setIssues([]);
      };

      if (id === "runas-2019") {
        const m = emptyMatrix(5, 3);
        aplicar("exemplo", { origem: m, pintura: m });
        setRegras([]);
        setListaCelulas("A1/B1/C1/A2/C2/A3/B3/C3/A4/C4/A5/B5/C5");
        setResumoLista("Clique em “Pintar a lista” — a runa desenha o dígito.");
        escolherAlfabeto("digito-3x5");
        setBlocoFolga(0);
        setLimparAoRecalcular(false);
        setSaidaAtual("mascara");
        return;
      }

      if (id === "pares") {
        const linhas: string[][] = [];
        for (let r = 0; r < 6; r++) {
          linhas.push(Array.from({ length: 6 }, (_, c) => String(r * 6 + c + 1)));
        }
        trocar(linhas, [createRule({ escopo: "elemento", condicao: "par(n)" })], true);
        setSaidaAtual("mascara");
        escolherAlfabeto("nenhum");
        return;
      }

      if (id === "media-da-linha") {
        trocar(
          grade(["4 9 2 7 1", "8 3 6 2 9", "1 5 5 4 8", "7 2 9 3 1", "6 6 1 8 4"]),
          [createRule({ escopo: "elemento", condicao: "n > media(linha)" })],
          true,
        );
        setSaidaAtual("mascara");
        escolherAlfabeto("nenhum");
        return;
      }

      if (id === "estencil-vogais") {
        trocar(
          grade([
            "P A R A B E",
            "N S C U M P",
            "R I R T E S",
            "S A P R O V",
            "K A O S E M",
            "Z A N U L O",
          ]),
          [createRule({ escopo: "elemento", condicao: "vogal(v)" })],
          true,
        );
        setSaidaAtual("estencil");
        escolherAlfabeto("nenhum");
      }
    },
    [aplicar, espelharTexto, escolherAlfabeto],
  );

  // ------------------------------------------------------------- derivados

  const grande = origem.rows * origem.cols > MAX_RENDER;

  const renomearEstado = useCallback((indice: number, rotulo: string) => {
    setRotulosEstado((atuais) => {
      const out = [...atuais];
      while (out.length <= indice) out.push("");
      out[indice] = rotulo;
      return out;
    });
  }, []);

  return {
    // matrizes
    origem,
    destino,
    grande,
    setDim,
    editarOrigem,
    pintar,
    limparPintura,
    transformar,

    // colagem
    colagem,
    setColagem,
    formatoColagem,
    setFormatoColagem,
    aplicarColagem,
    issues,

    // recorte
    recorte,
    setRecorte,
    aplicarRecorte,
    erroRecorte,

    // lista de células
    listaCelulas,
    setListaCelulas,
    aplicarListaCelulas,
    resumoLista,

    // regras
    regras: regrasView,
    addRegra,
    removerRegra,
    moverRegra,
    alterarRegra,
    modo,
    setModo,
    temRegraAtiva,

    // blocos / alfabeto
    alfabeto,
    escolherAlfabeto,
    blocoLinhas,
    setBlocoLinhas,
    blocoColunas,
    setBlocoColunas,
    blocoFolga,
    setBlocoFolga,
    leitura,

    // interruptores
    limparAoRecalcular,
    setLimparAoRecalcular,
    espelharTexto,
    setEspelharTexto,
    mostrarTexto,
    setMostrarTexto,
    avisoPintura,

    // paleta / interação
    estados,
    setEstados,
    rotulosEstado,
    renomearEstado,
    estadoAtivo,
    setEstadoAtivo,
    pintando,
    setPintando,
    tamanho,
    setTamanho,
    cursorOrigem,
    setCursorOrigem,
    cursorDestino,
    setCursorDestino,

    // saídas
    ordem,
    setOrdem,
    formatos,
    saidaAtual,
    setSaidaAtual,
    contagens,
    bitmap,

    // QR / PNG
    diagnostico,
    qrResultado,
    qrCarregando,
    lerQr,
    salvarPng,
    avisoPng,

    // exemplos
    exemplos: EXEMPLOS,
    carregarExemplo,

    // histórico
    desfazer,
    refazer,
    podeDesfazer: passado.current.length > 0,
    podeRefazer: futuro.current.length > 0,
  };
}

export type MatrixState = ReturnType<typeof useMatrix>;
