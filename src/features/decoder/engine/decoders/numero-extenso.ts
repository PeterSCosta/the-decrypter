import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";
import { isUseful, stripDiacritics } from "../util";

/**
 * Número por extenso ↔ dígitos — a única cifra desta bancada que é
 * genuinamente portuguesa. A prova esconde o número **escrevendo-o**: "no dia
 * quatrocentos e vinte e três da contagem" passa batido em leitura rápida, e o
 * `423` que sai daqui é a entrada natural do `a1z26`, do `letter-index`, do
 * `cep-exact` e do `date-key`.
 *
 * ## As duas direções não são simétricas — de propósito
 *
 * **extenso → dígitos** participa do fan-out automático. Pode: o portão é o
 * mais estreito da bancada — *toda* palavra da entrada tem de estar num léxico
 * de ~60 itens (unidades, dezenas, centenas, classes, ordinais) **e** a
 * sequência tem de obedecer à gramática do numeral (centena → dezena →
 * unidade, classes estritamente decrescentes). CEP, CPF, telefone, coordenada,
 * data e Base64 caem antes disso por conterem dígito; prosa cai na primeira
 * palavra fora do léxico; "um dois três" cai na gramática (unidade não segue
 * unidade). O `forcedScore` alto se paga porque, quando este portão abre, o
 * número **é** a resposta.
 *
 * **dígitos → extenso** só roda no modo "uma cifra só" (`ctx.only`). Sem essa
 * trava ela cuspiria um cartão em TODA entrada numérica da bancada — que é
 * quase toda entrada.
 *
 * ## A ligação entre as classes (a parte que as fontes brigam)
 *
 * Dentro da classe o "e" é pacífico ("quatrocentos e vinte e três"). Entre
 * classes há duas escolas: Luft/Napoleão (vírgula, é o que boleto, cheque e
 * nota fiscal usam) e Cunha (só espaço). As duas concordam no resto: a
 * **última** classe emitida entra com "e" quando vale menos de 100 ou é
 * centena exata; as demais, com o separador da escola.
 *
 * Conferido contra quatro leituras atestadas:
 * 25.045.915 → "vinte e cinco milhões, quarenta e cinco mil, novecentos e
 * quinze"; 2.135.030 → "dois milhões, cento e trinta e cinco mil e trinta";
 * 1.250.042 → "um milhão, duzentos e cinquenta mil e quarenta e dois";
 * 5.800.906.012 → "cinco bilhões oitocentos milhões novecentos e seis mil e
 * doze" (escola sem vírgula). Note que 45 mil e 906 mil ficam com **vírgula**
 * (ou espaço) mesmo valendo menos de 100 ou sendo centena: a regra do "e" vale
 * só para a última classe, não para toda classe pequena. Emitimos as duas
 * escolas como cartões distintos porque o acervo tem as duas.
 *
 * ## Gênero
 *
 * "duzentas fichas" e "duzentos reais" são o mesmo 200. Na leitura aceitamos as
 * duas formas; na escrita emitimos o feminino como cartão separado quando ele
 * difere — senão a prova que escondeu "trezentas" não bate no diff. O gênero
 * pára na classe do mil ("duzentas mil pessoas"), porque milhão/bilhão são
 * substantivos masculinos ("duzentos milhões de pessoas").
 */

const ID = "numero-extenso";
const NAME = "Número por extenso";

/** Acima disto o número não cabe nas classes que a tabela nomeia. */
const MAX_DIGITOS = 18;

/** 0–19 em [masculino, feminino] — só 1 e 2 flexionam. */
const UNIDADES: [string, string][] = [
  ["zero", "zero"],
  ["um", "uma"],
  ["dois", "duas"],
  ["três", "três"],
  ["quatro", "quatro"],
  ["cinco", "cinco"],
  ["seis", "seis"],
  ["sete", "sete"],
  ["oito", "oito"],
  ["nove", "nove"],
  ["dez", "dez"],
  ["onze", "onze"],
  ["doze", "doze"],
  ["treze", "treze"],
  ["catorze", "catorze"],
  ["quinze", "quinze"],
  ["dezesseis", "dezesseis"],
  ["dezessete", "dezessete"],
  ["dezoito", "dezoito"],
  ["dezenove", "dezenove"],
];

const DEZENAS: Record<number, string> = {
  20: "vinte",
  30: "trinta",
  40: "quarenta",
  50: "cinquenta",
  60: "sessenta",
  70: "setenta",
  80: "oitenta",
  90: "noventa",
};

