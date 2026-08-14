/**
 * Modelo, leitura e saída da grade — o chão da aba Matriz.
 *
 * O acervo mostra a mesma grade chegando de cinco jeitos (tabela markdown do
 * `pdftotext -layout`, TSV colado do Excel, CSV, separada por espaço e contígua
 * — oito letras coladas por linha), e às vezes não chegando: "pinte numa grade
 * 3×5". Por isso `parseMatrix` detecta o formato sozinho e **nunca recusa**: uma
 * grade torta vira grade retangular com os problemas listados. Recusar em prova
 * é pior que avisar — quem colou quer ver o que colou.
 *
 * Duas matrizes convivem: a ORIGEM (o conteúdo, que as condições leem) e o
 * DESTINO (onde as ações pintam). O destino nasce espelhando a origem ou limpo,
 * à escolha — é o pedido do dono, e é o que permite a máscara ler a origem.
 *
 * Tudo aqui é puro e serializável (nada de classes): o desfazer/refazer da
 * interface é uma pilha de matrizes, e o `localStorage` engole o estado inteiro.
 */

/** Teto por lado. Uma grade maior que isto não é grade de prova, é colagem errada. */
export const MAX_LADO = 512;
/** Teto de células: 65 536 já é 256×256 e mantém o motor de regras instantâneo. */
export const MAX_CELULAS = 65_536;

/** Caractere padrão de célula pintada — o `█` é o que desenha na tela e no texto copiado. */
export const CHEIO_PADRAO = "█";
/** Caractere padrão de célula vazia. O ponto médio não some no meio da grade. */
export const VAZIO_PADRAO = "·";

export interface Cell {
  /** Texto cru, como foi colado. Célula vazia é `""`, nunca nulo. */
  v: string;
  /** O número da célula quando o texto é um (aceita vírgula decimal pt-BR); senão `null`. */
  n: number | null;
  /** 0 = não marcada; 1..N = estado da marca (multi-estado, para nonograma colorido). */
  mark: number;
  /** Caractere escolhido pela ação "marcar" (█ ▓ ░ X · #). `null` = usa o padrão. */
  glyph: string | null;
  /** Intensidade 0..1 do mapa de calor (ação "cor"). `null` = sem cor. */
  heat: number | null;
}

export interface Matrix {
  rows: number;
  cols: number;
  /** `cells[r][c]`, ambos 0-based. Sempre retangular: `rows × cols`. */
  cells: Cell[][];
}

/** Coordenada 0-based. A régua A1 da interface é 1-based — use `cellLabel`. */
export interface CellRef {
  r: number;
  c: number;
}

/** Ordem em que a grade é percorrida para extrair/exportar. */
export type OrdemLeitura = "linhas" | "colunas" | "serpentina-linhas" | "serpentina-colunas";

export const ORDENS_LEITURA: { valor: OrdemLeitura; rotulo: string }[] = [
  { valor: "linhas", rotulo: "por linha" },
  { valor: "colunas", rotulo: "por coluna" },
  { valor: "serpentina-linhas", rotulo: "serpentina por linhas" },
  { valor: "serpentina-colunas", rotulo: "serpentina por colunas" },
];

// ---------------------------------------------------------------- utilidades

/** Remove acentos e baixa a caixa. Comparação de prova ignora as duas coisas. */
export function fold(texto: string): string {
  let out = "";
  for (const ch of texto.normalize("NFD")) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x300 || c > 0x36f) out += ch;
  }
  return out.toLowerCase();
}

/**
 * Divide em caracteres para o formato contíguo. Normaliza para NFC antes: sem
 * isso, um "ã" decomposto (comum em PDF) viraria duas células e desalinharia a
 * grade inteira.
 */
export function splitChars(texto: string): string[] {
  return [...texto.normalize("NFC")];
}

/**
 * Número da célula com as duas convenções vivas no acervo.
 * Vírgula sozinha é sempre decimal (pt-BR: `1,5` = 1,5). Ponto sozinho é
 * ambíguo, e o desempate é a forma: `1.234` tem cara de milhar → 1234;
 * `1.23` e `1.5` são decimais. Com os dois separadores, o último manda.
 */
