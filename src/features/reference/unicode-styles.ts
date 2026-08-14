/**
 * Texto "estilizado" — as tabelas, nos dois sentidos.
 *
 * 𝐧𝐞𝐠𝐫𝐢𝐭𝐨, 𝑖𝑡á𝑙𝑖𝑐𝑜, 𝓈𝒸𝓇𝒾𝓅𝓉, 𝔣𝔯𝔞𝔨𝔱𝔲𝔯, ⓒⓘⓡⓒⓤⓛⓞ, ｆｕｌｌｗｉｄｔｈ, sᴍᴀʟʟ ᴄᴀᴘs e ∀ǝɹʇıqoɹ **não são
 * fontes**. São code points diferentes: o "𝐇" de rede social é U+1D407, não o
 * U+0048 do teclado. Por isso o texto colado de um perfil chega na bancada como
 * lixo — nenhum decoder casa, e o scorer não reconhece uma palavra sequer.
 *
 * Estas tabelas servem às DUAS pontas: a aba Fontes usa `apply` (ASCII →
 * estilizado) e o decoder `unicode-styles` usa `reverse` (estilizado → ASCII).
 * Mapa único de propósito — se as duas pontas divergirem, a bancada estiliza
 * num alfabeto e normaliza de outro, e ninguém percebe.
 *
 * O caso de ouro é o indicador regional: 🇧🇷 não é um desenho, é o par de letras
 * B+R do código ISO 3166 do país. Prova de bandeiras vira prova de siglas.
 */

const MAIUSCULAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MINUSCULAS = "abcdefghijklmnopqrstuvwxyz";
const DIGITOS_1_9 = "123456789";

/** Descrição de um estilo, para a aba Fontes. */
export interface UnicodeStyle {
  /** Slug estável — chave de lista e id de candidato. */
  id: string;
  nome: string;
  /** Bloco Unicode de origem, para a legenda. */
  bloco: string;
  /** A leitura correta inverte a ordem dos caracteres (cabeça para baixo). */
  inverteOrdem: boolean;
  /** ASCII → estilizado. Caractere sem par no bloco sai intacto. */
  apply(texto: string): string;
}

/** O mesmo estilo com a tabela crua — é o que o decoder consome. */
export interface UnicodeStyleTable extends UnicodeStyle {
  /** estilizado → ASCII. */
  reverse: ReadonlyMap<string, string>;
  /**
   * Quantos caracteres precisam casar para o estilo ser DETECTADO sozinho.
   * Sobe onde o bloco invade texto legítimo (² e ³ de "km²" são superscript).
   */
  minAcertos: number;
  /**
   * O reverso mapeia ASCII para ASCII (só o de cabeça para baixo: q↔b, u↔n).
   * Estilo assim nunca entra "de carona" num texto que outro estilo detectou —
   * embaralharia as letras normais da frase.
   */
  mapeiaAscii: boolean;
}

interface EstiloSpec {
  id: string;
  nome: string;
  bloco: string;
  pares: [string, string][];
  /** Grafias alternativas que só valem na volta (geradores divergem). */
  alternativos?: [string, string][];
  minAcertos?: number;
  inverteOrdem?: boolean;
}

/** Série contígua a partir de um bloco; `buracos` cobre os code points cedidos. */
function serie(
  letras: string,
  base: number,
  buracos: Record<string, string> = {},
): [string, string][] {
  return [...letras].map(
    (ch, i) => [ch, buracos[ch] ?? String.fromCodePoint(base + i)] as [string, string],
  );
}

const ehAscii = (ch: string) => (ch.codePointAt(0) ?? 0) < 128;

