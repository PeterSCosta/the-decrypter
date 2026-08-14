/**
 * A mini-linguagem das condições da aba Matriz.
 *
 * POR QUE UM AVALIADOR PRÓPRIO, e não `eval`/`new Function`: a condição é texto
 * que a pessoa cola às 3 da manhã, às vezes copiado do enunciado. Com `eval`,
 * um `constructor` perdido no meio da expressão alcança o escopo global do
 * navegador; e mesmo isolando o escopo, um erro de digitação vira `SyntaxError`
 * cru, sem posição, no console. Aqui o interpretador é um tokenizador + descida
 * recursiva por precedência (umas 200 linhas), a única coisa que existe são as
 * variáveis e funções da lista branca, e todo erro sai como mensagem pt-BR com
 * a POSIÇÃO do caractere culpado — que é o que a interface sublinha.
 *
 * Identificadores são resolvidos sem acento e sem caixa (`média` = `media`,
 * `nCols` = `ncols`): quem digita rápido não acerta acento. As chaves de
 * `Ambiente.vars` já devem vir dobradas (caixa baixa, sem acento).
 *
 * Decimal na expressão é com PONTO (`n > 1.5`) — a vírgula separa argumentos.
 * O conteúdo da CÉLULA continua aceitando a vírgula decimal pt-BR.
 */

import { fold, parseNumeroBR, splitChars } from "./matrix";

export type Valor = number | string | boolean | Valor[];

export interface ExprErro {
  mensagem: string;
  /** Índice 0-based do caractere na expressão. A interface aponta ali. */
  pos: number;
}

export type Funcao = (args: Valor[], pos: number) => Valor;

export interface Ambiente {
  /** Chaves dobradas (caixa baixa, sem acento) — veja `fold`. */
  vars: Record<string, Valor>;
  /** Funções extras da chamada (a `viz`, que precisa da matriz, entra por aqui). */
  funcs?: Record<string, Funcao>;
}

/** Teto de tamanho: uma condição maior que isto é colagem errada, não condição. */
export const MAX_FONTE = 2_000;

// -------------------------------------------------------------------- erros

class ErroExpr extends Error {
  constructor(
    readonly mensagem: string,
    readonly pos: number,
  ) {
    super(mensagem);
    this.name = "ErroExpr";
  }
}

// -------------------------------------------------------------- tokenizador

type TipoToken = "num" | "txt" | "id" | "op" | "fim";

interface Token {
  tipo: TipoToken;
  texto: string;
  num: number;
  pos: number;
}

/** Operadores de dois caracteres primeiro — senão `<=` viraria `<` seguido de `=`. */
const OPS2 = ["<=", ">=", "==", "!=", "<>", "&&", "||"];
const OPS1 = "+-*/%^=<>!(),";

function tokenize(fonte: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < fonte.length) {
    const ch = fonte[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/\d/.test(ch) || (ch === "." && /\d/.test(fonte[i + 1] ?? ""))) {
      const inicio = i;
      while (i < fonte.length && /[\d.]/.test(fonte[i])) i++;
      const cru = fonte.slice(inicio, i);
      const n = Number(cru);
      if (!Number.isFinite(n)) throw new ErroExpr(`número inválido: ${cru}`, inicio);
      out.push({ tipo: "num", texto: cru, num: n, pos: inicio });
      continue;
    }
    if (ch === '"' || ch === "'") {
      const inicio = i;
      i++;
      let texto = "";
      while (i < fonte.length && fonte[i] !== ch) {
        if (fonte[i] === "\\" && i + 1 < fonte.length) {
          i++;
          texto += fonte[i] === "n" ? "\n" : fonte[i];
        } else texto += fonte[i];
        i++;
      }
      if (i >= fonte.length) throw new ErroExpr("falta fechar as aspas do texto", inicio);
      i++;
      out.push({ tipo: "txt", texto, num: 0, pos: inicio });
      continue;
    }
    if (/[\p{L}_]/u.test(ch)) {
      const inicio = i;
      while (i < fonte.length && /[\p{L}\p{N}_]/u.test(fonte[i])) i++;
      out.push({ tipo: "id", texto: fold(fonte.slice(inicio, i)), num: 0, pos: inicio });
      continue;
    }
    const par = fonte.slice(i, i + 2);
    if (OPS2.includes(par)) {
      out.push({ tipo: "op", texto: par, num: 0, pos: i });
      i += 2;
      continue;
    }
    if (OPS1.includes(ch)) {
      out.push({ tipo: "op", texto: ch, num: 0, pos: i });
      i++;
      continue;
    }
    throw new ErroExpr(`não entendi o caractere "${ch}"`, i);
  }
  out.push({ tipo: "fim", texto: "", num: 0, pos: fonte.length });
  return out;
}