export function parseNumeroBR(texto: string): number | null {
  const t = texto.trim();
  if (!/^[+-]?\d[\d.,]*$/.test(t)) return null;

  const temPonto = t.includes(".");
  const temVirgula = t.includes(",");
  let limpo = t;
  if (temPonto && temVirgula) {
    const decimal = t.lastIndexOf(",") > t.lastIndexOf(".") ? "," : ".";
    const milhar = decimal === "," ? "." : ",";
    limpo = t.split(milhar).join("").replace(decimal, ".");
  } else if (temVirgula) {
    limpo = t.replace(",", ".");
  } else if (temPonto && /^[+-]?\d{1,3}(\.\d{3})+$/.test(t)) {
    limpo = t.split(".").join("");
  }

  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Célula nova a partir do texto: o número é derivado, nunca informado à mão. */
export function makeCell(v: string): Cell {
  return { v, n: parseNumeroBR(v), mark: 0, glyph: null, heat: null };
}

export function cloneCell(c: Cell): Cell {
  return { v: c.v, n: c.n, mark: c.mark, glyph: c.glyph, heat: c.heat };
}

export function emptyMatrix(rows: number, cols: number): Matrix {
  const r = clampLado(rows);
  const c = clampLado(cols);
  const cells: Cell[][] = [];
  for (let i = 0; i < r; i++) {
    const linha: Cell[] = [];
    for (let j = 0; j < c; j++) linha.push(makeCell(""));
    cells.push(linha);
  }
  return { rows: r, cols: c, cells };
}

export function matrixFromTexts(textos: string[][]): Matrix {
  const rows = Math.min(textos.length, MAX_LADO);
  const cols = Math.min(
    textos.reduce((m, l) => Math.max(m, l.length), 0),
    MAX_LADO,
  );
  const m = emptyMatrix(rows, cols);
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) m.cells[r][c] = makeCell(textos[r][c] ?? "");
  }
  return m;
}

export function cloneMatrix(m: Matrix): Matrix {
  return { rows: m.rows, cols: m.cols, cells: m.cells.map((l) => l.map(cloneCell)) };
}

/**
 * O destino a partir da origem. `manterTexto` espelha o conteúdo (dá para ver a
 * letra por baixo da pintura, que é o que a máscara-lê-origem precisa);
 * desligado, o destino nasce limpo e a pintura é o único conteúdo.
 * As marcas nunca vêm junto — destino é sempre despintado.
 */
export function makeDestination(origem: Matrix, manterTexto: boolean): Matrix {
  const m = emptyMatrix(origem.rows, origem.cols);
  if (manterTexto) {
    for (let r = 0; r < m.rows; r++) {
      for (let c = 0; c < m.cols; c++) m.cells[r][c] = makeCell(origem.cells[r][c].v);
    }
  }
  return m;
}

export function getCell(m: Matrix, r: number, c: number): Cell | null {
  if (r < 0 || c < 0 || r >= m.rows || c >= m.cols) return null;
  return m.cells[r][c];
}

/** Escrita imutável de uma célula — a pilha de desfazer é feita disto. */
export function setCell(m: Matrix, r: number, c: number, patch: Partial<Cell>): Matrix {
  return setCells(m, [{ r, c }], patch);
}

/** Escrita imutável em lote: um arrasto de pintura é uma chamada só. */
export function setCells(m: Matrix, refs: CellRef[], patch: Partial<Cell>): Matrix {
  const out = cloneMatrix(m);
  for (const { r, c } of refs) {
    if (r < 0 || c < 0 || r >= out.rows || c >= out.cols) continue;
    const cel = out.cells[r][c];
    const novo = { ...cel, ...patch };
    // O número é derivado do texto: deixar os dois divergirem quebra as condições.
    if (patch.v !== undefined && patch.n === undefined) novo.n = parseNumeroBR(novo.v);
    out.cells[r][c] = novo;
  }
  return out;
}

/** Alterna a marca de uma célula entre 0 e `estado` (pintura à mão). */
export function toggleMark(m: Matrix, r: number, c: number, estado = 1): Matrix {
  const cel = getCell(m, r, c);
  if (!cel) return m;
  return setCell(m, r, c, { mark: cel.mark === estado ? 0 : estado });
}

function clampLado(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MAX_LADO, Math.floor(n)));
}

// ------------------------------------------------------------------ rótulos