function estilo(spec: EstiloSpec): UnicodeStyleTable {
  const forward = new Map(spec.pares);
  const reverse = new Map<string, string>();
  for (const [ascii, glifo] of spec.pares) if (!reverse.has(glifo)) reverse.set(glifo, ascii);
  for (const [glifo, ascii] of spec.alternativos ?? [])
    if (!reverse.has(glifo)) reverse.set(glifo, ascii);

  const inverteOrdem = spec.inverteOrdem ?? false;
  let mapeiaAscii = false;
  for (const glifo of reverse.keys()) if (ehAscii(glifo)) mapeiaAscii = true;

  return {
    id: spec.id,
    nome: spec.nome,
    bloco: spec.bloco,
    inverteOrdem,
    minAcertos: spec.minAcertos ?? 2,
    reverse,
    mapeiaAscii,
    apply(texto) {
      let out = "";
      for (const ch of texto) {
        // Blocos incompletos (só maiúscula, só minúscula) ainda estilizam a
        // outra caixa — melhor um ⓐ para "A" do que devolver o "A" cru.
        out +=
          forward.get(ch) ?? forward.get(ch.toLowerCase()) ?? forward.get(ch.toUpperCase()) ?? ch;
      }
      return inverteOrdem ? [...out].reverse().join("") : out;
    },
  };
}

// --------------------------------------------------------------------------
// Mathematical Alphanumeric Symbols (U+1D400–U+1D7FF).
// Os "buracos" são as letras que o Unicode já tinha publicado em Letterlike
// Symbols e não duplicou no bloco novo — o code point lá dentro é RESERVADO, e
// gerar por aritmética simples produz caractere inexistente.
// --------------------------------------------------------------------------

const BURACOS_ITALICO_MIN = { h: "ℎ" }; // ℎ, constante de Planck
const BURACOS_SCRIPT_MAI = {
  B: "ℬ",
  E: "ℰ",
  F: "ℱ",
  H: "ℋ",
  I: "ℐ",
  L: "ℒ",
  M: "ℳ",
  R: "ℛ",
};
const BURACOS_SCRIPT_MIN = { e: "ℯ", g: "ℊ", o: "ℴ" };
const BURACOS_FRAKTUR_MAI = {
  C: "ℭ",
  H: "ℌ",
  I: "ℑ",
  R: "ℜ",
  Z: "ℨ",
};
const BURACOS_DUPLA_MAI = {
  C: "ℂ",
  H: "ℍ",
  N: "ℕ",
  P: "ℙ",
  Q: "ℚ",
  R: "ℝ",
  Z: "ℤ",
};

// --------------------------------------------------------------------------
// Fullwidth (U+FF01–U+FF5E): o ASCII imprimível inteiro deslocado de 0xFEE0,
// mais o espaço ideográfico. Gerado, não enumerado.
// --------------------------------------------------------------------------

const PARES_FULLWIDTH: [string, string][] = [];
for (let cp = 0x21; cp <= 0x7e; cp++) {
  PARES_FULLWIDTH.push([String.fromCodePoint(cp), String.fromCodePoint(cp + 0xfee0)]);
}
PARES_FULLWIDTH.push([" ", "　"]);

// --------------------------------------------------------------------------
// Versalete (small caps): não é bloco, é uma coleção de letras de IPA. Não
// existe versalete de "x" — fica o "x" comum, como em todo gerador.
// --------------------------------------------------------------------------

const PARES_VERSALETE: [string, string][] = Object.entries({
  a: "ᴀ",
  b: "ʙ",
  c: "ᴄ",
  d: "ᴅ",
  e: "ᴇ",
  f: "ꜰ",
  g: "ɢ",
  h: "ʜ",
  i: "ɪ",
  j: "ᴊ",
  k: "ᴋ",
  l: "ʟ",
  m: "ᴍ",
  n: "ɴ",
  o: "ᴏ",
  p: "ᴘ",
  q: "ꞯ",
  r: "ʀ",
  s: "ꜱ",
  t: "ᴛ",
  u: "ᴜ",
  v: "ᴠ",
  w: "ᴡ",
  y: "ʏ",
  z: "ᴢ",
});

// --------------------------------------------------------------------------
// Sobrescrito e subscrito: blocos INCOMPLETOS e espalhados. O "q" sobrescrito
// não existe; o subscrito só tem meia dúzia de letras. Por isso o mínimo de
// detecção sobe para 3 — ¹ ² ³ moram no Latin-1 e aparecem em "km²" honesto.
// --------------------------------------------------------------------------

const PARES_SOBRESCRITO: [string, string][] = Object.entries({
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",
  f: "ᶠ",
  g: "ᵍ",
  h: "ʰ",
  i: "ⁱ",
  j: "ʲ",
  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  n: "ⁿ",
  o: "ᵒ",
  p: "ᵖ",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",
  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",
  z: "ᶻ",
});

