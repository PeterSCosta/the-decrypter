/**
 * Alfabetos do mundo como **tabela de índice** — quantas letras, em que ordem,
 * e como se translitera para o latim.
 *
 * POR QUE ISTO EXISTE: a prova diz "a 5ª letra do alfabeto havaiano". Quem
 * conta no alfabeto latino responde **E** e erra: o havaiano tem 13 letras e
 * começa pelas vogais (A E I O U H K L M N P W ʻ), então a 5ª é **U**. A
 * armadilha é sempre a mesma — o enunciado nomeia um alfabeto e a conta é feita
 * no nosso. Aqui a contagem é do alfabeto certo.
 *
 * O QUE ENTRA NA CONTAGEM: só o que o alfabeto oficial conta como letra. O
 * ʻokina havaiano conta (é consoante, a oclusiva glotal); os dígrafos CH/LL do
 * espanhol **não** contam mais (a RAE tirou em 1994, de 29 para 27); K, W e Y
 * já estavam no teclado antes de 1990, mas o alfabeto português só passou a
 * contá-los com o Acordo Ortográfico — 23 antes, 26 depois, e as duas contagens
 * aparecem em prova.
 *
 * O QUE FICOU DE FORA, e por quê:
 * - **maia** — a escrita é logossilábica (silabário + logogramas), não tem
 *   ordem canônica de "letra nº N"; indexar seria inventar resposta;
 * - **tifinagh** — inventário e ordem mudam entre o padrão IRCAM (marroquino) e
 *   o tuaregue, e as labiovelares (ⴳⵯ/ⴽⵯ) contam como letra em um e não no
 *   outro: sem contagem única, não dá âncora;
 * - **armênio (39)** — vale a pena, mas são 38 glifos + ligadura և que eu não
 *   conferi um a um; entra quando der para checar contra fonte;
 * - **devanágari** — é abugida (consoante+vogal inerente), a "ordem" é a
 *   varṇamālā; cabe, mas com outro modelo de dado;
 * - **alemão/francês/inglês** — base latina de 26; o alemão só soma trema e ß
 *   como variantes, não como letras de índice próprio.
 */

export interface Alphabet {
  /** Slug estável. */
  id: string;
  /** Nome pt-BR, como aparece no cartão. */
  name: string;
  /** Ordem canônica, uma entrada por letra — `letters.length` é a contagem. */
  letters: string[];
  /** Transliteração latina alinhada a `letters`; ausente = já é latino. */
  latin?: string[];
  /** Nome de cada letra, alinhado a `letters` (alfa, bet, fehu…). */
  letterNames?: string[];
  /** Como a chave digitada casa com este alfabeto (já normalizado: sem acento). */
  aliases: string[];
  /** Uma linha: o que este alfabeto tem de armadilha. */
  note: string;
  /** Faixa Unicode que identifica o script — só para escrita própria. */
  block?: RegExp;
  /** Formas finais/variantes → letra canônica (ך→כ, ς→σ, i→İ). */
  fold?: Record<string, string>;
  /** Descartar marcas combinantes antes de indexar (tonos, niqqud, tashkil). */
  stripMarks?: boolean;
  /** Transliteração de sinais que NÃO contam como letra (kana sonoro, ー). */
  extras?: Record<string, string>;
}