/** 0 → A, 25 → Z, 26 → AA. A régua de coordenadas é o que deixa conferir contra o enunciado. */
export function colLabel(c0: number): string {
  if (!Number.isFinite(c0) || c0 < 0) return "";
  let n = Math.floor(c0);
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** "A" → 0, "aa" → 26. Devolve `null` se não for rótulo de coluna. */
export function parseColLabel(rotulo: string): number | null {
  const t = rotulo.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(t)) return null;
  let n = 0;
  for (const ch of t) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** (0,1) → "B1" — coluna em letra, linha 1-based, como na planilha das runas de 2019. */
export function cellLabel(r0: number, c0: number): string {
  return `${colLabel(c0)}${r0 + 1}`;
}

// ------------------------------------------------------------------ leitura

export type MatrixFormat = "markdown" | "tsv" | "csv" | "espaco" | "contiguo" | "vazio";

export const FORMATOS: { valor: MatrixFormat; rotulo: string }[] = [
  { valor: "markdown", rotulo: "tabela markdown" },
  { valor: "tsv", rotulo: "colado do Excel (tabulação)" },
  { valor: "csv", rotulo: "CSV (vírgula ou ponto e vírgula)" },
  { valor: "espaco", rotulo: "separado por espaço" },
  { valor: "contiguo", rotulo: "contíguo (uma letra por célula)" },
];

export interface ParseIssue {
  /** Linha 1-based do texto colado, ou `null` quando o problema é do bloco inteiro. */
  linha: number | null;
  mensagem: string;
}

export interface ParseResult {
  matrix: Matrix;
  format: MatrixFormat;
  /** Grade torta é a causa nº 1 de resultado errado — o silêncio aqui custa caro. */
  issues: ParseIssue[];
}

/**
 * Linha de separação da tabela markdown: `|---|:--:|---|`. O traço é obrigatório
 * de propósito — sem ele, uma linha inteiramente vazia da grade (`|  |  |  |`)
 * seria confundida com separador e sumiria, e linha vazia é dado.
 */
const SEPARADOR_MD = /^\|?[\s|:-]*-[\s|:-]*\|?$/;

/**
 * Decide o formato do bloco inteiro (nunca linha a linha — formatos misturados
 * são sinal de colagem errada, não de grade).
 *
 * A ordem é markdown → tabulação → CSV → espaço → contíguo, com uma ressalva
 * pt-BR: uma vírgula ladeada por dígitos dos dois lados é decimal, não
 * separador. Sem essa ressalva, `1,5 2,5` viraria quatro células.
 */
export function detectFormat(texto: string): MatrixFormat {
  const linhas = linhasUteis(texto);
  if (linhas.length === 0) return "vazio";
  if (linhas.some((l) => l.includes("|"))) return "markdown";
  if (linhas.some((l) => l.includes("\t"))) return "tsv";
  if (linhas.some((l) => l.includes(";"))) return "csv";
  if (linhas.some((l) => l.includes(",") && !soDecimais(l))) return "csv";
  if (linhas.some((l) => /\S\s+\S/.test(l))) return "espaco";
  return "contiguo";
}

/** Toda vírgula da linha está entre dígitos (`1,5`), logo é decimal pt-BR. */
function soDecimais(linha: string): boolean {
  for (let i = 0; i < linha.length; i++) {
    if (linha[i] !== ",") continue;
    if (!/\d/.test(linha[i - 1] ?? "") || !/\d/.test(linha[i + 1] ?? "")) return false;
  }
  return true;
}

function linhasUteis(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function tiraAspas(celula: string): string {
  const t = celula.trim();
  return t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
}

function fatiar(linha: string, formato: MatrixFormat): string[] {
  switch (formato) {
    case "markdown":
      return linha
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
    case "tsv":
      return linha.split("\t").map((c) => c.trim());
    case "csv":
      return linha.split(linha.includes(";") ? ";" : ",").map(tiraAspas);
    case "espaco":
      return linha.split(/\s+/);
    case "contiguo":
      return splitChars(linha);
    default:
      return [];
  }
}

/**
 * Lê a grade colada. Aceita `formato` para o override manual — a detecção acerta
 * o caso comum, e o caso ambíguo (vírgula) é resolvido pela pessoa, não pelo
 * chute. Linhas de tamanho diferente são completadas com célula vazia e
 * reportadas em `issues`, uma por linha desviante.
 */
export function parseMatrix(texto: string, formato?: MatrixFormat): ParseResult {
  const issues: ParseIssue[] = [];
  const brutas = texto.split(/\r?\n/);
  const detectado = formato ?? detectFormat(texto);
  if (detectado === "vazio") {
    return { matrix: emptyMatrix(0, 0), format: "vazio", issues };
  }

  // Guarda os números de linha do texto original: "linha 3" tem de ser a linha 3
  // que a pessoa vê no campo, não a 3ª linha não-vazia.
  const linhas: { texto: string; num: number }[] = [];
  brutas.forEach((l, i) => {
    const t = l.trim();
    if (t.length > 0) linhas.push({ texto: t, num: i + 1 });
  });

  const dados =
    detectado === "markdown" ? linhas.filter((l) => !SEPARADOR_MD.test(l.texto)) : linhas;
  if (dados.length === 0) {
    return { matrix: emptyMatrix(0, 0), format: detectado, issues };
  }

  const fatias = dados.map((l) => fatiar(l.texto, detectado));
  const contagens = fatias.map((f) => f.length);
  const modal = maisComum(contagens);
  const cols = Math.max(...contagens);

  fatias.forEach((f, i) => {
    if (f.length !== modal) {
      issues.push({
        linha: dados[i].num,
        mensagem: `linha ${dados[i].num} tem ${f.length} ${plural(f.length, "coluna", "colunas")}, as outras têm ${modal}`,
      });
    }
  });

  if (detectado === "contiguo" && texto.includes(",")) {
    issues.push({
      linha: null,
      mensagem:
        "há vírgulas mas nenhum separador claro — se elas separam células, escolha o formato CSV à mão",
    });
  }

  let usadas = fatias;
  if (usadas.length > MAX_LADO) {
    usadas = usadas.slice(0, MAX_LADO);
    issues.push({ linha: null, mensagem: `grade cortada em ${MAX_LADO} linhas` });
  }
  let largura = Math.min(cols, MAX_LADO);
  if (cols > MAX_LADO) {
    issues.push({ linha: null, mensagem: `grade cortada em ${MAX_LADO} colunas` });
  }
  if (usadas.length * largura > MAX_CELULAS) {
    largura = Math.max(1, Math.floor(MAX_CELULAS / usadas.length));
    issues.push({
      linha: null,
      mensagem: `grade grande demais: cortada em ${MAX_CELULAS} células`,
    });
  }

  const matrix = matrixFromTexts(usadas.map((f) => f.slice(0, largura)));
  return { matrix, format: detectado, issues };
}

function plural(n: number, um: string, muitos: string): string {
  return n === 1 ? um : muitos;
}

/** Contagem de colunas mais frequente; empate fica com a maior (perder célula é pior). */
function maisComum(ns: number[]): number {
  const freq = new Map<number, number>();
  for (const n of ns) freq.set(n, (freq.get(n) ?? 0) + 1);
  let melhor = 0;
  let melhorFreq = -1;
  for (const [n, f] of freq) {
    if (f > melhorFreq || (f === melhorFreq && n > melhor)) {
      melhor = n;
      melhorFreq = f;
    }
  }
  return melhor;
}

// ------------------------------------------------------------------- saídas

/** Percurso da grade. Espiral e quatro braços NÃO moram aqui — isso é o `grid-read`. */
export function readingOrder(m: Matrix, ordem: OrdemLeitura = "linhas"): CellRef[] {
  const out: CellRef[] = [];
  if (ordem === "linhas" || ordem === "serpentina-linhas") {
    const serp = ordem === "serpentina-linhas";
    for (let r = 0; r < m.rows; r++) {
      for (let i = 0; i < m.cols; i++) out.push({ r, c: serp && r % 2 === 1 ? m.cols - 1 - i : i });
    }
    return out;
  }
  const serp = ordem === "serpentina-colunas";
  for (let c = 0; c < m.cols; c++) {
    for (let i = 0; i < m.rows; i++) out.push({ r: serp && c % 2 === 1 ? m.rows - 1 - i : i, c });
  }
  return out;
}

export interface TextOptions {
  /** Caractere da célula marcada (padrão `█`). */
  cheio?: string;
  /** Caractere da célula vazia (padrão `·`). */
  vazio?: string;
  /** Separador entre células (padrão `""` — é o formato que a leitura de dígito 3×5 quer). */
  sep?: string;
  /** Usar o caractere gravado pela ação "marcar" no lugar do `cheio` (padrão: sim). */
  usarGlifo?: boolean;
}

/** A MÁSCARA em ASCII, copiável: é isto que revela o desenho (a runa, o dígito, o QR). */
export function toText(m: Matrix, opts: TextOptions = {}): string {
  const cheio = opts.cheio ?? CHEIO_PADRAO;
  const vazio = opts.vazio ?? VAZIO_PADRAO;
  const sep = opts.sep ?? "";
  const usarGlifo = opts.usarGlifo ?? true;
  return m.cells
    .map((linha) =>
      linha.map((cel) => (cel.mark > 0 ? (usarGlifo && cel.glyph) || cheio : vazio)).join(sep),
    )
    .join("\n");
}

/** O CONTEÚDO em tabela markdown — um dos dois formatos que o `lerGrade` do Decodificador aceita. */
export function toMarkdown(m: Matrix): string {
  return m.cells.map((linha) => `| ${linha.map((c) => c.v).join(" | ")} |`).join("\n");
}

/**
 * O CONTEÚDO colado, uma célula por caractere — o outro formato do `lerGrade`.
 * Célula com mais de um caractere é cortada e a vazia vira `vazio`: manter o
 * alinhamento das colunas importa mais do que preservar o texto inteiro aqui.
 */
export function toContiguous(m: Matrix, vazio = "."): string {
  return m.cells.map((linha) => linha.map((c) => splitChars(c.v)[0] ?? vazio).join("")).join("\n");
}

/** O conteúdo com separador livre (padrão tabulação, para voltar ao Excel). */
export function toContent(m: Matrix, sep = "\t"): string {
  return m.cells.map((linha) => linha.map((c) => c.v).join(sep)).join("\n");
}

/** Matriz booleana da pintura — é o que alimenta o QR e o PNG. */
export function toBitmap(m: Matrix): boolean[][] {
  return m.cells.map((linha) => linha.map((c) => c.mark > 0));
}

/** Matriz de estados (0 = vazia, 1..N), para o multi-estado/nonograma colorido. */
export function toStates(m: Matrix): number[][] {
  return m.cells.map((linha) => linha.map((c) => c.mark));
}

/** O texto das células marcadas, na ordem de leitura — a grade virando mensagem. */
export function extractString(m: Matrix, ordem: OrdemLeitura = "linhas"): string {
  let out = "";
  for (const { r, c } of readingOrder(m, ordem)) {
    const cel = m.cells[r][c];
    if (cel.mark > 0) out += cel.v;
  }
  return out;
}

/** Coordenadas das células marcadas, na ordem de leitura ("A1 B1 C1…"). */
export function markedRefs(m: Matrix, ordem: OrdemLeitura = "linhas"): CellRef[] {
  return readingOrder(m, ordem).filter(({ r, c }) => m.cells[r][c].mark > 0);
}

/** Quantas células marcadas por linha — em GIA-39 ISTO é a resposta (comprimento da barra). */
export function marksPerRow(m: Matrix): number[] {
  return m.cells.map((linha) => linha.reduce((s, c) => s + (c.mark > 0 ? 1 : 0), 0));
}

export function marksPerCol(m: Matrix): number[] {
  const out = new Array<number>(m.cols).fill(0);
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) if (m.cells[r][c].mark > 0) out[c]++;
  }
  return out;
}