// -------------------------------------------------------------------- árvore

type No =
  | { t: "num"; v: number }
  | { t: "txt"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "var"; nome: string; pos: number }
  | { t: "cha"; nome: string; args: No[]; pos: number }
  | { t: "un"; op: string; a: No; pos: number }
  | { t: "bin"; op: string; a: No; b: No; pos: number };

export interface Programa {
  fonte: string;
  no: No;
}

export type CompileResult = { ok: true; programa: Programa } | { ok: false; erro: ExprErro };
export type EvalResult = { ok: true; valor: Valor } | { ok: false; erro: ExprErro };

const OU = new Set(["ou", "or"]);
const E = new Set(["e", "and"]);
const NAO = new Set(["nao", "not"]);
const EM = new Set(["em", "in"]);
const COMPARADORES = new Set(["=", "==", "!=", "<>", "<", "<=", ">", ">="]);

/**
 * Descida recursiva, do operador mais fraco ao mais forte:
 * `ou` → `e` → comparação/`em` → `+ -` → `* / %` → unário → `^` → primário.
 * `^` é associativo à direita e mais forte que o menos unário (`-2^2` = -4),
 * como na matemática de papel.
 */
function parse(fonte: string): No {
  const ts = tokenize(fonte);
  let p = 0;
  const olhar = () => ts[p];
  const comer = () => ts[p++];

  const ehOp = (texto: string) => {
    const t = ts[p];
    return t.tipo === "op" && t.texto === texto;
  };
  const ehPalavra = (conjunto: Set<string>) => {
    const t = ts[p];
    return t.tipo === "id" && conjunto.has(t.texto);
  };

  function primario(): No {
    const t = comer();
    if (t.tipo === "num") return { t: "num", v: t.num };
    if (t.tipo === "txt") return { t: "txt", v: t.texto };
    if (t.tipo === "op" && t.texto === "(") {
      const dentro = ou();
      if (!ehOp(")")) throw new ErroExpr("falta fechar o parêntese", olhar().pos);
      comer();
      return dentro;
    }
    if (t.tipo === "id") {
      if (t.texto === "verdadeiro" || t.texto === "true") return { t: "bool", v: true };
      if (t.texto === "falso" || t.texto === "false") return { t: "bool", v: false };
      if (ehOp("(")) {
        comer();
        const args: No[] = [];
        if (!ehOp(")")) {
          args.push(ou());
          while (ehOp(",")) {
            comer();
            args.push(ou());
          }
        }
        if (!ehOp(")")) throw new ErroExpr(`falta fechar o parêntese de ${t.texto}`, olhar().pos);
        comer();
        return { t: "cha", nome: t.texto, args, pos: t.pos };
      }
      return { t: "var", nome: t.texto, pos: t.pos };
    }
    if (t.tipo === "op" && t.texto === ")") throw new ErroExpr("parêntese fechado a mais", t.pos);
    throw new ErroExpr(
      t.tipo === "fim" ? "a expressão terminou no meio" : "esperava um valor",
      t.pos,
    );
  }

  function potencia(): No {
    const base = primario();
    if (ehOp("^")) {
      const pos = olhar().pos;
      comer();
      return { t: "bin", op: "^", a: base, b: unario(), pos };
    }
    return base;
  }

  function unario(): No {
    const t = olhar();
    if (ehOp("-") || ehOp("+") || ehOp("!") || ehPalavra(NAO)) {
      comer();
      const op = t.tipo === "id" ? "nao" : t.texto === "!" ? "nao" : t.texto;
      return { t: "un", op, a: unario(), pos: t.pos };
    }
    return potencia();
  }

  function produto(): No {
    let no = unario();
    while (ehOp("*") || ehOp("/") || ehOp("%")) {
      const t = comer();
      no = { t: "bin", op: t.texto, a: no, b: unario(), pos: t.pos };
    }
    return no;
  }

  function soma(): No {
    let no = produto();
    while (ehOp("+") || ehOp("-")) {
      const t = comer();
      no = { t: "bin", op: t.texto, a: no, b: produto(), pos: t.pos };
    }
    return no;
  }

  function comparacao(): No {
    let no = soma();
    while ((olhar().tipo === "op" && COMPARADORES.has(olhar().texto)) || ehPalavra(EM)) {
      const t = comer();
      const op = t.tipo === "id" ? "em" : t.texto;
      no = { t: "bin", op, a: no, b: soma(), pos: t.pos };
    }
    return no;
  }

  function e(): No {
    let no = comparacao();
    while (ehOp("&&") || ehPalavra(E)) {
      const t = comer();
      no = { t: "bin", op: "e", a: no, b: comparacao(), pos: t.pos };
    }
    return no;
  }

  function ou(): No {
    let no = e();
    while (ehOp("||") || ehPalavra(OU)) {
      const t = comer();
      no = { t: "bin", op: "ou", a: no, b: e(), pos: t.pos };
    }
    return no;
  }

  const raiz = ou();
  if (olhar().tipo !== "fim") {
    throw new ErroExpr("sobrou coisa depois do fim da expressão", olhar().pos);
  }
  return raiz;
}