const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const ALPHABETS: Alphabet[] = [
  {
    id: "latino",
    name: "Latino (A–Z)",
    letters: LATIN,
    aliases: ["latino", "latim", "alfabeto latino"],
    note: "26 letras — a contagem que todo mundo faz por reflexo, e que a prova costuma não pedir.",
  },
  {
    id: "portugues",
    name: "Português (pós-Acordo)",
    letters: LATIN,
    aliases: ["portugues", "ptbr", "brasileiro", "portugues atual"],
    note: "26 letras desde o Acordo Ortográfico; antes eram 23 — veja 'português antigo'.",
  },
  {
    id: "portugues-antigo",
    name: "Português antes do Acordo",
    letters: "ABCDEFGHIJLMNOPQRSTUVXZ".split(""),
    aliases: [
      "portugues antigo",
      "portugues 23",
      "pre acordo",
      "antes do acordo",
      "portugues sem kwy",
    ],
    note: "23 letras: sem K, W e Y. Do L em diante todo índice anda 1 (L é 11, não 12).",
  },
  {
    id: "espanhol",
    name: "Espanhol",
    letters: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split(""),
    aliases: ["espanhol", "castelhano", "espanol"],
    note: "27 letras: o Ñ entra depois do N, então O é a 16ª (não a 15ª). CH e LL saíram em 1994.",
  },
  {
    id: "italiano",
    name: "Italiano",
    letters: "ABCDEFGHILMNOPQRSTUVZ".split(""),
    aliases: ["italiano", "italia"],
    note: "21 letras: J, K, W, X e Y só existem em palavra estrangeira. Z é a 21ª.",
  },
  {
    id: "islandes",
    name: "Islandês",
    letters: [
      "A",
      "Á",
      "B",
      "D",
      "Ð",
      "E",
      "É",
      "F",
      "G",
      "H",
      "I",
      "Í",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "Ó",
      "P",
      "R",
      "S",
      "T",
      "U",
      "Ú",
      "V",
      "X",
      "Y",
      "Ý",
      "Þ",
      "Æ",
      "Ö",
    ],
    aliases: ["islandes", "islandia"],
    note: "32 letras: vogal acentuada é letra própria, e Ð (eth) e Þ (thorn) não têm par latino.",
  },
  {
    id: "turco",
    name: "Turco",
    letters: [
      "A",
      "B",
      "C",
      "Ç",
      "D",
      "E",
      "F",
      "G",
      "Ğ",
      "H",
      "I",
      "İ",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "Ö",
      "P",
      "R",
      "S",
      "Ş",
      "T",
      "U",
      "Ü",
      "V",
      "Y",
      "Z",
    ],
    // O i sem ponto (ı) e o İ com ponto são letras DIFERENTES: quem digita "i"
    // quer a 12ª, não a 11ª — daí o fold explícito.
    fold: { i: "İ", ı: "I" },
    aliases: ["turco", "turquia"],
    note: "29 letras: ı e i são letras distintas (11ª e 12ª); não há Q, W nem X.",
  },
  {
    id: "esperanto",
    name: "Esperanto",
    letters: [
      "A",
      "B",
      "C",
      "Ĉ",
      "D",
      "E",
      "F",
      "G",
      "Ĝ",
      "H",
      "Ĥ",
      "I",
      "J",
      "Ĵ",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "R",
      "S",
      "Ŝ",
      "T",
      "U",
      "Ŭ",
      "V",
      "Z",
    ],
    aliases: ["esperanto"],
    note: "28 letras: as seis com chapéu (ĉ ĝ ĥ ĵ ŝ ŭ) são letras próprias; não há Q, W, X, Y.",
  },
  {
    id: "havaiano",
    name: "Havaiano",
    letters: ["A", "E", "I", "O", "U", "H", "K", "L", "M", "N", "P", "W", "ʻ"],
    latin: ["a", "e", "i", "o", "u", "h", "k", "l", "m", "n", "p", "w", "'"],
    letterNames: ["ʻā", "ʻē", "ʻī", "ʻō", "ʻū", "hē", "kē", "lā", "mū", "nū", "pī", "wē", "ʻokina"],
    // Aspas simples e o apóstrofo tipográfico viram ʻokina: ninguém digita U+02BB.
    fold: { "'": "ʻ", "‘": "ʻ", "’": "ʻ", "`": "ʻ" },
    aliases: ["havaiano", "havai", "hawaiano", "hawaiian", "hawaii", "haw"],
    note: "13 letras, vogais primeiro: a 5ª é U, não E. O ʻokina (oclusiva glotal) conta como letra.",
  },
  {
    id: "rotokas",
    name: "Rotokas",
    letters: ["A", "E", "G", "I", "K", "O", "P", "R", "S", "T", "U", "V"],
    aliases: ["rotokas", "menor alfabeto", "papua"],
    note: "12 letras — o menor alfabeto em uso (Bougainville, Papua-Nova Guiné).",
  },
  {
    id: "grego",
    name: "Grego",
    letters: "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ".split(""),
    latin: [
      "a",
      "b",
      "g",
      "d",
      "e",
      "z",
      "e",
      "th",
      "i",
      "k",
      "l",
      "m",
      "n",
      "x",
      "o",
      "p",
      "r",
      "s",
      "t",
      "y",
      "f",
      "ch",
      "ps",
      "o",
    ],
    letterNames: [
      "alfa",
      "beta",
      "gama",
      "delta",
      "épsilon",
      "zeta",
      "eta",
      "teta",
      "iota",
      "capa",
      "lambda",
      "mi",
      "ni",
      "csi",
      "ômicron",
      "pi",
      "rô",
      "sigma",
      "tau",
      "ípsilon",
      "fi",
      "qui",
      "psi",
      "ômega",
    ],
    block: /[Ͱ-Ͽἀ-῿]/,
    fold: { ς: "Σ" },
    stripMarks: true,
    aliases: ["grego", "grecia", "greek", "helenico"],
    note: "24 letras. Ômega é a 24ª e ômicron a 15ª — as duas letras 'o' desencontram a conta.",
  },
  {
    id: "cirilico",
    name: "Cirílico (russo)",
    letters: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split(""),
    latin: [
      "a",
      "b",
      "v",
      "g",
      "d",
      "e",
      "yo",
      "zh",
      "z",
      "i",
      "y",
      "k",
      "l",
      "m",
      "n",
      "o",
      "p",
      "r",
      "s",
      "t",
      "u",
      "f",
      "kh",
      "ts",
      "ch",
      "sh",
      "shch",
      '"',
      "y",
      "'",
      "e",
      "yu",
      "ya",
    ],
    block: /[Ѐ-ԯ]/,
    aliases: ["cirilico", "russo", "russia", "cyrillic"],
    note: "33 letras no russo. Ё é a 7ª e costuma ser escrita como Е — o índice inteiro anda.",
  },
  {
    id: "hebraico",
    name: "Hebraico",
    letters: "אבגדהוזחטיכלמנסעפצקרשת".split(""),
    latin: [
      "'",
      "b",
      "g",
      "d",
      "h",
      "v",
      "z",
      "ch",
      "t",
      "y",
      "k",
      "l",
      "m",
      "n",
      "s",
      "'",
      "p",
      "ts",
      "q",
      "r",
      "sh",
      "t",
    ],
    letterNames: [
      "alef",
      "bet",
      "guímel",
      "dálet",
      "he",
      "vav",
      "zain",
      "het",
      "tet",
      "iode",
      "caf",
      "lámed",
      "mem",
      "nun",
      "sámech",
      "áin",
      "pe",
      "tsade",
      "cof",
      "reish",
      "shin",
      "tav",
    ],
    block: /[֐-׿]/,
    // Formas finais (sofit) são a MESMA letra: ך é caf, não a 23ª.
    fold: { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" },
    stripMarks: true,
    aliases: ["hebraico", "hebreu", "israel", "hebrew"],
    note: "22 letras, escritas da direita para a esquerda; as cinco finais não são letras a mais.",
  },
  {
    id: "arabe",
    name: "Árabe",
    letters: "ابتثجحخدذرزسشصضطظعغفقكلمنهوي".split(""),
    latin: [
      "a",
      "b",
      "t",
      "th",
      "j",
      "h",
      "kh",
      "d",
      "dh",
      "r",
      "z",
      "s",
      "sh",
      "s",
      "d",
      "t",
      "z",
      "'",
      "gh",
      "f",
      "q",
      "k",
      "l",
      "m",
      "n",
      "h",
      "w",
      "y",
    ],
    letterNames: [
      "alif",
      "ba",
      "ta",
      "tha",
      "jim",
      "ha",
      "kha",
      "dal",
      "dhal",
      "ra",
      "zay",
      "sin",
      "shin",
      "sad",
      "dad",
      "ta",
      "za",
      "ain",
      "ghain",
      "fa",
      "qaf",
      "kaf",
      "lam",
      "mim",
      "nun",
      "ha",
      "waw",
      "ya",
    ],
    block: /[؀-ۿݐ-ݿ]/,
    fold: { أ: "ا", إ: "ا", آ: "ا", ٱ: "ا", ة: "ه", ى: "ي", ئ: "ي", ؤ: "و", ک: "ك", ی: "ي" },
    stripMarks: true,
    aliases: ["arabe", "arabic", "arabia"],
    note: "28 letras na ordem hijāʾī. A forma muda com a posição na palavra, o índice não.",
  },
  {
    id: "georgiano",
    name: "Georgiano (mkhedruli)",
    letters: "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ".split(""),
    latin: [
      "a",
      "b",
      "g",
      "d",
      "e",
      "v",
      "z",
      "t",
      "i",
      "k",
      "l",
      "m",
      "n",
      "o",
      "p",
      "zh",
      "r",
      "s",
      "t",
      "u",
      "p",
      "k",
      "gh",
      "q",
      "sh",
      "ch",
      "ts",
      "dz",
      "ts",
      "ch",
      "kh",
      "j",
      "h",
    ],
    block: /[Ⴀ-ჿᲐ-Ჿ]/,
    aliases: ["georgiano", "georgia", "mkhedruli"],
    note: "33 letras e nenhuma maiúscula; a transliteração junta pares ejetivos (t/tʼ viram 't').",
  },
  {
    id: "futhark-antigo",
    name: "Rúnico — Elder Futhark",
    letters: "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ".split(""),
    latin: [
      "f",
      "u",
      "th",
      "a",
      "r",
      "k",
      "g",
      "w",
      "h",
      "n",
      "i",
      "j",
      "ei",
      "p",
      "z",
      "s",
      "t",
      "b",
      "e",
      "m",
      "l",
      "ng",
      "d",
      "o",
    ],
    letterNames: [
      "fehu",
      "uruz",
      "thurisaz",
      "ansuz",
      "raido",
      "kaunan",
      "gebo",
      "wunjo",
      "hagalaz",
      "naudiz",
      "isaz",
      "jera",
      "eihwaz",
      "perthro",
      "algiz",
      "sowilo",
      "tiwaz",
      "berkanan",
      "ehwaz",
      "mannaz",
      "laguz",
      "ingwaz",
      "dagaz",
      "othala",
    ],
    block: /[ᚠ-᛿]/,
    aliases: ["runico", "runas", "futhark", "elder futhark", "futhark antigo", "viking", "runes"],
    note: "24 runas em ordem de futhark (F U TH A R K…), não alfabética: a 1ª é F, não A.",
  },
  {
    id: "futhark-recente",
    name: "Rúnico — Younger Futhark",
    letters: "ᚠᚢᚦᚬᚱᚴᚼᚾᛁᛅᛋᛏᛒᛘᛚᛦ".split(""),
    latin: ["f", "u", "th", "a", "r", "k", "h", "n", "i", "a", "s", "t", "b", "m", "l", "r"],
    block: /[ᚠ-᛿]/,
    aliases: ["futhark recente", "younger futhark", "futhark jovem", "runico viking", "runico 16"],
    note: "16 runas (era viking) contra as 24 do Elder — o mesmo bloco Unicode, outra contagem.",
  },
  {
    id: "hangul",
    name: "Coreano (hangul, jamo)",
    letters: [
      "ㄱ",
      "ㄴ",
      "ㄷ",
      "ㄹ",
      "ㅁ",
      "ㅂ",
      "ㅅ",
      "ㅇ",
      "ㅈ",
      "ㅊ",
      "ㅋ",
      "ㅌ",
      "ㅍ",
      "ㅎ",
      "ㅏ",
      "ㅑ",
      "ㅓ",
      "ㅕ",
      "ㅗ",
      "ㅛ",
      "ㅜ",
      "ㅠ",
      "ㅡ",
      "ㅣ",
    ],
    latin: [
      "g",
      "n",
      "d",
      "r",
      "m",
      "b",
      "s",
      "ng",
      "j",
      "ch",
      "k",
      "t",
      "p",
      "h",
      "a",
      "ya",
      "eo",
      "yeo",
      "o",
      "yo",
      "u",
      "yu",
      "eu",
      "i",
    ],
    block: /[ᄀ-ᇿ㄰-㆏가-힣]/,
    aliases: ["hangul", "coreano", "coreia", "jamo", "korean"],
    note: "24 jamo básicos (14 consoantes + 10 vogais); na escrita eles se juntam em sílabas.",
  },
  {
    id: "kana",
    name: "Japonês (kana, gojūon)",
    letters: [
      "あ",
      "い",
      "う",
      "え",
      "お",
      "か",
      "き",
      "く",
      "け",
      "こ",
      "さ",
      "し",
      "す",
      "せ",
      "そ",
      "た",
      "ち",
      "つ",
      "て",
      "と",
      "な",
      "に",
      "ぬ",
      "ね",
      "の",
      "は",
      "ひ",
      "ふ",
      "へ",
      "ほ",
      "ま",
      "み",
      "む",
      "め",
      "も",
      "や",
      "ゆ",
      "よ",
      "ら",
      "り",
      "る",
      "れ",
      "ろ",
      "わ",
      "を",
      "ん",
    ],
    latin: [
      "a",
      "i",
      "u",
      "e",
      "o",
      "ka",
      "ki",
      "ku",
      "ke",
      "ko",
      "sa",
      "shi",
      "su",
      "se",
      "so",
      "ta",
      "chi",
      "tsu",
      "te",
      "to",
      "na",
      "ni",
      "nu",
      "ne",
      "no",
      "ha",
      "hi",
      "fu",
      "he",
      "ho",
      "ma",
      "mi",
      "mu",
      "me",
      "mo",
      "ya",
      "yu",
      "yo",
      "ra",
      "ri",
      "ru",
      "re",
      "ro",
      "wa",
      "wo",
      "n",
    ],
    block: /[぀-ヿ]/,
    // Sonoras (が, ぱ) e pequenos não entram na contagem do gojūon, mas precisam
    // de leitura para a transliteração não engasgar.
    extras: {
      が: "ga",
      ぎ: "gi",
      ぐ: "gu",
      げ: "ge",
      ご: "go",
      ざ: "za",
      じ: "ji",
      ず: "zu",
      ぜ: "ze",
      ぞ: "zo",
      だ: "da",
      ぢ: "ji",
      づ: "zu",
      で: "de",
      ど: "do",
      ば: "ba",
      び: "bi",
      ぶ: "bu",
      べ: "be",
      ぼ: "bo",
      ぱ: "pa",
      ぴ: "pi",
      ぷ: "pu",
      ぺ: "pe",
      ぽ: "po",
      ゃ: "ya",
      ゅ: "yu",
      ょ: "yo",
      ぁ: "a",
      ぃ: "i",
      ぅ: "u",
      ぇ: "e",
      ぉ: "o",
      っ: "",
      ー: "",
      "、": ",",
      "。": ".",
    },
    aliases: ["kana", "japones", "japao", "hiragana", "katakana", "gojuon"],
    note: "46 kana no gojūon; sonoras (が) e combinações (きゃ) são variantes, não letras novas.",
  },
];

// --------------------------------------------------------------- normalização

/**
 * Faixas de marcas combinantes que não distinguem letra: tonos grego, niqqud
 * hebraico, tashkil árabe. Faixa em vez de classe de regex porque combinar
 * caractere-base com marca numa classe é justamente o que dá errado.
 */
const MARK_RANGES: [number, number][] = [
  [0x0300, 0x036f],
  [0x0483, 0x0489],
  [0x0591, 0x05c7],
  [0x0610, 0x061a],
  [0x064b, 0x065f],
  [0x0670, 0x0670],
  [0x06d6, 0x06ed],
];

function dropMarks(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFD")) {
    const cp = ch.codePointAt(0) ?? 0;
    if (!MARK_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) out += ch;
  }
  return out.normalize("NFC");
}

