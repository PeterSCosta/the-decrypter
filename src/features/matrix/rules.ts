/**
 * O motor de regras da aba Matriz: ESCOPO × CONDIÇÃO × AÇÃO.
 *
 * O pedido do dono é literal — "definir regras por elemento, linha, coluna ou
 * matriz. e determinar se pinta, ou se faz outra coisa". As regras são uma
 * LISTA ORDENADA, cada uma ligável e desligável, porque na prova se testa a
 * hipótese A, desliga, testa a B, e refazer a pintura à mão não é opção.
 *
 * Dois modos de composição, e os dois aparecem de verdade:
 *  - **camadas**: cada regra passa pela grade inteira, na ordem. A regra 3 vê o
 *    que as regras 1 e 2 pintaram (`m` e `d` já vêm mudados).
 *  - **primeira**: cada CÉLULA procura a primeira regra que casa e para ali —
 *    é o que dá `senão` (`manter` vira guarda: "se X, deixa como está").
 *
 * As condições leem a ORIGEM (`v`, `n`) e as ações escrevem no DESTINO. É essa
 * separação que dá a máscara-lê-origem da Batalha Naval de 2022 de graça: a
 * grade de tiros pinta o destino, a extração colhe as letras do crachá.
 *
 * O escopo `linha`/`coluna` avalia a condição UMA VEZ por linha/coluna e aplica
 * a ação na linha/coluna inteira — sem isso, "regra por linha" seria só "regra
 * por elemento repetida", e agregado ("a linha tem mais de 3 vogais") não caberia.
 */

import {
  type Ambiente,
  type ExprErro,
  type Funcao,
  type Programa,
  type RefItem,
  type Valor,
  compile,
  evaluate,
  truthy,
} from "./expr";
import {
  CHEIO_PADRAO,
  type CellRef,
  type Matrix,
  type OrdemLeitura,
  cellLabel,
  cloneMatrix,
  makeDestination,
  parseNumeroBR,
  readingOrder,
} from "./matrix";

export type Escopo = "elemento" | "linha" | "coluna" | "matriz";

export type TipoAcao =
  | "pintar"
  | "limpar"
  | "alternar"
  | "marcar"
  | "manter"
  | "substituir"
  | "apagar"
  | "cor"
  | "extrair";

export type ModoComposicao = "camadas" | "primeira";

export interface Acao {
  tipo: TipoAcao;
  /** `marcar`: o caractere. `substituir`: o texto novo. Ignorado nas outras. */
  texto?: string;
  /** `pintar`/`marcar`/`alternar`: qual estado (1..N). Padrão 1. */
  estado?: number;
}

export interface Rule {
  id: string;
  /** Rótulo livre que aparece na lista ("linhas com 3+ vogais"). */
  nome?: string;
  escopo: Escopo;
  /** Expressão da condição. Vazia = sempre verdadeira. */
  condicao: string;
  acao: Acao;
  ativa: boolean;
}

/** Caracteres de marcação oferecidos pela ação `marcar`. */
export const MARCADORES = ["█", "▓", "░", "X", "·", "#"];

/** Teto de estados do multi-estado (nonograma colorido). Mais que isso ninguém distingue. */
export const MAX_ESTADOS = 6;

export const ESCOPOS: { valor: Escopo; rotulo: string; ajuda: string }[] = [
  { valor: "elemento", rotulo: "elemento", ajuda: "a condição é avaliada célula a célula" },
  { valor: "linha", rotulo: "linha", ajuda: "uma vez por linha; a ação vale para a linha inteira" },
  {
    valor: "coluna",
    rotulo: "coluna",
    ajuda: "uma vez por coluna; a ação vale para a coluna inteira",
  },
  { valor: "matriz", rotulo: "matriz", ajuda: "uma vez para tudo (serve para normalizar)" },
];

export const ACOES: { valor: TipoAcao; rotulo: string; ajuda: string }[] = [
  { valor: "pintar", rotulo: "pintar", ajuda: "preenche a célula" },
  { valor: "limpar", rotulo: "limpar", ajuda: "despinta (não mexe no texto)" },
  { valor: "alternar", rotulo: "alternar", ajuda: "pinta o que está vazio e despinta o pintado" },
  { valor: "marcar", rotulo: "marcar com caractere", ajuda: "pinta usando █ ▓ ░ X · #" },
  {
    valor: "manter",
    rotulo: "manter o valor",
    ajuda: "não mexe — serve de guarda no modo primeira",
  },
  { valor: "substituir", rotulo: "substituir por outro valor", ajuda: "troca o texto da célula" },
  { valor: "apagar", rotulo: "apagar o conteúdo", ajuda: "esvazia o texto da célula" },
  { valor: "cor", rotulo: "pintar com cor", ajuda: "mapa de calor pela escala dos números" },
  { valor: "extrair", rotulo: "extrair", ajuda: "colhe o conteúdo na ordem de leitura" },
];

