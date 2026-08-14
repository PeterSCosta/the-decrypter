/**
 * Fontes — o lado "eu VEJO um símbolo, que letra é essa?" das provas.
 *
 * Duas famílias que resolvem problemas diferentes e por isso ficam separadas na
 * tela:
 *
 * 1. **Fontes de símbolo do sistema** (Wingdings, Webdings, Symbol, Zapf
 *    Dingbats). São *fontes*: o símbolo não é um caractere, é o desenho que a
 *    fonte dá para a letra `A`. Copiar o glifo não existe — copiar devolve `A`.
 *    E se a fonte não estiver instalada na máquina, o navegador mostra a letra
 *    normal em silêncio. Esse silêncio é o erro perigoso: a pessoa compara
 *    letras latinas com a imagem da prova e conclui errado. Por isso a
 *    disponibilidade é MEDIDA (largura no canvas contra fallbacks) e a ausência
 *    é dita em voz alta em vez de renderizada.
 *
 * 2. **Estilos Unicode** (𝐛𝐨𝐥𝐝, 𝓼𝓬𝓻𝓲𝓹𝓽, ⓒⓘⓡⓒⓛⓔⓓ…). São *codepoints*: funcionam
 *    em qualquer máquina e são copiáveis. As tabelas vivem em
 *    `@/features/reference/unicode-styles` e a aba só as consome.
 *
 * Âncora do acervo: P22 de 2023 (ITC) veio escrita em Wingdings — a prova se
 * resolve casando a imagem contra a GRADE de referência A–Z/a–z/0–9, não
 * renderizando o texto de quem joga. A grade é o produto principal daqui.
 *
 * Este arquivo é puro: nada de DOM. A medição de largura entra por injeção
 * (`statusFromProbes`), o que mantém o teste rodando em jsdom sem canvas.
 */

// --------------------------------------------------------------- catálogo ---

/** De onde a fonte costuma vir — é o que explica a ausência na máquina de quem joga. */
export type FontOrigin = "windows" | "mac" | "ambos";

export interface SymbolFont {
  id: string;
  label: string;
  /** Pronto para CSS e para o shorthand do canvas (já vem com aspas). */
  family: string;
  origin: FontOrigin;
  /** Uma frase: o que a fonte é e quando ela aparece numa prova. */
  note: string;
  /** De onde ela vem, para quem não a tem entender que não é bug da ferramenta. */
  source: string;
  /**
   * Só a Symbol tem equivalente Unicode determinístico (é o alfabeto grego).
   * Nas dingbats o mapa Unicode é parcial e disputado — inventar tabela ali
   * seria pior do que não ter: a pessoa leria a prova errado com ar de certeza.
   */
  hasUnicodeEquivalent: boolean;
}

export const SYMBOL_FONTS: readonly SymbolFont[] = [
  {
    id: "wingdings",
    label: "Wingdings",
    family: '"Wingdings"',
    origin: "ambos",
    note: "A clássica das gincanas: as letras viram mãos, setas, caixas, estrelas e faces. A P22 de 2023 (ITC) foi escrita nela.",
    source: "Vem no Windows; no macOS chega junto com o Microsoft Office.",
    hasUnicodeEquivalent: false,
  },
  {
    id: "wingdings-2",
    label: "Wingdings 2",
    family: '"Wingdings 2"',
    origin: "ambos",
    note: "Segunda leva: marcas de conferência, caixas, algarismos em círculo e mais setas.",
    source: "Vem com o Microsoft Office (Windows e macOS).",
    hasUnicodeEquivalent: false,
  },
  {
    id: "wingdings-3",
    label: "Wingdings 3",
    family: '"Wingdings 3"',
    origin: "ambos",
    note: "Quase só setas e triângulos — a candidata quando a imagem da prova só tem direções.",
    source: "Vem com o Microsoft Office (Windows e macOS).",
    hasUnicodeEquivalent: false,
  },
  {
    id: "webdings",
    label: "Webdings",
    family: '"Webdings"',
    origin: "ambos",
    note: "Ícones de página web: casa, lupa, olho, mapa, relógio. Costuma ser confundida com Wingdings na imagem.",
    source: "Vem no Windows e no macOS.",
    hasUnicodeEquivalent: false,
  },
  {
    id: "symbol",
    label: "Symbol",
    family: '"Symbol"',
    origin: "ambos",
    note: "Não é dingbat: é o alfabeto GREGO. Cada letra latina corresponde a uma grega — e essa correspondência está tabelada aqui embaixo.",
    source: "Vem no Windows e no macOS.",
    hasUnicodeEquivalent: true,
  },
  {
    id: "zapf-dingbats",
    label: "Zapf Dingbats",
    family: '"Zapf Dingbats", "ZapfDingbats", "Dingbats"',
    origin: "mac",
    note: "Tesouras, canetas, estrelas, flores e as setas grossas. Boa parte dos glifos também existe no bloco Dingbats do Unicode.",
    source: "Vem no macOS. No Windows normalmente não existe.",
    hasUnicodeEquivalent: false,
  },
] as const;