/** Katakana → hiragana: a mesma letra do gojūon, outro traço. */
function toHiragana(ch: string): string {
  const c = ch.codePointAt(0) ?? 0;
  return c >= 0x30a1 && c <= 0x30f6 ? String.fromCodePoint(c - 0x60) : ch;
}

/** Um caractere reduzido à forma canônica DAQUELE alfabeto. */
export function foldChar(a: Alphabet, ch: string): string {
  let c = ch.normalize("NFC");
  if (a.id === "kana") c = toHiragana(c);
  if (a.stripMarks) c = dropMarks(c);
  // O fold vem ANTES da caixa alta: em turco "i".toUpperCase() é "I" (a 11ª),
  // e quem digitou i quer İ (a 12ª).
  if (a.fold?.[c]) return a.fold[c];
  return c.toUpperCase();
}

const indexCache = new WeakMap<Alphabet, Map<string, number>>();

function indexMap(a: Alphabet): Map<string, number> {
  let m = indexCache.get(a);
  if (!m) {
    m = new Map(a.letters.map((l, i) => [l.toUpperCase(), i]));
    indexCache.set(a, m);
  }
  return m;
}

/** Normaliza a chave digitada: sem acento, minúscula, sem a palavra "alfabeto". */
function normalizeQuery(q: string): string {
  return dropMarks(q)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\b(alfabeto|abecedario|alphabet|abc)\b/g, " ")
    .replace(/[\s-]+/g, " ")
    .trim();
}