function blocos(marcas: boolean[]): number[] {
  const out: number[] = [];
  let atual = 0;
  for (const m of marcas) {
    if (m) atual++;
    else if (atual > 0) {
      out.push(atual);
      atual = 0;
    }
  }
  if (atual > 0) out.push(atual);
  return out;
}

/**
 * As pistas de nonograma da grade JÁ pintada (o resolvedor ao contrário) — serve
 * para conferir uma grade pintada à mão contra as pistas do enunciado.
 * Linha sem nenhuma marca devolve `[]` (a interface mostra 0).
 */
export function cluesRows(m: Matrix): number[][] {
  return toBitmap(m).map(blocos);
}

export function cluesCols(m: Matrix): number[][] {
  const bmp = toBitmap(m);
  const out: number[][] = [];
  for (let c = 0; c < m.cols; c++) out.push(blocos(bmp.map((linha) => linha[c])));
  return out;
}

// ---------------------------------------------------------- transformações

/**
 * Metade das provas de grade é ambígua quanto à orientação (a runa está de
 * lado? o nonograma começa em cima?). Quatro giros e dois espelhos são oito
 * hipóteses em oito cliques em vez de redigitar a grade — e todas preservam a
 * célula inteira (texto, marca, glifo, cor), senão a máscara descola do conteúdo.
 */