const PARES_SUBSCRITO: [string, string][] = Object.entries({
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
});

// --------------------------------------------------------------------------
// De cabeça para baixo: a tabela do upsidedowntext.com, a que os geradores de
// rede social usam. O estilo é o único que também INVERTE A ORDEM — girar o
// papel troca o começo pelo fim. Metade dos pares é ASCII↔ASCII (q↔b, u↔n,
// d↔p, m↔w), e é por isso que ele exige o mínimo para participar.
// --------------------------------------------------------------------------

const PARES_INVERTIDO: [string, string][] = Object.entries({
  a: "ɐ",
  b: "q",
  c: "ɔ",
  d: "p",
  e: "ǝ",
  f: "ɟ",
  g: "ƃ",
  h: "ɥ",
  i: "ᴉ",
  j: "ɾ",
  k: "ʞ",
  l: "l",
  m: "ɯ",
  n: "u",
  o: "o",
  p: "d",
  q: "b",
  r: "ɹ",
  s: "s",
  t: "ʇ",
  u: "n",
  v: "ʌ",
  w: "ʍ",
  x: "x",
  y: "ʎ",
  z: "z",
  A: "∀",
  B: "\u{10412}",
  C: "Ɔ",
  D: "◖",
  E: "Ǝ",
  F: "Ⅎ",
  G: "⅁",
  H: "H",
  I: "I",
  J: "ſ",
  K: "⋊",
  L: "˥",
  M: "W",
  N: "N",
  O: "O",
  P: "Ԁ",
  Q: "Ό",
  R: "ᴚ",
  S: "S",
  T: "⊥",
  U: "∩",
  V: "Λ",
  W: "M",
  X: "X",
  Y: "⅄",
  Z: "Z",
  "0": "0",
  "1": "Ɩ",
  "2": "ᄅ",
  "3": "Ɛ",
  "4": "ㄣ",
  "5": "ϛ",
  "6": "9",
  "7": "ㄥ",
  "8": "8",
  "9": "6",
  ".": "˙",
  ",": "'",
  "?": "¿",
  "!": "¡",
  "'": ",",
  '"': "„",
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "&": "⅋",
  _: "‾",
});

/** O "i" girado varia entre geradores: ᴉ (U+1D09) aqui, ı (U+0131) lá. */
const ALTERNATIVOS_INVERTIDO: [string, string][] = [
  ["ı", "i"],
  ["ᴥ", "w"],
];

/**
 * Todos os estilos. A ORDEM importa duas vezes: é a ordem da legenda na aba
 * Fontes e o desempate da normalização quando dois blocos casam o mesmo
 * caractere (não acontece hoje, mas o desempate precisa ser determinístico).
 */