export function findSymbolFont(id: string): SymbolFont | undefined {
  return SYMBOL_FONTS.find((f) => f.id === id);
}

// ---------------------------------------------------------- disponibilidade ---

/**
 * Texto de sonda: letras maiúsculas, minúsculas e dígitos. Nas dingbats cada um
 * desses vira um desenho de largura própria, então a soma diverge muito da do
 * fallback — que é exatamente o sinal que se quer medir.
 */
export const DETECTION_SAMPLE = "ABCDEFGHIJabcdefghij0123456789";

/**
 * Três fallbacks porque a comparação é contra a fonte que o navegador usaria no
 * lugar: se por azar a candidata tiver a métrica idêntica à monoespaçada padrão,
 * a serifada ou a sem serifa denunciam.
 */
export const DETECTION_FALLBACKS = ["monospace", "serif", "sans-serif"] as const;

/**
 * Larguras de canvas são determinísticas: mesma fonte e mesmo texto devolvem o
 * mesmo número. A folga existe só contra ruído de subpixel de implementações
 * diferentes, não para tolerar semelhança.
 */
export const WIDTH_EPSILON = 0.05;

export interface WidthProbe {
  /** Família genérica usada como base da comparação. */
  fallback: string;
  /** Largura da amostra renderizada só no fallback. */
  base: number;
  /** Largura da amostra com a fonte candidata na frente do fallback. */
  withFont: number;
}

/**
 * `indeterminado` não é sinônimo de ausente: é "esta máquina não me deixou
 * medir" (canvas indisponível, jsdom, contexto negado). Dizer "ausente" aí
 * seria mentir na direção contrária.
 */
export type FontStatus = "checando" | "disponivel" | "ausente" | "indeterminado";

export function statusFromProbes(probes: readonly WidthProbe[]): FontStatus {
  const usable = probes.filter((p) => Number.isFinite(p.base) && Number.isFinite(p.withFont));
  if (usable.length === 0) return "indeterminado";
  // Uma divergência basta: significa que o navegador NÃO caiu no fallback.
  return usable.some((p) => Math.abs(p.withFont - p.base) > WIDTH_EPSILON)
    ? "disponivel"
    : "ausente";
}

/** Shorthand de fonte para `ctx.font` — o canvas exige tamanho antes da família. */
export function fontShorthand(family: string, px = 72): string {
  return `${px}px ${family}`;
}

export const STATUS_LABEL: Record<FontStatus, string> = {
  checando: "verificando…",
  disponivel: "instalada",
  ausente: "não instalada",
  indeterminado: "não deu para verificar",
};

// --------------------------------------------------- grade de referência ---

export type BandId = "maiusculas" | "minusculas" | "digitos";

export interface GridBand {
  id: BandId;
  label: string;
  chars: string[];
}

function range(from: number, to: number): string[] {
  const out: string[] = [];
  for (let c = from; c <= to; c++) out.push(String.fromCharCode(c));
  return out;
}

/** As três faixas que se casam com a imagem da prova, na ordem em que se olha. */
export const GRID_BANDS: readonly GridBand[] = [
  { id: "maiusculas", label: "A–Z", chars: range(65, 90) },
  { id: "minusculas", label: "a–z", chars: range(97, 122) },
  { id: "digitos", label: "0–9", chars: range(48, 57) },
] as const;

// ------------------------------------------------------ Symbol (o grego) ---