export function transpose(m: Matrix): Matrix {
  const out = emptyMatrix(m.cols, m.rows);
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) out.cells[c][r] = cloneCell(m.cells[r][c]);
  }
  return out;
}

/** Giro horário. 90/180/270; qualquer outro valor devolve a grade intacta. */
export function rotate(m: Matrix, graus: 90 | 180 | 270): Matrix {
  if (graus === 180) return mirrorH(mirrorV(m));
  if (graus === 270) return mirrorV(transpose(m));
  return mirrorH(transpose(m));
}

/** Espelho horizontal: a esquerda vira direita (inverte as colunas). */
export function mirrorH(m: Matrix): Matrix {
  const out = emptyMatrix(m.rows, m.cols);
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) out.cells[r][m.cols - 1 - c] = cloneCell(m.cells[r][c]);
  }
  return out;
}

/** Espelho vertical: o topo vira base (inverte as linhas). */
export function mirrorV(m: Matrix): Matrix {
  const out = emptyMatrix(m.rows, m.cols);
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) out.cells[m.rows - 1 - r][c] = cloneCell(m.cells[r][c]);
  }
  return out;
}

/**
 * Recorte por retângulo (0-based). É o que isola um bloco 3×5 dentro de uma
 * grade maior e o que salva quando a colagem trouxe cabeçalho ou lixo.
 * O pedido é aparado para caber; pedido fora da grade devolve 0×0.
 */