/** Qual alfabeto a chave nomeia — null quando não é nome de alfabeto nenhum. */
export function findAlphabet(query: string | undefined): Alphabet | null {
  const q = normalizeQuery(query ?? "");
  if (!q) return null;
  for (const a of ALPHABETS) if (a.id === q || a.aliases.includes(q)) return a;
  // Casamento por prefixo só com 4+ caracteres: "hava" acha havaiano, "he" não
  // vira hebraico só porque alguém usou "he" como chave de Vigenère.
  if (q.length < 4) return null;
  for (const a of ALPHABETS) if (a.aliases.some((al) => al.startsWith(q))) return a;
  return null;
}

// ------------------------------------------------------------------ consultas

/** Posição 1-based da letra, ou null se ela não é deste alfabeto. */
export function letterIndex(a: Alphabet, ch: string): number | null {
  const i = indexMap(a).get(foldChar(a, ch));
  return i === undefined ? null : i + 1;
}

/** A letra na posição 1-based, ou null fora da faixa. */
export function letterAt(a: Alphabet, index: number): string | null {
  return index >= 1 && index <= a.letters.length ? a.letters[index - 1] : null;
}

/** Transliteração latina da letra na posição 1-based (ela mesma, se já é latina). */
export function latinAt(a: Alphabet, index: number): string {
  return a.latin?.[index - 1] ?? a.letters[index - 1] ?? "";
}