export interface GreekMapping {
  /** A tecla latina que se digita. */
  latin: string;
  /** O que a fonte Symbol desenha, em Unicode de verdade (copiável). */
  greek: string;
  /** Nome em pt-BR, sem a caixa — a caixa sai do próprio `latin`. */
  name: string;
  /**
   * Quatro teclas fogem do óbvio: J, V, j e v não são a versão grega da própria
   * letra, são variantes de forma. É o erro clássico de quem transcreve Symbol.
   */
  quirk?: string;
}

/**
 * Encoding Symbol da Adobe, o mesmo que a fonte usa desde os anos 80: a tecla
 * latina não vira "a letra grega de mesmo som" sempre — C dá Χ (qui), Q dá Θ
 * (teta), W dá Ω (ômega). Por isso a tabela é escrita à mão, não derivada.
 */
export const SYMBOL_GREEK: readonly GreekMapping[] = [
  { latin: "A", greek: "Α", name: "alfa" },
  { latin: "B", greek: "Β", name: "beta" },
  { latin: "C", greek: "Χ", name: "qui (chi)" },
  { latin: "D", greek: "Δ", name: "delta" },
  { latin: "E", greek: "Ε", name: "épsilon" },
  { latin: "F", greek: "Φ", name: "fi (phi)" },
  { latin: "G", greek: "Γ", name: "gama" },
  { latin: "H", greek: "Η", name: "eta" },
  { latin: "I", greek: "Ι", name: "iota" },
  {
    latin: "J",
    greek: "ϑ",
    name: "teta variante (ϑ)",
    quirk: "J não desenha maiúscula: sai o teta cursivo ϑ.",
  },
  { latin: "K", greek: "Κ", name: "capa" },
  { latin: "L", greek: "Λ", name: "lambda" },
  { latin: "M", greek: "Μ", name: "mi (mu)" },
  { latin: "N", greek: "Ν", name: "ni (nu)" },
  { latin: "O", greek: "Ο", name: "ômicron" },
  { latin: "P", greek: "Π", name: "pi" },
  { latin: "Q", greek: "Θ", name: "teta" },
  { latin: "R", greek: "Ρ", name: "rô" },
  { latin: "S", greek: "Σ", name: "sigma" },
  { latin: "T", greek: "Τ", name: "tau" },
  { latin: "U", greek: "Υ", name: "ípsilon" },
  {
    latin: "V",
    greek: "ς",
    name: "sigma final (ς)",
    quirk: "V não desenha maiúscula: sai o sigma de fim de palavra ς.",
  },
  { latin: "W", greek: "Ω", name: "ômega" },
  { latin: "X", greek: "Ξ", name: "csi (xi)" },
  { latin: "Y", greek: "Ψ", name: "psi" },
  { latin: "Z", greek: "Ζ", name: "zeta" },
  { latin: "a", greek: "α", name: "alfa" },
  { latin: "b", greek: "β", name: "beta" },
  { latin: "c", greek: "χ", name: "qui (chi)" },
  { latin: "d", greek: "δ", name: "delta" },
  { latin: "e", greek: "ε", name: "épsilon" },
  { latin: "f", greek: "φ", name: "fi (phi)" },
  { latin: "g", greek: "γ", name: "gama" },
  { latin: "h", greek: "η", name: "eta" },
  { latin: "i", greek: "ι", name: "iota" },
  {
    latin: "j",
    greek: "ϕ",
    name: "fi variante (ϕ)",
    quirk: "j é o fi de haste reta ϕ, não o φ da tecla f.",
  },
  { latin: "k", greek: "κ", name: "capa" },
  { latin: "l", greek: "λ", name: "lambda" },
  { latin: "m", greek: "μ", name: "mi (mu)" },
  { latin: "n", greek: "ν", name: "ni (nu)" },
  { latin: "o", greek: "ο", name: "ômicron" },
  { latin: "p", greek: "π", name: "pi" },
  { latin: "q", greek: "θ", name: "teta" },
  { latin: "r", greek: "ρ", name: "rô" },
  { latin: "s", greek: "σ", name: "sigma" },
  { latin: "t", greek: "τ", name: "tau" },
  { latin: "u", greek: "υ", name: "ípsilon" },
  {
    latin: "v",
    greek: "ϖ",
    name: "pi variante (ϖ)",
    quirk: "v é o pi encaracolado ϖ — parece um ômega, mas não é o da tecla w.",
  },
  { latin: "w", greek: "ω", name: "ômega" },
  { latin: "x", greek: "ξ", name: "csi (xi)" },
  { latin: "y", greek: "ψ", name: "psi" },
  { latin: "z", greek: "ζ", name: "zeta" },
] as const;