export const MODOS: { valor: ModoComposicao; rotulo: string; ajuda: string }[] = [
  {
    valor: "camadas",
    rotulo: "todas se aplicam (camadas)",
    ajuda: "cada regra passa pela grade na ordem; a seguinte vê o que a anterior fez",
  },
  {
    valor: "primeira",
    rotulo: "a primeira que casa vence",
    ajuda: "cada célula para na primeira regra que a pega",
  },
];

/** Variáveis visíveis na condição — a interface lista isto no painel de ajuda. */
export const VARIAVEIS_REF: RefItem[] = [
  { nome: "v", assinatura: "v", descricao: "texto da célula (na origem)" },
  { nome: "n", assinatura: "n", descricao: "número da célula (vazio se não for número)" },
  { nome: "m", assinatura: "m", descricao: "marca atual no destino (0 = despintada)" },
  { nome: "d", assinatura: "d", descricao: "texto atual no destino" },
  { nome: "r, c", assinatura: "r · c", descricao: "linha e coluna, contando de 1" },
  { nome: "r0, c0", assinatura: "r0 · c0", descricao: "linha e coluna, contando de 0" },
  { nome: "linha, coluna", assinatura: "linha · coluna", descricao: "números da linha/coluna" },
  {
    nome: "linhaTxt, colunaTxt",
    assinatura: "linhaTxt · colunaTxt",
    descricao: "textos da linha/coluna",
  },
  { nome: "tudo, tudoTxt", assinatura: "tudo · tudoTxt", descricao: "a matriz inteira" },
  { nome: "nLinhas, nCols", assinatura: "nLinhas · nCols", descricao: "tamanho da grade" },
  {
    nome: "viz",
    assinatura: "viz(dl, dc) · vizn(dl, dc) · vizm(dl, dc)",
    descricao: "vizinha deslocada: texto, número e marca",
  },
];

export interface RuleError {
  regraId: string;
  mensagem: string;
  /** Posição do caractere na condição — a interface sublinha ali. */
  pos: number;
  /** Célula onde estourou ("B3"), quando o erro é de execução. */
  celula: string | null;
}

export interface Extraction {
  regraId: string;
  texto: string;
  celulas: CellRef[];
}

export interface ApplyOptions {
  /** Padrão: `camadas`. */
  modo?: ModoComposicao;
  /** Ordem de leitura usada pela ação `extrair`. Padrão: `linhas`. */
  ordem?: OrdemLeitura;
}

export interface ApplyResult {
  /** O destino novo — a entrada nunca é modificada. */
  matrix: Matrix;
  /** Tudo que as ações `extrair` colheram, na ordem de leitura. */
  extracted: string;
  /** Uma entrada por regra `extrair`, para quem quiser as tiras separadas. */
  extractions: Extraction[];
  /** id da regra → quantas células ela pegou. Regra com 0 é hipótese morta. */
  hits: Record<string, number>;
  errors: RuleError[];
}

let contador = 0;

/** Regra nova com os padrões da casa. A interface só preenche o que mudou. */
export function createRule(patch: Partial<Rule> = {}): Rule {
  contador++;
  return {
    id: `regra-${contador}`,
    escopo: "elemento",
    condicao: "",
    acao: { tipo: "pintar" },
    ativa: true,
    ...patch,
  };
}

/** Erro de sintaxe da condição, para validar enquanto se digita. `null` = está boa. */
export function validateRule(regra: Rule): ExprErro | null {
  if (regra.condicao.trim() === "") return null;
  const c = compile(regra.condicao);
  return c.ok ? null : c.erro;
}

/** Uma linha legível para a lista de regras da interface. */
export function describeRule(regra: Rule): string {
  const cond = regra.condicao.trim() === "" ? "sempre" : `se ${regra.condicao.trim()}`;
  const acao = ACOES.find((a) => a.valor === regra.acao.tipo)?.rotulo ?? regra.acao.tipo;
  const alvo = regra.acao.texto ? ` "${regra.acao.texto}"` : "";
  return `${regra.escopo} · ${cond} · ${acao}${alvo}`;
}