/** "cento" é a forma composta; o 100 exato vira "cem" no montador. */
const CENTENAS: Record<number, [string, string]> = {
  100: ["cento", "cento"],
  200: ["duzentos", "duzentas"],
  300: ["trezentos", "trezentas"],
  400: ["quatrocentos", "quatrocentas"],
  500: ["quinhentos", "quinhentas"],
  600: ["seiscentos", "seiscentas"],
  700: ["setecentos", "setecentas"],
  800: ["oitocentos", "oitocentas"],
  900: ["novecentos", "novecentas"],
};

/** Classes, do trio 0 (unidades) ao 5, em [singular, plural]. */
const ESCALAS: [string, string][] = [
  ["", ""],
  ["mil", "mil"],
  ["milhão", "milhões"],
  ["bilhão", "bilhões"],
  ["trilhão", "trilhões"],
  ["quatrilhão", "quatrilhões"],
];

const ORD_UNIDADES = [
  "",
  "primeiro",
  "segundo",
  "terceiro",
  "quarto",
  "quinto",
  "sexto",
  "sétimo",
  "oitavo",
  "nono",
];
const ORD_DEZENAS: Record<number, string> = {
  10: "décimo",
  20: "vigésimo",
  30: "trigésimo",
  40: "quadragésimo",
  50: "quinquagésimo",
  60: "sexagésimo",
  70: "septuagésimo",
  80: "octogésimo",
  90: "nonagésimo",
};
const ORD_CENTENAS: Record<number, string> = {
  100: "centésimo",
  200: "ducentésimo",
  300: "trecentésimo",
  400: "quadringentésimo",
  500: "quingentésimo",
  600: "sexcentésimo",
  700: "septingentésimo",
  800: "octingentésimo",
  900: "nongentésimo",
};

// ---------------------------------------------------------------- léxico

/** Chaves sempre sem acento e em minúsculas — o tokenizador normaliza assim. */
const chave = (w: string) => stripDiacritics(w).toLowerCase();

/** Palavra → valor < 1000. Aceita as variantes lusitanas e as de cheque. */
const VALORES = new Map<string, number>();
for (const [i, [masc, fem]] of UNIDADES.entries()) {
  VALORES.set(chave(masc), i);
  VALORES.set(chave(fem), i);
}
for (const [v, w] of Object.entries(DEZENAS)) VALORES.set(chave(w), Number(v));
for (const [v, [masc, fem]] of Object.entries(CENTENAS)) {
  VALORES.set(chave(masc), Number(v));
  VALORES.set(chave(fem), Number(v));
}
VALORES.set("cem", 100);
// Variantes: pt-PT ("dezasseis"), grafia antiga ("quatorze", "cincoenta") e a
// forma de cheque ("hum mil"), que existe justamente para não se adulterar.
for (const [w, v] of [
  ["quatorze", 14],
  ["dezasseis", 16],
  ["dezassete", 17],
  ["dezanove", 19],
  ["cincoenta", 50],
  ["hum", 1],
] as const) {
  VALORES.set(w, v);
}

/**
 * Classe → multiplicador. "bilião"/"trilião" de pt-PT ficam FORA: na escala
 * longa portuguesa "bilião" é 10¹², não 10⁹ — aceitá-los seria escolher um dos
 * dois números por conta própria.
 */
const ESCALA_VALOR = new Map<string, number>([
  ["mil", 1e3],
  ["milhao", 1e6],
  ["milhoes", 1e6],
  ["bilhao", 1e9],
  ["bilhoes", 1e9],
  ["trilhao", 1e12],
  ["trilhoes", 1e12],
  ["quatrilhao", 1e15],
  ["quatrilhoes", 1e15],
]);

/** Ordinais são puramente aditivos e decrescentes: 1997º = milésimo + 900 + 90 + 7. */
const ORDINAIS = new Map<string, number>();
for (const [i, w] of ORD_UNIDADES.entries()) if (w) registraOrdinal(w, i);
for (const [v, w] of Object.entries(ORD_DEZENAS)) registraOrdinal(w, Number(v));
for (const [v, w] of Object.entries(ORD_CENTENAS)) registraOrdinal(w, Number(v));
for (const [w, v] of [
  ["milésimo", 1e3],
  ["milionésimo", 1e6],
  ["bilionésimo", 1e9],
  // variantes dicionarizadas das centenas altas e do 70
  ["setuagésimo", 70],
  ["tricentésimo", 300],
  ["seiscentésimo", 600],
  ["sescentésimo", 600],
  ["setingentésimo", 700],
  ["octogentésimo", 800],
  ["noningentésimo", 900],
] as const) {
  registraOrdinal(w, v);
}