/**
 * O alfabeto é o latino puro de 26? Nesses o "letra → posição" é literalmente o
 * A1Z26, que já tem decoder próprio — não vale um segundo cartão.
 */
export function isPlainLatin(a: Alphabet): boolean {
  return a.letters.length === 26 && a.letters.every((l, i) => l === LATIN[i]);
}

/** "13 letras: A E I O U H K L M N P W ʻ" — a linha de painel. */
export function alphabetSummary(a: Alphabet): string {
  return `${a.letters.length} letras: ${a.letters.join(" ")}`;
}

// -------------------------------------------------------------- hangul (jamo)

const CHOSEONG = "g,kk,n,d,tt,r,m,b,pp,s,ss,,j,jj,ch,k,t,p,h".split(",");
const JUNGSEONG = "a,ae,ya,yae,eo,e,yeo,ye,o,wa,wae,oe,yo,u,wo,we,wi,yu,eu,ui,i".split(",");
const JONGSEONG = ",k,k,ks,n,nj,nh,t,l,lk,lm,lb,ls,lt,lp,lh,m,p,ps,t,t,ng,t,t,k,t,p,t".split(",");

/**
 * Sílaba hangul → romanização. A sílaba é composta por fórmula
 * (((inicial × 21) + medial) × 28 + final), então dá para desmontar sem tabela.
 */