export function crop(m: Matrix, r0: number, c0: number, rows: number, cols: number): Matrix {
  const ri = Math.max(0, Math.floor(r0));
  const ci = Math.max(0, Math.floor(c0));
  const rf = Math.min(m.rows, ri + Math.max(0, Math.floor(rows)));
  const cf = Math.min(m.cols, ci + Math.max(0, Math.floor(cols)));
  if (rf <= ri || cf <= ci) return emptyMatrix(0, 0);
  const out = emptyMatrix(rf - ri, cf - ci);
  for (let r = ri; r < rf; r++) {
    for (let c = ci; c < cf; c++) out.cells[r - ri][c - ci] = cloneCell(m.cells[r][c]);
  }
  return out;
}

/** Redimensiona preservando o que couber, ancorado no canto superior esquerdo. */
export function resize(m: Matrix, rows: number, cols: number): Matrix {
  const out = emptyMatrix(rows, cols);
  for (let r = 0; r < Math.min(out.rows, m.rows); r++) {
    for (let c = 0; c < Math.min(out.cols, m.cols); c++) out.cells[r][c] = cloneCell(m.cells[r][c]);
  }
  return out;
}

/** Célula sem texto e sem marca — o que "borda vazia" quer dizer. */
function celulaVazia(c: Cell): boolean {
  return c.v.trim() === "" && c.mark === 0;
}

/** Apara as bordas totalmente vazias. Grade toda vazia devolve 0×0. */
export function trimEmpty(m: Matrix): Matrix {
  let topo = 0;
  let base = m.rows - 1;
  let esq = 0;
  let dir = m.cols - 1;
  const linhaVazia = (r: number) => m.cells[r].every(celulaVazia);
  const colVazia = (c: number) => m.cells.every((linha) => celulaVazia(linha[c]));
  while (topo <= base && linhaVazia(topo)) topo++;
  while (base >= topo && linhaVazia(base)) base--;
  if (topo > base) return emptyMatrix(0, 0);
  while (esq <= dir && colVazia(esq)) esq++;
  while (dir >= esq && colVazia(dir)) dir--;
  if (esq > dir) return emptyMatrix(0, 0);
  return crop(m, topo, esq, base - topo + 1, dir - esq + 1);
}

/** Insere uma linha vazia ANTES do índice (0-based); `m.rows` acrescenta no fim. */
export function insertRow(m: Matrix, at: number): Matrix {
  const i = Math.max(0, Math.min(m.rows, Math.floor(at)));
  const out = emptyMatrix(m.rows + 1, m.cols);
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) out.cells[r < i ? r : r + 1][c] = cloneCell(m.cells[r][c]);
  }
  return out;
}

export function removeRow(m: Matrix, at: number): Matrix {
  if (m.rows === 0 || at < 0 || at >= m.rows) return m;
  const out = emptyMatrix(m.rows - 1, m.cols);
  for (let r = 0; r < m.rows; r++) {
    if (r === at) continue;
    for (let c = 0; c < m.cols; c++) out.cells[r < at ? r : r - 1][c] = cloneCell(m.cells[r][c]);
  }
  return out;
}

export function insertCol(m: Matrix, at: number): Matrix {
  return transpose(insertRow(transpose(m), at));
}

export function removeCol(m: Matrix, at: number): Matrix {
  return transpose(removeRow(transpose(m), at));
}