export const UNICODE_STYLES: UnicodeStyleTable[] = [
  estilo({
    id: "negrito",
    nome: "Negrito matemático",
    bloco: "Mathematical Bold",
    pares: [
      ...serie(MAIUSCULAS, 0x1d400),
      ...serie(MINUSCULAS, 0x1d41a),
      ...serie("0123456789", 0x1d7ce),
    ],
  }),
  estilo({
    id: "italico",
    nome: "Itálico matemático",
    bloco: "Mathematical Italic",
    pares: [...serie(MAIUSCULAS, 0x1d434), ...serie(MINUSCULAS, 0x1d44e, BURACOS_ITALICO_MIN)],
  }),
  estilo({
    id: "negrito-italico",
    nome: "Negrito itálico matemático",
    bloco: "Mathematical Bold Italic",
    pares: [...serie(MAIUSCULAS, 0x1d468), ...serie(MINUSCULAS, 0x1d482)],
  }),
  estilo({
    id: "script",
    nome: "Script (cursiva)",
    bloco: "Mathematical Script",
    pares: [
      ...serie(MAIUSCULAS, 0x1d49c, BURACOS_SCRIPT_MAI),
      ...serie(MINUSCULAS, 0x1d4b6, BURACOS_SCRIPT_MIN),
    ],
  }),
  estilo({
    id: "script-negrito",
    nome: "Script negrito",
    bloco: "Mathematical Bold Script",
    pares: [...serie(MAIUSCULAS, 0x1d4d0), ...serie(MINUSCULAS, 0x1d4ea)],
  }),
  estilo({
    id: "fraktur",
    nome: "Fraktur (gótica)",
    bloco: "Mathematical Fraktur",
    pares: [...serie(MAIUSCULAS, 0x1d504, BURACOS_FRAKTUR_MAI), ...serie(MINUSCULAS, 0x1d51e)],
  }),
  estilo({
    id: "fraktur-negrito",
    nome: "Fraktur negrito",
    bloco: "Mathematical Bold Fraktur",
    pares: [...serie(MAIUSCULAS, 0x1d56c), ...serie(MINUSCULAS, 0x1d586)],
  }),
  estilo({
    id: "vazado",
    nome: "Vazado (double-struck)",
    bloco: "Mathematical Double-Struck",
    pares: [
      ...serie(MAIUSCULAS, 0x1d538, BURACOS_DUPLA_MAI),
      ...serie(MINUSCULAS, 0x1d552),
      ...serie("0123456789", 0x1d7d8),
    ],
  }),
  estilo({
    id: "sans",
    nome: "Sem serifa",
    bloco: "Mathematical Sans-Serif",
    pares: [
      ...serie(MAIUSCULAS, 0x1d5a0),
      ...serie(MINUSCULAS, 0x1d5ba),
      ...serie("0123456789", 0x1d7e2),
    ],
  }),
  estilo({
    id: "sans-negrito",
    nome: "Sem serifa negrito",
    bloco: "Mathematical Sans-Serif Bold",
    pares: [
      ...serie(MAIUSCULAS, 0x1d5d4),
      ...serie(MINUSCULAS, 0x1d5ee),
      ...serie("0123456789", 0x1d7ec),
    ],
  }),
  estilo({
    id: "sans-italico",
    nome: "Sem serifa itálico",
    bloco: "Mathematical Sans-Serif Italic",
    pares: [...serie(MAIUSCULAS, 0x1d608), ...serie(MINUSCULAS, 0x1d622)],
  }),
  estilo({
    id: "sans-negrito-italico",
    nome: "Sem serifa negrito itálico",
    bloco: "Mathematical Sans-Serif Bold Italic",
    pares: [...serie(MAIUSCULAS, 0x1d63c), ...serie(MINUSCULAS, 0x1d656)],
  }),
  estilo({
    id: "mono",
    nome: "Monoespaçado",
    bloco: "Mathematical Monospace",
    pares: [
      ...serie(MAIUSCULAS, 0x1d670),
      ...serie(MINUSCULAS, 0x1d68a),
      ...serie("0123456789", 0x1d7f6),
    ],
  }),
  estilo({
    id: "fullwidth",
    nome: "Largura total (fullwidth)",
    bloco: "Halfwidth and Fullwidth Forms",
    pares: PARES_FULLWIDTH,
  }),
  estilo({
    id: "circulado",
    nome: "Circulado",
    bloco: "Enclosed Alphanumerics",
    pares: [
      ...serie(MAIUSCULAS, 0x24b6),
      ...serie(MINUSCULAS, 0x24d0),
      ...serie(DIGITOS_1_9, 0x2460),
      ["0", "⓪"],
    ],
  }),
  estilo({
    id: "circulado-negativo",
    nome: "Circulado negativo",
    bloco: "Enclosed Alphanumeric Supplement",
    pares: [...serie(MAIUSCULAS, 0x1f150), ...serie(DIGITOS_1_9, 0x2776), ["0", "⓿"]],
  }),
  estilo({
    id: "parenteses",
    nome: "Entre parênteses",
    bloco: "Enclosed Alphanumerics",
    pares: [
      ...serie(MAIUSCULAS, 0x1f110),
      ...serie(MINUSCULAS, 0x249c),
      ...serie(DIGITOS_1_9, 0x2474),
    ],
  }),
  estilo({
    id: "quadrado",
    nome: "Quadrado",
    bloco: "Enclosed Alphanumeric Supplement",
    pares: serie(MAIUSCULAS, 0x1f130),
  }),
  estilo({
    id: "quadrado-negativo",
    nome: "Quadrado negativo",
    bloco: "Enclosed Alphanumeric Supplement",
    pares: serie(MAIUSCULAS, 0x1f170),
  }),
  estilo({
    id: "versalete",
    nome: "Versalete (small caps)",
    bloco: "IPA Extensions / Phonetic Extensions",
    pares: PARES_VERSALETE,
  }),
  estilo({
    id: "sobrescrito",
    nome: "Sobrescrito",
    bloco: "Superscripts and Subscripts",
    pares: PARES_SOBRESCRITO,
    minAcertos: 3,
  }),
  estilo({
    id: "subscrito",
    nome: "Subscrito",
    bloco: "Superscripts and Subscripts",
    pares: PARES_SUBSCRITO,
    minAcertos: 3,
  }),
  estilo({
    id: "indicador-regional",
    nome: "Indicador regional (bandeiras)",
    bloco: "Regional Indicator Symbols",
    pares: serie(MAIUSCULAS, 0x1f1e6),
  }),
  estilo({
    id: "invertido",
    nome: "De cabeça para baixo",
    bloco: "IPA Extensions / vários",
    pares: PARES_INVERTIDO,
    alternativos: ALTERNATIVOS_INVERTIDO,
    inverteOrdem: true,
  }),
];