function romanizeSyllable(ch: string): string | null {
  const c = (ch.codePointAt(0) ?? 0) - 0xac00;
  if (c < 0 || c > 11171) return null;
  return CHOSEONG[Math.floor(c / 588)] + JUNGSEONG[Math.floor(c / 28) % 21] + JONGSEONG[c % 28];
}

// ------------------------------------------------------- reconhecer o script

export interface ScriptLetter {
  /** O caractere como veio. */
  char: string;
  /** Posição 1-based no alfabeto, ou null (sinal que não é letra). */
  index: number | null;
  /** Leitura latina. */
  latin: string;
}

export interface ScriptMatch {
  alphabet: Alphabet;
  /** Só os caracteres do script, na ordem em que aparecem. */
  letters: ScriptLetter[];
  /** O texto inteiro transliterado (o que não é do script passa direto). */
  transliterated: string;
}

/** Preserva a caixa: letra maiúscula na origem sai capitalizada no latim. */
function matchCase(source: string, latin: string): string {
  if (!latin) return latin;
  const isUpper = source !== source.toLowerCase() && source === source.toUpperCase();
  return isUpper ? latin.charAt(0).toUpperCase() + latin.slice(1) : latin;
}

/** Leitura latina de um caractere daquele script, ou null se não é do script. */
function readChar(a: Alphabet, ch: string): { index: number | null; latin: string } | null {
  if (a.id === "hangul") {
    const syl = romanizeSyllable(ch);
    if (syl !== null) return { index: null, latin: syl };
  }
  const i = letterIndex(a, ch);
  if (i !== null) return { index: i, latin: matchCase(ch, latinAt(a, i)) };
  const extra = a.extras?.[a.id === "kana" ? toHiragana(ch) : ch];
  if (extra !== undefined) return { index: null, latin: extra };
  return null;
}

/**
 * "Colei um texto e não sei que escrita é essa": devolve o alfabeto que melhor
 * cobre os caracteres fora do latim e a transliteração. O portão é a faixa
 * Unicode — texto em português nunca entra aqui.
 */
export function detectScript(text: string): ScriptMatch | null {
  const chars = [...text];
  let best: { a: Alphabet; known: number; seen: number } | null = null;

  for (const a of ALPHABETS) {
    if (!a.block) continue;
    let seen = 0;
    let known = 0;
    for (const ch of chars) {
      if (!a.block.test(ch)) continue;
      seen++;
      if (readChar(a, ch)) known++;
    }
    // Empate fica com o primeiro da lista (Elder antes de Younger Futhark).
    if (seen > 0 && (!best || known > best.known)) best = { a, known, seen };
  }
  if (!best || best.known === 0) return null;

  const a = best.a;
  const letters: ScriptLetter[] = [];
  let out = "";
  for (const ch of chars) {
    const r = a.block?.test(ch) ? readChar(a, ch) : null;
    if (r) {
      letters.push({ char: ch, index: r.index, latin: r.latin });
      out += r.latin;
    } else {
      out += ch;
    }
  }
  return { alphabet: a, letters, transliterated: out };
}