/** Compila a condição. Nunca lança: o erro volta como dado, com a posição. */
export function compile(fonte: string): CompileResult {
  if (fonte.length > MAX_FONTE) {
    return { ok: false, erro: { mensagem: "expressão longa demais", pos: MAX_FONTE } };
  }
  try {
    return { ok: true, programa: { fonte, no: parse(fonte) } };
  } catch (e) {
    if (e instanceof ErroExpr) return { ok: false, erro: { mensagem: e.mensagem, pos: e.pos } };
    throw e;
  }
}

// ---------------------------------------------------------------- coerções

export function paraNumero(v: Valor): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (Array.isArray(v)) return Number.NaN;
  const n = parseNumeroBR(v);
  return n === null ? Number.NaN : n;
}

export function paraTexto(v: Valor): string {
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "verdadeiro" : "falso";
  if (Array.isArray(v)) return v.map(paraTexto).join("");
  return Number.isFinite(v) ? String(v) : "";
}

/** Vazio é falso: texto em branco, 0, lista vazia e NaN (célula sem número). */
export function truthy(v: Valor): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) && v !== 0;
  if (Array.isArray(v)) return v.length > 0;
  return v.trim() !== "";
}

function lista(v: Valor): Valor[] {
  return Array.isArray(v) ? v : [v];
}