const LATIN_TO_GREEK = new Map(SYMBOL_GREEK.map((m) => [m.latin, m.greek]));

/** Primeira ocorrência vence: o mapa latino→grego é 1:1, o inverso também. */
const GREEK_TO_LATIN = new Map(SYMBOL_GREEK.map((m) => [m.greek, m.latin]));

/** Formas que a Symbol não usa, mas que aparecem em texto grego colado da web. */
const GREEK_ALIASES: Record<string, string> = {
  ϐ: "b", // ϐ beta medial
  ϱ: "r", // ϱ rô variante
  ϵ: "e", // ϵ épsilon lunar
  ϒ: "U", // ϒ ípsilon com gancho
};

/** Texto grego da web vem acentuado; a Symbol não tem acento nenhum. */
function stripMarks(text: string): string {
  return text.normalize("NFD").replace(/\p{Mn}/gu, "");
}

export function greekFor(latinChar: string): GreekMapping | undefined {
  return SYMBOL_GREEK.find((m) => m.latin === latinChar);
}

/** Digitar na Symbol: cada tecla latina vira o glifo grego que a fonte desenha. */
export function latinToGreek(text: string): string {
  return [...text].map((ch) => LATIN_TO_GREEK.get(ch) ?? ch).join("");
}

/**
 * O caminho de volta: o grego é copiável, então quem tem o texto grego pode
 * descobrir que teclas foram digitadas na Symbol.
 */
export function greekToLatin(text: string): string {
  const flat = stripMarks(text);
  return [...flat].map((ch) => GREEK_TO_LATIN.get(ch) ?? GREEK_ALIASES[ch] ?? ch).join("");
}

/** Decide sozinho a direção do painel: quem colou grego quer o latino de volta. */
export function looksGreek(text: string): boolean {
  const flat = stripMarks(text);
  let greek = 0;
  let latin = 0;
  for (const ch of flat) {
    if (GREEK_TO_LATIN.has(ch) || ch in GREEK_ALIASES) greek++;
    else if (/[A-Za-z]/.test(ch)) latin++;
  }
  return greek > 0 && greek > latin;
}

// ------------------------------------------------------- células da grade ---

export interface RefCell {
  /** A tecla que se digita para obter o glifo. */
  char: string;
  /** O caractere Unicode equivalente, quando ele existe de fato (só a Symbol). */
  equivalent: string | null;
  /** Nome do glifo, para quem lê a tabela sem conseguir ver a fonte. */
  name: string | null;
  quirk?: string;
}

/**
 * As células de uma faixa para uma fonte. Só a Symbol devolve equivalente: nas
 * dingbats o glifo existe apenas dentro da fonte, e é essa a informação honesta
 * a dar — não um palpite de qual emoji seria parecido.
 */
export function referenceCells(font: SymbolFont, band: GridBand): RefCell[] {
  return band.chars.map((char) => {
    const g = font.hasUnicodeEquivalent ? greekFor(char) : undefined;
    return { char, equivalent: g?.greek ?? null, name: g?.name ?? null, quirk: g?.quirk };
  });
}

// ------------------------------------------------------------- amostragem ---

/** Amostra de fallback: tem maiúscula, minúscula, dígito e acento. */
export const SAMPLE_TEXT = "Prova 22 · Itajaí";

export type GlyphSize = "m" | "g" | "gg";

export const GLYPH_SIZE_PX: Record<GlyphSize, number> = { m: 26, g: 38, gg: 54 };

export const GLYPH_SIZE_LABEL: Record<GlyphSize, string> = {
  m: "Médio",
  g: "Grande",
  gg: "Enorme",
};

/**
 * O que o botão de copiar entrega numa fonte de símbolo: as LETRAS, nunca os
 * desenhos. O glifo não é um caractere — copiá-lo é impossível, e prometer o
 * contrário é o mesmo engano de renderizar fonte ausente.
 */
export function copyableFor(font: SymbolFont, text: string): string {
  return font.hasUnicodeEquivalent ? latinToGreek(text) : text;
}
