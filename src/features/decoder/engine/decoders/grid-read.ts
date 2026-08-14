import { bruteDecoder } from "../define";

/**
 * Leitura de grade: a mensagem não está nas linhas, está no *caminho* que se
 * percorre pela grade. O caso que motivou isto (GIA-15) usa quatro braços
 * girando juntos a partir dos quatro cantos — a espiral horária ingênua devolve
 * lixo nessa mesma grade.
 */

type Grade = string[][];

/** Uma célula é uma letra ou um dígito, e só um. Serve de porta de entrada. */
const CELULA = /^[\p{L}\p{N}]$/u;
/** Linha de separação da tabela markdown: |---|:--:|---| */
const SEPARADOR_MD = /^\|?[\s|:-]+\|?$/;

/**
 * Aceita três colagens: tabela markdown (o formato do acervo), separado por
 * espaço e contíguo. O formato é decidido para o bloco inteiro, não linha a
 * linha — misturar formatos é sinal de que aquilo não é uma grade.
 */
function lerGrade(input: string): Grade | null {
  const linhas = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (linhas.length < 3) return null;

  const markdown = linhas.some((l) => l.includes("|"));
  const dados = markdown ? linhas.filter((l) => !SEPARADOR_MD.test(l)) : linhas;
  if (dados.length < 3) return null;
  const espacado = !markdown && dados.every((l) => /\s/.test(l));

  const grade: Grade = [];
  for (const linha of dados) {
    const celulas = markdown
      ? linha
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim())
      : espacado
        ? linha.split(/\s+/)
        : [...linha];
    if (celulas.length < 3) return null;
    if (grade.length > 0 && celulas.length !== grade[0].length) return null;
    if (!celulas.every((c) => CELULA.test(c))) return null;
    grade.push(celulas);
  }
  return grade.length >= 3 ? grade : null;
}

/** Quantos anéis concêntricos a grade tem. */
function totalAneis(g: Grade): number {
  return Math.ceil(Math.min(g.length, g[0].length) / 2);
}

/**
 * Um anel percorrido por quatro braços simultâneos (canto superior esquerdo
 * para a direita, superior direito para baixo, inferior direito para a
 * esquerda, inferior esquerdo para cima), um caractere de cada por passo.
 */
function anelQuatroBracos(g: Grade, d: number): string[] {
  const topo = d;
  const esq = d;
  const base = g.length - 1 - d;
  const dir = g[0].length - 1 - d;
  if (topo > base || esq > dir) return [];
  if (topo === base) return g[topo].slice(esq, dir + 1);
  if (esq === dir) {
    const col: string[] = [];
    for (let r = topo; r <= base; r++) col.push(g[r][esq]);
    return col;
  }

  const b1: string[] = []; // topo, para a direita
  const b2: string[] = []; // direita, para baixo
  const b3: string[] = []; // base, para a esquerda
  const b4: string[] = []; // esquerda, para cima
  for (let c = esq; c < dir; c++) b1.push(g[topo][c]);
  for (let r = topo; r < base; r++) b2.push(g[r][dir]);
  for (let c = dir; c > esq; c--) b3.push(g[base][c]);
  for (let r = base; r > topo; r--) b4.push(g[r][esq]);

  const out: string[] = [];
  const passos = Math.max(b1.length, b2.length);
  for (let i = 0; i < passos; i++) {
    for (const braco of [b1, b2, b3, b4]) if (i < braco.length) out.push(braco[i]);
  }
  return out;
}

function quatroBracos(g: Grade): string {
  let out = "";
  for (let d = 0; d < totalAneis(g); d++) out += anelQuatroBracos(g, d).join("");
  return out;
}

/** Espiral horária: topo→direita, desce, base→esquerda, sobe, e afunda um anel. */
function espiralHoraria(g: Grade): string {
  let topo = 0;
  let base = g.length - 1;
  let esq = 0;
  let dir = g[0].length - 1;
  let out = "";
  while (topo <= base && esq <= dir) {
    for (let c = esq; c <= dir; c++) out += g[topo][c];
    topo++;
    for (let r = topo; r <= base; r++) out += g[r][dir];
    dir--;
    if (topo <= base) {
      for (let c = dir; c >= esq; c--) out += g[base][c];
      base--;
    }
    if (esq <= dir) {
      for (let r = base; r >= topo; r--) out += g[r][esq];
      esq++;
    }
  }
  return out;
}

/** Espiral anti-horária: mesma coisa começando para baixo pela coluna da esquerda. */
function espiralAntiHoraria(g: Grade): string {
  let topo = 0;
  let base = g.length - 1;
  let esq = 0;
  let dir = g[0].length - 1;
  let out = "";
  while (topo <= base && esq <= dir) {
    for (let r = topo; r <= base; r++) out += g[r][esq];
    esq++;
    for (let c = esq; c <= dir; c++) out += g[base][c];
    base--;
    if (esq <= dir) {
      for (let r = base; r >= topo; r--) out += g[r][dir];
      dir--;
    }
    if (topo <= base) {
      for (let c = dir; c >= esq; c--) out += g[topo][c];
      topo++;
    }
  }
  return out;
}

/** Bustrofédon: vai numa direção, volta na outra. */
function serpentinaLinhas(g: Grade): string {
  return g.map((linha, r) => (r % 2 === 0 ? linha : [...linha].reverse()).join("")).join("");
}

function serpentinaColunas(g: Grade): string {
  let out = "";
  for (let c = 0; c < g[0].length; c++) {
    const col = g.map((linha) => linha[c]);
    out += (c % 2 === 0 ? col : col.reverse()).join("");
  }
  return out;
}

/**
 * Cinco caminhos de leitura sobre a mesma grade. A saída é português corrido, e
 * o `scorePlaintext` do `bruteDecoder` elege o caminho certo sozinho — por isso
 * nenhum `forcedScore` aqui.
 */
export const decoders = bruteDecoder({
  id: "grid-read",
  name: "Leitura de grade",
  category: "transform",
  keep: 3,
  variants(input) {
    const g = lerGrade(input);
    if (!g) return [];
    return [
      { label: "quatro braços (dos cantos)", output: quatroBracos(g) },
      { label: "espiral horária", output: espiralHoraria(g) },
      { label: "espiral anti-horária", output: espiralAntiHoraria(g) },
      { label: "serpentina por linhas", output: serpentinaLinhas(g) },
      { label: "serpentina por colunas", output: serpentinaColunas(g) },
    ];
  },
});