/** Achata os argumentos e devolve só os números — `soma(linha)` e `soma(1,2,3)` valem o mesmo. */
function numeros(args: Valor[]): number[] {
  const out: number[] = [];
  for (const a of args) {
    for (const v of lista(a)) {
      const n = paraNumero(v);
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out;
}

/** Igualdade útil em prova: numérica quando os dois lados são números, textual (sem acento/caixa) senão. */
function igual(a: Valor, b: Valor): boolean {
  const na = paraNumero(a);
  const nb = paraNumero(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb;
  return fold(paraTexto(a)) === fold(paraTexto(b));
}

function ordem(a: Valor, b: Valor): number {
  const na = paraNumero(a);
  const nb = paraNumero(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na < nb ? -1 : na > nb ? 1 : 0;
  const ta = fold(paraTexto(a));
  const tb = fold(paraTexto(b));
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

/**
 * `v em lista`. A lista pode ser um array (`tudo`), um texto com separadores
 * (`"A,E,I,O,U"`) ou um texto colado sem separador nenhum — neste último caso
 * cada caractere é um item, porque `v em "AEIOU"` é como as pessoas escrevem.
 */
function pertence(a: Valor, b: Valor): boolean {
  let itens: Valor[];
  if (Array.isArray(b)) itens = b;
  else {
    const t = paraTexto(b);
    itens = /[,;/|\s]/.test(t) ? t.split(/[,;/|\s]+/).filter(Boolean) : splitChars(t);
  }
  return itens.some((item) => igual(a, item));
}

function regex(padrao: Valor, pos: number, quem: string): RegExp {
  try {
    return new RegExp(fold(paraTexto(padrao)), "i");
  } catch {
    throw new ErroExpr(`expressão regular inválida em ${quem}`, pos);
  }
}

function ehPrimo(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
  return true;
}

// --------------------------------------------------------------- biblioteca

function arg(args: Valor[], i: number): Valor {
  return args[i] ?? "";
}

function exigir(args: Valor[], quantos: number, nome: string, pos: number): void {
  if (args.length < quantos) {
    throw new ErroExpr(
      `${nome} precisa de ${quantos} ${quantos === 1 ? "argumento" : "argumentos"}`,
      pos,
    );
  }
}

const HELPERS: Record<string, Funcao> = {
  soma: (a) => numeros(a).reduce((s, n) => s + n, 0),
  media: (a) => {
    const ns = numeros(a);
    return ns.length === 0 ? 0 : ns.reduce((s, n) => s + n, 0) / ns.length;
  },
  min: (a) => {
    const ns = numeros(a);
    return ns.length === 0 ? Number.NaN : Math.min(...ns);
  },
  max: (a) => {
    const ns = numeros(a);
    return ns.length === 0 ? Number.NaN : Math.max(...ns);
  },
  /** `conta(linhaTxt)` = células com conteúdo; `conta(linhaTxt, "[aeiou]")` = as que casam. */
  conta: (a, pos) => {
    const itens = lista(arg(a, 0));
    if (a.length < 2) return itens.filter((v) => paraTexto(v).trim() !== "").length;
    const re = regex(a[1], pos, "conta");
    return itens.filter((v) => re.test(fold(paraTexto(v)))).length;
  },
  abs: (a) => Math.abs(paraNumero(arg(a, 0))),
  raiz: (a) => Math.sqrt(paraNumero(arg(a, 0))),
  resto: (a, pos) => {
    exigir(a, 2, "resto", pos);
    const b = paraNumero(a[1]);
    if (b === 0) throw new ErroExpr("resto por zero", pos);
    // Módulo sempre positivo: `resto(-1, 3)` = 2, que é o que a contagem de
    // posição espera quando o índice anda para trás.
    return ((paraNumero(a[0]) % b) + b) % b;
  },
  par: (a) => {
    const n = paraNumero(arg(a, 0));
    return Number.isInteger(n) && n % 2 === 0;
  },
  impar: (a) => {
    const n = paraNumero(arg(a, 0));
    return Number.isInteger(n) && Math.abs(n % 2) === 1;
  },
  primo: (a) => ehPrimo(paraNumero(arg(a, 0))),
  quadrado: (a) => {
    const n = paraNumero(arg(a, 0));
    if (!Number.isInteger(n) || n < 0) return false;
    const r = Math.round(Math.sqrt(n));
    return r * r === n;
  },
  contem: (a) => fold(paraTexto(arg(a, 0))).includes(fold(paraTexto(arg(a, 1)))),
  comeca: (a) => fold(paraTexto(arg(a, 0))).startsWith(fold(paraTexto(arg(a, 1)))),
  termina: (a) => fold(paraTexto(arg(a, 0))).endsWith(fold(paraTexto(arg(a, 1)))),
  maiusc: (a) => paraTexto(arg(a, 0)).toUpperCase(),
  minusc: (a) => paraTexto(arg(a, 0)).toLowerCase(),
  tam: (a) => {
    const v = arg(a, 0);
    return Array.isArray(v) ? v.length : splitChars(paraTexto(v)).length;
  },
  casa: (a, pos) => {
    exigir(a, 2, "casa", pos);
    return regex(a[1], pos, "casa").test(fold(paraTexto(a[0])));
  },
  vogal: (a) => /^[aeiou]$/.test(fold(paraTexto(arg(a, 0))).trim()),
  consoante: (a) => /^[b-df-hj-np-tv-z]$/.test(fold(paraTexto(arg(a, 0))).trim()),
  digito: (a) => /^\d$/.test(paraTexto(arg(a, 0)).trim()),
  letra: (a) => /^\p{L}$/u.test(paraTexto(arg(a, 0)).trim()),
  vazio: (a) => {
    const v = arg(a, 0);
    return Array.isArray(v) ? v.length === 0 : paraTexto(v).trim() === "";
  },
  num: (a) => paraNumero(arg(a, 0)),
  texto: (a) => paraTexto(arg(a, 0)),
  /** Posição da letra no alfabeto (A=1 … Z=26); 0 se não for letra. É o A1Z26 de sempre. */
  ord: (a) => {
    const c = fold(paraTexto(arg(a, 0)))
      .trim()
      .charCodeAt(0);
    return c >= 97 && c <= 122 ? c - 96 : 0;
  },
};

/** Apelidos em inglês (e as grafias que a pressa produz) — mesma função, outro nome. */
const ALIAS: Record<string, string> = {
  sum: "soma",
  avg: "media",
  mean: "media",
  count: "conta",
  sqrt: "raiz",
  mod: "resto",
  even: "par",
  odd: "impar",
  prime: "primo",
  square: "quadrado",
  contains: "contem",
  includes: "contem",
  starts: "comeca",
  startswith: "comeca",
  ends: "termina",
  endswith: "termina",
  upper: "maiusc",
  lower: "minusc",
  len: "tam",
  length: "tam",
  tamanho: "tam",
  matches: "casa",
  regex: "casa",
  vowel: "vogal",
  consonant: "consoante",
  digit: "digito",
  letter: "letra",
  empty: "vazio",
  number: "num",
  numero: "num",
  text: "texto",
  str: "texto",
  vizinho: "viz",
  neighbor: "viz",
  neighborn: "vizn",
  neighborm: "vizm",
};

function resolverFuncao(nome: string, amb: Ambiente): Funcao | null {
  const alvo = ALIAS[nome] ?? nome;
  const extra = amb.funcs;
  if (extra && Object.hasOwn(extra, alvo)) return extra[alvo];
  if (Object.hasOwn(HELPERS, alvo)) return HELPERS[alvo];
  return null;
}

// --------------------------------------------------------------- avaliação

function avaliar(no: No, amb: Ambiente): Valor {
  switch (no.t) {
    case "num":
    case "txt":
    case "bool":
      return no.v;
    case "var": {
      if (Object.hasOwn(amb.vars, no.nome)) return amb.vars[no.nome];
      const apelido = ALIAS[no.nome];
      if (apelido && Object.hasOwn(amb.vars, apelido)) return amb.vars[apelido];
      throw new ErroExpr(`não conheço "${no.nome}"`, no.pos);
    }
    case "cha": {
      const fn = resolverFuncao(no.nome, amb);
      if (!fn) throw new ErroExpr(`não conheço a função "${no.nome}"`, no.pos);
      return fn(
        no.args.map((a) => avaliar(a, amb)),
        no.pos,
      );
    }
    case "un": {
      const v = avaliar(no.a, amb);
      if (no.op === "nao") return !truthy(v);
      if (no.op === "-") return -paraNumero(v);
      return paraNumero(v);
    }
    case "bin":
      return binario(no, amb);
  }
}

function binario(no: { op: string; a: No; b: No; pos: number }, amb: Ambiente): Valor {
  // `e`/`ou` avaliam curto-circuitando: a segunda metade pode custar caro (uma
  // varredura de linha) e pode ser a que estoura, então nem se toca nela.
  if (no.op === "e") return truthy(avaliar(no.a, amb)) ? truthy(avaliar(no.b, amb)) : false;
  if (no.op === "ou") return truthy(avaliar(no.a, amb)) ? true : truthy(avaliar(no.b, amb));

  const a = avaliar(no.a, amb);
  const b = avaliar(no.b, amb);
  switch (no.op) {
    case "=":
    case "==":
      return igual(a, b);
    case "!=":
    case "<>":
      return !igual(a, b);
    case "<":
      return ordem(a, b) < 0;
    case "<=":
      return ordem(a, b) <= 0;
    case ">":
      return ordem(a, b) > 0;
    case ">=":
      return ordem(a, b) >= 0;
    case "em":
      return pertence(a, b);
    case "+": {
      // Só soma quando os DOIS lados são número; senão junta os textos, que é o
      // que `v + "?"` quer dizer numa condição de prova.
      const na = paraNumero(a);
      const nb = paraNumero(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na + nb;
      return paraTexto(a) + paraTexto(b);
    }
    case "-":
      return paraNumero(a) - paraNumero(b);
    case "*":
      return paraNumero(a) * paraNumero(b);
    case "/": {
      const d = paraNumero(b);
      if (d === 0) throw new ErroExpr("divisão por zero", no.pos);
      return paraNumero(a) / d;
    }
    case "%": {
      const d = paraNumero(b);
      if (d === 0) throw new ErroExpr("resto por zero", no.pos);
      return ((paraNumero(a) % d) + d) % d;
    }
    case "^":
      return paraNumero(a) ** paraNumero(b);
    default:
      throw new ErroExpr(`operador desconhecido "${no.op}"`, no.pos);
  }
}

/** Roda o programa. Nunca lança: erro de execução volta como dado, com posição. */
export function evaluate(programa: Programa, amb: Ambiente): EvalResult {
  try {
    return { ok: true, valor: avaliar(programa.no, amb) };
  } catch (e) {
    if (e instanceof ErroExpr) return { ok: false, erro: { mensagem: e.mensagem, pos: e.pos } };
    if (e instanceof RangeError) {
      return { ok: false, erro: { mensagem: "expressão aninhada demais", pos: 0 } };
    }
    throw e;
  }
}

/** Compila e roda de uma vez — conveniência para teste e para a barra de fórmula. */
export function run(fonte: string, amb: Ambiente): EvalResult {
  const c = compile(fonte);
  return c.ok ? evaluate(c.programa, amb) : { ok: false, erro: c.erro };
}

export interface RefItem {
  nome: string;
  assinatura: string;
  descricao: string;
}

/** Referência para o painel de ajuda da aba — a interface lista isto, não redigita. */
export const FUNCOES_REF: RefItem[] = [
  { nome: "soma", assinatura: "soma(lista…)", descricao: "soma os números" },
  { nome: "media", assinatura: "media(lista…)", descricao: "média dos números" },
  { nome: "min", assinatura: "min(lista…)", descricao: "menor número" },
  { nome: "max", assinatura: "max(lista…)", descricao: "maior número" },
  {
    nome: "conta",
    assinatura: "conta(lista, padrão?)",
    descricao: "quantos itens casam com o padrão (sem padrão: quantos têm conteúdo)",
  },
  { nome: "abs", assinatura: "abs(n)", descricao: "valor absoluto" },
  { nome: "raiz", assinatura: "raiz(n)", descricao: "raiz quadrada" },
  { nome: "resto", assinatura: "resto(a, b)", descricao: "resto da divisão (sempre positivo)" },
  { nome: "par", assinatura: "par(n)", descricao: "é par" },
  { nome: "impar", assinatura: "impar(n)", descricao: "é ímpar" },
  { nome: "primo", assinatura: "primo(n)", descricao: "é primo" },
  { nome: "quadrado", assinatura: "quadrado(n)", descricao: "é quadrado perfeito" },
  { nome: "contem", assinatura: "contem(texto, parte)", descricao: "contém (ignora acento/caixa)" },
  { nome: "comeca", assinatura: "comeca(texto, parte)", descricao: "começa com" },
  { nome: "termina", assinatura: "termina(texto, parte)", descricao: "termina com" },
  { nome: "maiusc", assinatura: "maiusc(texto)", descricao: "em maiúsculas" },
  { nome: "minusc", assinatura: "minusc(texto)", descricao: "em minúsculas" },
  { nome: "tam", assinatura: "tam(x)", descricao: "quantidade de caracteres (ou de itens)" },
  { nome: "casa", assinatura: "casa(texto, padrão)", descricao: "casa com a expressão regular" },
  { nome: "vogal", assinatura: "vogal(x)", descricao: "é uma vogal" },
  { nome: "consoante", assinatura: "consoante(x)", descricao: "é uma consoante" },
  { nome: "digito", assinatura: "digito(x)", descricao: "é um algarismo" },
  { nome: "letra", assinatura: "letra(x)", descricao: "é uma letra" },
  { nome: "vazio", assinatura: "vazio(x)", descricao: "está vazia" },
  { nome: "num", assinatura: "num(x)", descricao: "converte para número" },
  { nome: "texto", assinatura: "texto(x)", descricao: "converte para texto" },
  { nome: "ord", assinatura: "ord(letra)", descricao: "posição no alfabeto (A=1 … Z=26)" },
];

export const OPERADORES_REF: RefItem[] = [
  { nome: "aritmética", assinatura: "+ - * / % ^", descricao: "% é resto; ^ é potência" },
  {
    nome: "comparação",
    assinatura: "= != < <= > >=",
    descricao: "número com número, texto com texto",
  },
  { nome: "lógica", assinatura: "e · ou · não", descricao: "também && || !" },
  {
    nome: "pertence",
    assinatura: 'v em "A,E,I,O,U"',
    descricao: "está na lista (aceita lista colada ou array)",
  },
];