/** Todo ordinal masculino termina em -o; o feminino é a mesma palavra em -a. */
function registraOrdinal(masc: string, v: number) {
  ORDINAIS.set(chave(masc), v);
  ORDINAIS.set(chave(`${masc.slice(0, -1)}a`), v);
}

// ---------------------------------------------------------- extenso → nº

/**
 * Palavras que, sozinhas, são português comum antes de serem número: artigo
 * ("um", "uma"), quantificador vago ("mil pessoas"), o zero. Fora do modo solo
 * elas não abrem cartão — "quatrocentos" abre, porque ninguém escreve
 * "quatrocentos" sem querer dizer 400.
 */
const AMBIGUAS = new Set(["um", "uma", "hum", "dois", "duas", "cem", "mil", "zero"]);

function tokeniza(input: string): string[] {
  return stripDiacritics(input.toLowerCase())
    .split(/[^a-z]+/)
    .filter(Boolean);
}

/**
 * Máquina de estados da gramática do numeral dentro de uma classe: centena,
 * depois dezena, depois unidade — nunca ao contrário, nunca repetida. É ela
 * que derruba "um dois três" e "cem cem", que o léxico sozinho deixaria passar.
 */
const LIVRE = 0;
const POS_CENTENA = 1;
const POS_DEZENA = 2;
const FECHADA = 3;

function leCardinal(tokens: string[]): bigint | null {
  let total = 0n;
  let grupo = 0n;
  let etapa: number = LIVRE;
  let ultimaEscala = Number.POSITIVE_INFINITY;
  let algo = false;

  for (const t of tokens) {
    const v = VALORES.get(t);
    if (v !== undefined) {
      if (v === 0) return tokens.length === 1 ? 0n : null;
      if (v >= 100) {
        if (etapa !== LIVRE) return null;
        etapa = POS_CENTENA;
      } else if (v >= 20) {
        if (etapa > POS_CENTENA) return null;
        etapa = POS_DEZENA;
      } else if (v >= 10) {
        if (etapa > POS_CENTENA) return null;
        etapa = FECHADA;
      } else {
        if (etapa > POS_DEZENA) return null;
        etapa = FECHADA;
      }
      grupo += BigInt(v);
      algo = true;
      continue;
    }

    const escala = ESCALA_VALOR.get(t);
    if (escala === undefined) return null;
    // "mil milhões" e "mil mil" não são numeral português.
    if (escala >= ultimaEscala) return null;
    // "mil e um" dispensa o "um" na frente; "milhão" solto, não.
    if (grupo === 0n && escala > 1e3) return null;
    ultimaEscala = escala;
    total += (grupo === 0n ? 1n : grupo) * BigInt(escala);
    grupo = 0n;
    etapa = LIVRE;
    algo = true;
  }

  return algo ? total + grupo : null;
}

function leOrdinal(tokens: string[]): bigint | null {
  let total = 0n;
  let ultimo = Number.POSITIVE_INFINITY;
  for (const t of tokens) {
    const v = ORDINAIS.get(t);
    if (v === undefined || v >= ultimo) return null;
    ultimo = v;
    total += BigInt(v);
  }
  return tokens.length ? total : null;
}

// ---------------------------------------------------------- nº → extenso

function grupoTexto(v: number, fem: boolean): string {
  if (v === 100) return "cem";
  const g = fem ? 1 : 0;
  const partes: string[] = [];
  const centena = Math.floor(v / 100) * 100;
  if (centena) partes.push(CENTENAS[centena][g]);
  const resto = v % 100;
  if (resto >= 20) {
    partes.push(DEZENAS[Math.floor(resto / 10) * 10]);
    const u = resto % 10;
    if (u) partes.push(UNIDADES[u][g]);
  } else if (resto > 0) {
    partes.push(UNIDADES[resto][g]);
  }
  return partes.join(" e ");
}