interface Preparada {
  regra: Rule;
  /** `null` = condição vazia, sempre verdadeira. */
  prog: Programa | null;
}

/** Erro de execução agregado: interessa a mensagem, a primeira célula e o tamanho do estrago. */
interface ErroRuntime {
  erro: ExprErro;
  celula: string;
  vezes: number;
}

const CELULA_VAZIA = { v: "", n: null as number | null, mark: 0 };

export function applyRules(
  origem: Matrix,
  destino: Matrix | null,
  regras: Rule[],
  opts: ApplyOptions = {},
): ApplyResult {
  const modo = opts.modo ?? "camadas";
  const ordem = opts.ordem ?? "linhas";
  const dest = destino ? cloneMatrix(destino) : makeDestination(origem, false);
  const rows = dest.rows;
  const cols = dest.cols;

  const errors: RuleError[] = [];
  const hits: Record<string, number> = {};
  const colhidas = new Map<string, CellRef[]>();
  const runtime = new Map<string, ErroRuntime>();

  const preparadas: Preparada[] = [];
  for (const regra of regras) {
    if (!regra.ativa) continue;
    hits[regra.id] = 0;
    if (regra.condicao.trim() === "") {
      preparadas.push({ regra, prog: null });
      continue;
    }
    const c = compile(regra.condicao);
    if (!c.ok) {
      // Regra que não compila é regra que não roda: aplicar "metade" dela seria
      // pintar lixo em cima de meia hora de trabalho.
      errors.push({ regraId: regra.id, mensagem: c.erro.mensagem, pos: c.erro.pos, celula: null });
      continue;
    }
    preparadas.push({ regra, prog: c.programa });
  }

  if (rows === 0 || cols === 0 || preparadas.length === 0) {
    return { matrix: dest, extracted: "", extractions: [], hits, errors };
  }

  // --- tudo que vem da ORIGEM é constante durante a aplicação: calcula uma vez.
  const org = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < origem.rows && c < origem.cols ? origem.cells[r][c] : CELULA_VAZIA;

  const linhasTxt: string[][] = [];
  const linhasNum: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const txt: string[] = [];
    const num: number[] = [];
    for (let c = 0; c < cols; c++) {
      const cel = org(r, c);
      txt.push(cel.v);
      if (cel.n !== null) num.push(cel.n);
    }
    linhasTxt.push(txt);
    linhasNum.push(num);
  }
  const colsTxt: string[][] = [];
  const colsNum: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const txt: string[] = [];
    const num: number[] = [];
    for (let r = 0; r < rows; r++) {
      const cel = org(r, c);
      txt.push(cel.v);
      if (cel.n !== null) num.push(cel.n);
    }
    colsTxt.push(txt);
    colsNum.push(num);
  }
  const tudoTxt = linhasTxt.flat();
  const tudoNum = linhasNum.flat();

  // Escala do mapa de calor: a faixa dos números da ORIGEM inteira, para que a
  // cor de uma célula não mude quando a regra ao lado é ligada.
  const heatMin = tudoNum.length > 0 ? Math.min(...tudoNum) : 0;
  const heatMax = tudoNum.length > 0 ? Math.max(...tudoNum) : 0;

  // Cursor compartilhado: as funções de vizinhança são criadas UMA vez e leem
  // daqui. Criar três closures por célula custaria mais que a conta toda.
  const cursor = { r: 0, c: 0 };
  const desloc = (args: Valor[]): [number, number] => {
    const dl = Math.trunc(numeroDe(args[0]));
    const dc = Math.trunc(numeroDe(args[1]));
    return [cursor.r + (Number.isFinite(dl) ? dl : 0), cursor.c + (Number.isFinite(dc) ? dc : 0)];
  };
  const funcs: Record<string, Funcao> = {
    viz: (args) => {
      const [r, c] = desloc(args);
      return org(r, c).v;
    },
    vizn: (args) => {
      const [r, c] = desloc(args);
      return org(r, c).n ?? Number.NaN;
    },
    vizm: (args) => {
      const [r, c] = desloc(args);
      return r >= 0 && c >= 0 && r < rows && c < cols ? dest.cells[r][c].mark : 0;
    },
  };

  const base = {
    nlinhas: rows,
    ncols: cols,
    nrows: rows,
    tudo: tudoNum,
    tudotxt: tudoTxt,
    allvals: tudoNum,
    alltxt: tudoTxt,
  };

  function envCelula(r: number, c: number): Ambiente {
    const o = org(r, c);
    const d = dest.cells[r][c];
    return {
      vars: {
        ...base,
        v: o.v,
        n: o.n ?? Number.NaN,
        m: d.mark,
        d: d.v,
        r: r + 1,
        c: c + 1,
        r0: r,
        c0: c,
        linha: linhasNum[r],
        coluna: colsNum[c],
        linhatxt: linhasTxt[r],
        colunatxt: colsTxt[c],
        rowvals: linhasNum[r],
        colvals: colsNum[c],
        rowtxt: linhasTxt[r],
        coltxt: colsTxt[c],
      },
      funcs,
    };
  }

  /**
   * No escopo linha/coluna/matriz não existe "a célula": `v` vira o texto todo
   * emendado (dá `contem(v, "CAFE")` de graça), `n` a soma dos números e `m`
   * quantas células já estão pintadas ali.
   */
  function envFaixa(escopo: Escopo, indice: number): Ambiente {
    const txt =
      escopo === "linha" ? linhasTxt[indice] : escopo === "coluna" ? colsTxt[indice] : tudoTxt;
    const num =
      escopo === "linha" ? linhasNum[indice] : escopo === "coluna" ? colsNum[indice] : tudoNum;
    let marcadas = 0;
    let destTxt = "";
    for (const { r, c } of refsDaFaixa(escopo, indice)) {
      const d = dest.cells[r][c];
      if (d.mark > 0) marcadas++;
      destTxt += d.v;
    }
    return {
      vars: {
        ...base,
        v: txt.join(""),
        n: num.reduce((s, x) => s + x, 0),
        m: marcadas,
        d: destTxt,
        r: escopo === "linha" ? indice + 1 : 0,
        c: escopo === "coluna" ? indice + 1 : 0,
        r0: escopo === "linha" ? indice : 0,
        c0: escopo === "coluna" ? indice : 0,
        linha: escopo === "coluna" ? [] : num,
        coluna: escopo === "linha" ? [] : num,
        linhatxt: escopo === "coluna" ? [] : txt,
        colunatxt: escopo === "linha" ? [] : txt,
        rowvals: escopo === "coluna" ? [] : num,
        colvals: escopo === "linha" ? [] : num,
        rowtxt: escopo === "coluna" ? [] : txt,
        coltxt: escopo === "linha" ? [] : txt,
      },
      funcs,
    };
  }

  function refsDaFaixa(escopo: Escopo, indice: number): CellRef[] {
    const out: CellRef[] = [];
    if (escopo === "linha") for (let c = 0; c < cols; c++) out.push({ r: indice, c });
    else if (escopo === "coluna") for (let r = 0; r < rows; r++) out.push({ r, c: indice });
    else for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ r, c });
    return out;
  }

  function condicao(p: Preparada, amb: Ambiente, r: number, c: number): boolean {
    if (!p.prog) return true;
    cursor.r = r;
    cursor.c = c;
    const res = evaluate(p.prog, amb);
    if (res.ok) return truthy(res.valor);
    const antes = runtime.get(p.regra.id);
    if (antes) antes.vezes++;
    else runtime.set(p.regra.id, { erro: res.erro, celula: cellLabel(r, c), vezes: 1 });
    return false;
  }

  function aplicar(regra: Rule, r: number, c: number): void {
    const cel = dest.cells[r][c];
    const estado = Math.max(1, Math.min(MAX_ESTADOS, Math.trunc(regra.acao.estado ?? 1)));
    switch (regra.acao.tipo) {
      case "pintar":
        cel.mark = estado;
        break;
      case "limpar":
        cel.mark = 0;
        cel.glyph = null;
        cel.heat = null;
        break;
      case "alternar":
        cel.mark = cel.mark > 0 ? 0 : estado;
        break;
      case "marcar":
        cel.glyph =
          regra.acao.texto && regra.acao.texto.length > 0 ? regra.acao.texto : CHEIO_PADRAO;
        cel.mark = estado;
        break;
      case "manter":
        break;
      case "substituir":
        cel.v = regra.acao.texto ?? "";
        cel.n = parseNumeroBR(cel.v);
        break;
      case "apagar":
        cel.v = "";
        cel.n = null;
        break;
      case "cor": {
        // A cor NÃO pinta a máscara: é leitura visual. Quem quer as duas coisas
        // empilha uma regra `pintar` — foi de propósito.
        const n = org(r, c).n;
        cel.heat =
          n === null ? null : heatMax === heatMin ? 1 : (n - heatMin) / (heatMax - heatMin);
        break;
      }
      case "extrair": {
        const lista = colhidas.get(regra.id);
        if (lista) lista.push({ r, c });
        else colhidas.set(regra.id, [{ r, c }]);
        break;
      }
    }
    hits[regra.id]++;
  }

  const ordemRefs = readingOrder(dest, ordem);

  if (modo === "camadas") {
    for (const p of preparadas) {
      const { escopo } = p.regra;
      if (escopo === "elemento") {
        for (const { r, c } of ordemRefs) {
          if (condicao(p, envCelula(r, c), r, c)) aplicar(p.regra, r, c);
        }
      } else if (escopo === "matriz") {
        if (condicao(p, envFaixa("matriz", 0), 0, 0)) {
          for (const { r, c } of ordemRefs) aplicar(p.regra, r, c);
        }
      } else {
        const total = escopo === "linha" ? rows : cols;
        for (let i = 0; i < total; i++) {
          const r = escopo === "linha" ? i : 0;
          const c = escopo === "coluna" ? i : 0;
          if (!condicao(p, envFaixa(escopo, i), r, c)) continue;
          for (const ref of refsDaFaixa(escopo, i)) aplicar(p.regra, ref.r, ref.c);
        }
      }
    }
  } else {
    // Modo "primeira": a verdade das regras de faixa é decidida ANTES da
    // varredura, contra o destino como ele chegou. Reavaliar a linha no meio
    // dela mesma, enquanto ela é pintada, daria um resultado que ninguém
    // consegue prever olhando a lista de regras.
    const faixa = new Map<string, boolean[]>();
    for (const p of preparadas) {
      const { escopo } = p.regra;
      if (escopo === "elemento") continue;
      if (escopo === "matriz") {
        faixa.set(p.regra.id, [condicao(p, envFaixa("matriz", 0), 0, 0)]);
        continue;
      }
      const total = escopo === "linha" ? rows : cols;
      const verdades: boolean[] = [];
      for (let i = 0; i < total; i++) {
        const r = escopo === "linha" ? i : 0;
        const c = escopo === "coluna" ? i : 0;
        verdades.push(condicao(p, envFaixa(escopo, i), r, c));
      }
      faixa.set(p.regra.id, verdades);
    }

    for (const { r, c } of ordemRefs) {
      for (const p of preparadas) {
        const { escopo } = p.regra;
        let casa: boolean;
        if (escopo === "elemento") casa = condicao(p, envCelula(r, c), r, c);
        else if (escopo === "matriz") casa = faixa.get(p.regra.id)?.[0] ?? false;
        else casa = faixa.get(p.regra.id)?.[escopo === "linha" ? r : c] ?? false;
        if (casa) {
          aplicar(p.regra, r, c);
          break;
        }
      }
    }
  }

  for (const [regraId, e] of runtime) {
    const sufixo = e.vezes > 1 ? ` (${e.vezes} células, a 1ª em ${e.celula})` : ` (em ${e.celula})`;
    errors.push({ regraId, mensagem: e.erro.mensagem + sufixo, pos: e.erro.pos, celula: e.celula });
  }

  // A ordem de colheita é sempre a ordem de leitura escolhida, não a ordem em
  // que as regras rodaram — senão a mensagem sai embaralhada no modo camadas.
  const posicao = new Map<number, number>();
  ordemRefs.forEach((ref, i) => posicao.set(ref.r * cols + ref.c, i));
  const extractions: Extraction[] = [];
  let extracted = "";
  for (const p of preparadas) {
    const lista = colhidas.get(p.regra.id);
    if (!lista) continue;
    const celulas = [...lista].sort(
      (a, b) => (posicao.get(a.r * cols + a.c) ?? 0) - (posicao.get(b.r * cols + b.c) ?? 0),
    );
    const texto = celulas.map(({ r, c }) => org(r, c).v).join("");
    extractions.push({ regraId: p.regra.id, texto, celulas });
    extracted += texto;
  }

  return { matrix: dest, extracted, extractions, hits, errors };
}

/** Coerção mínima para os argumentos de `viz` (a de verdade mora no `expr`). */
function numeroDe(v: Valor | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(",", "."));
  return Number.NaN;
}