/** Busca por id, para a aba Fontes montar a lista sem repetir a varredura. */
export const UNICODE_STYLE_BY_ID: ReadonlyMap<string, UnicodeStyleTable> = new Map(
  UNICODE_STYLES.map((e) => [e.id, e]),
);

export interface UnicodeNormalizacao {
  /** ASCII, na MESMA ordem em que veio. */
  texto: string;
  /** Estilos reconhecidos, do mais presente ao menos. */
  estilos: UnicodeStyleTable[];
  /** Caracteres não-ASCII (fora espaços) que casaram numa tabela. */
  acertos: number;
  /** Fração dos caracteres visíveis que casou — é o portão anti-ruído. */
  cobertura: number;
}

/**
 * Estilizado → ASCII. Devolve `null` quando nenhum estilo alcança o próprio
 * mínimo: prosa acentuada em português (á, ç, ã) NÃO tem par em tabela nenhuma
 * e sai daqui sem candidato, que é o comportamento que segura o ruído.
 *
 * A ordem NÃO é invertida aqui, nem quando o estilo é o de cabeça para baixo —
 * quem decide a leitura é quem chama (o decoder oferece as duas).
 */
export function normalizeUnicodeStyles(texto: string): UnicodeNormalizacao | null {
  const chars = [...texto];
  const acertosPorEstilo = new Map<string, number>();
  let visiveis = 0;

  for (const ch of chars) {
    if (/\s/.test(ch)) continue;
    visiveis++;
    if (ehAscii(ch)) continue;
    for (const e of UNICODE_STYLES) {
      if (e.reverse.has(ch)) acertosPorEstilo.set(e.id, (acertosPorEstilo.get(e.id) ?? 0) + 1);
    }
  }

  const acertos = (e: UnicodeStyleTable) => acertosPorEstilo.get(e.id) ?? 0;
  if (!UNICODE_STYLES.some((e) => acertos(e) >= e.minAcertos)) return null;

  // Detectado UM estilo, os outros entram de carona com um acerto só: texto de
  // rede social mistura blocos (𝐍𝐄𝐆𝐑𝐈𝐓𝐎 com ① no meio) e traduzir metade é pior
  // que não traduzir. Fica de fora quem mapeia ASCII, que embaralharia a frase.
  const participantes = UNICODE_STYLES.filter((e) =>
    e.mapeiaAscii ? acertos(e) >= e.minAcertos : acertos(e) >= 1,
  ).sort((a, b) => acertos(b) - acertos(a));

  let out = "";
  let casados = 0;
  for (const ch of chars) {
    const estilo = participantes.find((e) => e.reverse.has(ch));
    out += estilo?.reverse.get(ch) ?? ch;
    // Conta o CARACTERE, não o estilo: dois blocos que casassem o mesmo glifo
    // inflariam a cobertura e furariam o portão do decoder.
    if (estilo && !ehAscii(ch) && !/\s/.test(ch)) casados++;
  }

  return {
    texto: out,
    estilos: participantes,
    acertos: casados,
    cobertura: visiveis === 0 ? 0 : casados / visiveis,
  };
}