/** `virgula: false` é a escola Cunha (classes separadas só por espaço). */
function porExtenso(n: bigint, opts: { fem?: boolean; virgula?: boolean } = {}): string | null {
  if (n < 0n) return null;
  if (n === 0n) return "zero";

  const trios: number[] = [];
  for (let x = n; x > 0n; x /= 1000n) trios.push(Number(x % 1000n));
  if (trios.length > ESCALAS.length) return null;

  const partes: { v: number; texto: string }[] = [];
  for (let i = trios.length - 1; i >= 0; i--) {
    const v = trios[i];
    if (v === 0) continue;
    // O feminino pára no mil: "duzentas mil fichas", mas "duzentos milhões".
    const fem = !!opts.fem && i <= 1;
    let texto: string;
    if (i === 0) texto = grupoTexto(v, fem);
    // 1000 é "mil", nunca "um mil" (a forma de cheque é "hum mil", só na leitura).
    else if (i === 1) texto = v === 1 ? "mil" : `${grupoTexto(v, fem)} mil`;
    else texto = `${grupoTexto(v, false)} ${ESCALAS[i][v === 1 ? 0 : 1]}`;
    partes.push({ v, texto });
  }

  let out = partes[0].texto;
  for (let k = 1; k < partes.length; k++) {
    const { v, texto } = partes[k];
    const ultima = k === partes.length - 1;
    const sep = ultima && (v < 100 || v % 100 === 0) ? " e " : opts.virgula ? ", " : " ";
    out += sep + texto;
  }
  return out;
}

/** Ordinal por extenso, 1–999 — acima disso a norma se divide e nós calamos. */
function ordinalPorExtenso(n: number, fem: boolean): string | null {
  if (n < 1 || n > 999) return null;
  const partes: string[] = [];
  const c = Math.floor(n / 100) * 100;
  if (c) partes.push(ORD_CENTENAS[c]);
  const d = Math.floor((n % 100) / 10) * 10;
  if (d) partes.push(ORD_DEZENAS[d]);
  const u = n % 10;
  if (u) partes.push(ORD_UNIDADES[u]);
  const texto = partes.join(" ");
  return fem ? texto.replace(/o\b/g, "a") : texto;
}

// ------------------------------------------------------------- o decoder

const plural = (n: number) => (n === 1 ? "1 dígito" : `${n} dígitos`);

function lerExtenso(input: string, solo: boolean): DecodeCandidate[] {
  const tokens = tokeniza(input);
  if (tokens.length === 0 || tokens.length > 60) return [];

  const numericos = tokens.filter((t) => t !== "e");
  if (numericos.length === 0) return [];
  if (!solo && numericos.length === 1 && AMBIGUAS.has(numericos[0])) return [];

  const ordinal = leOrdinal(numericos);
  const n = ordinal ?? leCardinal(numericos);
  if (n === null || n < 0n) return [];
  if (!solo && n === 0n) return [];

  const digitos = n.toString();
  if (digitos.length > MAX_DIGITOS) return [];

  return [
    {
      decoderId: ID,
      decoderName: NAME,
      category: "transform",
      label: ordinal === null ? "por extenso → número" : "ordinal → número",
      output: digitos,
      notes: plural(digitos.length),
      // Dígito puro afunda no `scorePlaintext`, e este é o cartão certo sempre
      // que o portão abre — o portão é quem sustenta o score, não o contrário.
      forcedScore: 0.78,
      chainValue: digitos,
    },
  ];
}

function escreverNumero(input: string): DecodeCandidate[] {
  const limpo = input.trim().replace(/[.\s]/g, "");
  if (!/^\d{1,18}$/.test(limpo)) return [];
  const n = BigInt(limpo);

  const carta = (label: string, texto: string | null) =>
    texto
      ? [{ decoderId: ID, decoderName: NAME, category: "transform" as const, label, output: texto }]
      : [];

  const masc = porExtenso(n, { virgula: true });
  const semVirgula = porExtenso(n, { virgula: false });
  const fem = porExtenso(n, { virgula: true, fem: true });
  const num = Number(limpo);

  return [
    ...carta("número → por extenso", masc),
    ...carta("sem vírgula entre as classes", semVirgula === masc ? null : semVirgula),
    ...carta("feminino", fem === masc ? null : fem),
    ...carta("ordinal", num <= 999 ? ordinalPorExtenso(num, false) : null),
  ];
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  decode(input, ctx) {
    const solo = ctx.only === ID;
    const bruto = input.trim();
    if (!bruto || bruto.length > 400) return [];
    // Dígito na entrada só é assunto nosso no modo solo — ver o cabeçalho.
    const cands = /\d/.test(bruto) ? (solo ? escreverNumero(bruto) : []) : lerExtenso(bruto, solo);
    return cands.filter((c) => isUseful(c.output, input));
  },
  encode(input) {
    const limpo = input.trim().replace(/[.\s]/g, "");
    if (!/^\d{1,18}$/.test(limpo)) return null;
    return porExtenso(BigInt(limpo), { virgula: true });
  },
});
