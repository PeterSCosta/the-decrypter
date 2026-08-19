import type { Hint } from "./sniff";
import { stripDiacritics } from "./util";

/**
 * Leitura do **título** da prova — a camada de meta-informação.
 *
 * Na GIA 2026 o título é sistematicamente a chave de entrada: em **11 das 41
 * provas** ele nomeia o dicionário a consultar (`acervo/GIA-2026.md`, §3.1).
 * *Ask Me*→ASCII (01), *Que Bom*→Kibon (02), *Virada Maiúscula*→acróstico (03),
 * *O poder das palavras*→contar palavras (04), *O Código SONGI*→SIGNO (13),
 * *O Problema dos 3 Corpos ///*→what3words (10), *`###`*→GeoTude (27),
 * *Prova quadrada*→raiz quadrada (21), *I lingii di i*→cifra vocálica (22),
 * *Enxergar sem ver*→camada oculta (40), *No detalhe*→número camuflado (37).
 *
 * **Decisão de projeto: o título NUNCA entra em `decode()` e NÃO altera score.**
 * Um título mal interpretado corromperia o ranking — e o estrago seria
 * invisível para quem usa a bancada, porque ninguém vê "por que" um candidato
 * subiu. Aqui a leitura vive fora da corrida, como chips: sugestão explícita,
 * clicável, descartável. Por isso nenhuma dica traz `chainValue` — não há valor
 * do título para encadear, só um palpite de *qual cifra tentar*.
 *
 * **Ambiguidade é assumida, não escondida.** *Enxergar sem ver* (40, que termina
 * em coordenada) e *Os olhos enganam* (41, que é Braille) caem na mesma regra —
 * "o que não se vê". Uma regra pode então devolver **várias** dicas, uma por
 * decodificador candidato, e a bancada **nunca** auto-seleciona nenhuma. Palpite
 * silencioso seria pior que palpite nenhum.
 */

/** Quantos decodificadores uma leitura do título sugere. */
interface Suggestion {
  /** Id do decodificador; ausente quando a pista não tem cifra correspondente. */
  decoderId?: string;
  /** Nome curto que aparece no chip depois da seta. */
  as: string;
}

interface Rule {
  id: string;
  /** O que no título disparou — vai entre aspas no rótulo do chip. */
  reading: string;
  /** Testado contra o título dobrado (minúsculo, sem acento). */
  test: RegExp;
  /** Por que essa leitura; uma linha. */
  detail: string;
  suggests: Suggestion[];
}

/**
 * Teto de chips. O recurso escasso é a **coluna de entrada no mobile** (~375px):
 * a faixa de dicas empilha linhas acima do Textarea. Um título temático
 * dispararia meia dúzia de regras genéricas; seis chips já é o limite do que
 * cabe sem empurrar a entrada para fora da tela.
 */
const MAX_HINTS = 6;

/**
 * Portão anti-ruído: acima disso não é título, é o enunciado colado por engano —
 * e prosa longa casa com dezenas de regras temáticas de uma vez. Os títulos mais
 * longos do acervo têm 6 palavras (*O Problema dos 3 Corpos ///*).
 */
const MAX_TITLE_WORDS = 12;
const MAX_TITLE_CHARS = 120;

// ---------------------------------------------------------------------------
// Família 1 — o título nomeia (ou desenha) o sistema
// ---------------------------------------------------------------------------

/**
 * Cifras clássicas citadas pelo nome: `[forma dobrada, id, rótulo]`. Uma regra
 * por nome, não uma regra genérica — um título que diz "Playfair" não tem por
 * que sugerir Atbash.
 */
const CLASSIC_CIPHER_NAMES: [string, string, string][] = [
  ["vigenere", "vigenere", "Vigenère"],
  ["playfair", "playfair", "Playfair"],
  ["polibio|polybius", "polybius", "Políbio"],
  ["atbash", "atbash", "Atbash"],
  ["beaufort", "beaufort", "Beaufort"],
  ["gronsfeld", "gronsfeld", "Gronsfeld"],
  ["bifid", "bifid", "Bifid"],
  ["trithemius", "trithemius", "Trithemius"],
  ["porta", "porta", "Porta"],
  ["bacon", "bacon", "Bacon"],
  ["baudot|ita2", "baudot", "Baudot"],
  ["afim|affine", "affine", "Afim"],
];

/**
 * O caso mais literal: o título **é** a sintaxe. `###` é o título inteiro da
 * GIA-27 e é como o GeoTude escreve seus códigos; `///` fecha o título da
 * GIA-10 e é o prefixo do what3words. Aqui não há inferência — há citação.
 */
const SYSTEM_RULES: Rule[] = [
  {
    id: "geotude-hash",
    reading: "###",
    test: /###/,
    detail: "o GeoTude escreve o código depois de ###; o título da GIA-27 era só isso",
    suggests: [{ decoderId: "location", as: "GeoTude" }],
  },
  {
    id: "w3w-slashes",
    reading: "///",
    test: /\/\/\//,
    detail: "três barras é como o what3words marca um endereço de três palavras",
    suggests: [{ decoderId: "location", as: "what3words" }],
  },
  {
    id: "w3w-name",
    reading: "what3words",
    test: /what ?3 ?words|\bw3w\b|tres palavras/,
    detail: "endereço de três palavras separadas por ponto",
    suggests: [{ decoderId: "location", as: "what3words" }],
  },
  {
    id: "mapcode",
    reading: "mapcode",
    test: /\bmapcode\b/,
    detail: "mapcode local não decodifica sem território — a bancada assume BR-SC primeiro",
    suggests: [{ decoderId: "location", as: "Mapcode" }],
  },
  {
    id: "geotude-name",
    reading: "geotude",
    test: /\bgeotude\b/,
    detail: "grade decimal aninhada do geotude.com",
    suggests: [{ decoderId: "location", as: "GeoTude" }],
  },
  {
    id: "plus-code",
    reading: "plus code",
    test: /plus ?code|open location code/,
    detail: "Plus Code completo, ou só a cauda assumindo Blumenau/Itajaí",
    suggests: [
      // O `location` cobre o Plus Code inteiro E a cauda local: o decoder
      // `local-geocode` foi absorvido por ele, porque os dois liam as MESMAS
      // funções e passaram a emitir o mesmo ponto duas vezes.
      { decoderId: "location", as: "Plus Code (inteiro ou cauda)" },
    ],
  },
  {
    id: "geohash",
    reading: "geohash",
    test: /\bgeohash\b/,
    detail: "geohash inteiro, ou só a cauda assumindo a cidade-âncora",
    suggests: [{ decoderId: "location", as: "Geohash (inteiro ou cauda)" }],
  },
  {
    id: "geohex",
    reading: "geohex",
    test: /\bgeohex\b/,
    detail: "grade hexagonal; o prefixo de Blumenau é Nb",
    suggests: [{ decoderId: "geohex-wildcard", as: "GeoHex" }],
  },
  {
    id: "maidenhead",
    reading: "maidenhead",
    test: /maidenhead|\blocator\b|radioamador/,
    detail: "grid square de radioamador (GIA-14: a placa do carro era um locator)",
    suggests: [{ decoderId: "location", as: "Maidenhead" }],
  },
  {
    id: "quadkey",
    reading: "quadkey",
    test: /\bquadkey\b|\butm\b/,
    detail: "coordenada em grade de tiles/projeção",
    suggests: [{ decoderId: "location", as: "coordenada" }],
  },
  {
    id: "morse-name",
    reading: "morse",
    test: /\bmorse\b|telegrafo|ponto e traco/,
    detail: "ponto e traço; a pontuação do texto às vezes é o portador",
    suggests: [{ decoderId: "morse", as: "Morse" }],
  },
  {
    id: "braille-name",
    reading: "braille",
    test: /\bbraille\b/,
    detail: "célula de 2 colunas × 3 linhas de pontos",
    suggests: [{ decoderId: "braille", as: "Braille" }],
  },
  {
    id: "ascii-name",
    reading: "ascii",
    test: /\bascii\b/,
    detail: "byte por caractere — a confusão nº 1 do acervo é lê-lo como A1Z26",
    suggests: [{ decoderId: "decimal", as: "ASCII/decimal" }],
  },
  {
    id: "base64-name",
    reading: "base64",
    test: /base ?64|base ?32|base ?58/,
    detail: "codificação de transporte, não cifra",
    suggests: [{ decoderId: "base64", as: "Base64" }],
  },
  {
    id: "gs1",
    reading: "código de barras",
    test: /codigo de barras|\bean-?13\b|\bgs1\b|\bbarras\b/,
    detail: "o prefixo GS1 dá o país (GIA-07 montou coordenada com ele)",
    suggests: [{ decoderId: "barcode", as: "código de barras" }],
  },
  {
    id: "iata",
    reading: "iata",
    test: /\biata\b|\bicao\b/,
    detail: "sigla de aeroporto",
    suggests: [{ decoderId: "airport", as: "aeroporto" }],
  },
  {
    id: "isbn-name",
    reading: "isbn",
    test: /\bisbn\b/,
    detail: "identificador de livro, com dígito verificador",
    suggests: [{ decoderId: "isbn", as: "ISBN" }],
  },
  {
    id: "ispb",
    reading: "pix",
    test: /\bpix\b|\bispb\b/,
    detail: "participante do arranjo PIX pelo ISPB",
    suggests: [{ decoderId: "pix-participant", as: "PIX (ISPB)" }],
  },
  {
    id: "ncm-name",
    reading: "ncm",
    test: /\bncm\b|nomenclatura comum/,
    detail: "classificação fiscal de mercadoria",
    suggests: [{ decoderId: "ncm", as: "NCM" }],
  },
  {
    id: "a1z26-name",
    reading: "a1z26",
    test: /\ba1z26\b|alfabeto numerado|numero da letra/,
    detail: "número ↔ letra, faixa 1–26",
    suggests: [{ decoderId: "a1z26", as: "A1Z26" }],
  },
  {
    id: "t9-name",
    reading: "t9",
    test: /\bt9\b|multitap|celular antigo|\bsms\b/,
    detail: "teclado numérico do celular antigo",
    suggests: [{ decoderId: "t9-multitap", as: "T9" }],
  },
  {
    id: "qr",
    reading: "qr code",
    test: /\bqr ?code\b/,
    detail: "a bancada não lê QR — o conteúdo do QR é que entra aqui (GIA-09 levava a um áudio)",
    suggests: [{ as: "leia o QR fora da bancada" }],
  },
  ...CLASSIC_CIPHER_NAMES.map(([name, decoderId, as]) => ({
    id: `cifra-${decoderId}`,
    reading: as,
    // `name` é o nome dobrado (sem acento) e vira uma regra de palavra inteira.
    test: new RegExp(`\\b(?:${name})\\b`),
    detail: "o título cita a cifra pelo nome — não é palpite, é citação",
    suggests: [{ decoderId, as }],
  })),
];

// ---------------------------------------------------------------------------
// Família 2 — regexes temáticos
// ---------------------------------------------------------------------------

/**
 * O título raramente nomeia o sistema; ele nomeia o **tema**. Cada regra abaixo
 * é um tema recorrente do acervo mapeado para as cifras que o realizam. São
 * palpites — daí o rótulo em forma de pergunta implícita ("cor → cores").
 */
const THEME_RULES: Rule[] = [
  {
    id: "cor",
    reading: "cor",
    test: /\bcor\b|\bcores\b|colorid|colorir|pintad|\btinta\b|matiz|arco-?iris/,
    detail: "cor identifica canal, equipe ou catálogo (GIA-16 usou cor para separar 7 cifras)",
    suggests: [
      { decoderId: "color-convert", as: "cores (hex/RGB/HSL)" },
      { decoderId: "faber-castell", as: "código Faber-Castell" },
    ],
  },
  {
    id: "lapis",
    reading: "lápis de cor",
    test: /lapis de cor|faber|\bdesenh/,
    detail: "catálogo de fabricante: o código da cor dá o nome, o nome dá as letras",
    suggests: [{ decoderId: "faber-castell", as: "Faber-Castell" }],
  },
  {
    id: "resistor",
    reading: "resistor",
    test: /resistor|resistencia|\bohm\b|eletronic|circuito/,
    detail: "faixas coloridas do resistor viram dígitos",
    suggests: [{ decoderId: "resistor", as: "código de resistor" }],
  },
  {
    id: "quimica",
    reading: "química",
    test: /quimic|molecul|\batomo|atomic|reagente|tabela periodica|elemento/,
    detail: "símbolo do elemento ou subscrito da fórmula como dígito (GIA-19)",
    suggests: [{ decoderId: "periodic-table", as: "tabela periódica" }],
  },
  {
    id: "signo",
    reading: "signo",
    test: /\bsigno|zodiac|horoscop|astrolog|\bestrela/,
    detail: "data → signo → inicial do signo (GIA-13 fez CASCAVEL assim)",
    suggests: [{ decoderId: "date-key", as: "data como chave" }],
  },
  {
    id: "data",
    reading: "data",
    test: /\bdata\b|\bdatas\b|calendario|aniversario|nascimento|\bano\b|\banos\b/,
    detail: "data vira signo, dia da semana, dia do ano ou serial",
    suggests: [{ decoderId: "date-key", as: "data como chave" }],
  },
  {
    id: "hora",
    reading: "hora",
    test: /\bhora|relogio|\btempo\b|minuto|segundos?\b/,
    detail: "horário como par de números, ou o relógio como grade",
    suggests: [{ decoderId: "date-key", as: "data como chave" }],
  },
  {
    id: "conta",
    reading: "conta",
    test: /aritmetic|calcul|\bsoma\b|somar|dividir|divisao|multiplic|subtrai|\bconta\b/,
    detail: "aritmética disfarçada: o enunciado manda operar antes de decodificar",
    suggests: [{ decoderId: "math-helper", as: "aritmética escondida" }],
  },
  {
    id: "quadrado",
    reading: "quadrada",
    test: /quadrad|\braiz\b|raizes/,
    detail: "raiz quadrada de cada número, concatenada, deu coordenada na GIA-21",
    suggests: [{ decoderId: "math-helper", as: "raiz quadrada" }],
  },
  {
    id: "comum",
    reading: "em comum",
    test: /em comum|divisor|multiplo|\bmdc\b|\bmmc\b/,
    detail:
      "o que todos têm em comum costuma ser o MDC — dividir revela a camada seguinte (GIA-27)",
    suggests: [{ decoderId: "math-helper", as: "aritmética escondida" }],
  },
  {
    id: "fiscal",
    reading: "fiscal",
    test: /fiscal|imposto|\btaxa|juros|porcentagem|\bpercentual/,
    detail: "percentual é divisão disfarçada; na GIA-06 o quociente era um CEP",
    suggests: [{ decoderId: "math-helper", as: "aritmética escondida" }],
  },
  {
    id: "mapa",
    reading: "mapa",
    test: /\bmapa\b|mapear|coordenada|latitude|longitude|\bgps\b|localiza|\bbussola\b|ponto de encontro/,
    detail: "coordenada em qualquer formato, ou geocódigo",
    suggests: [{ decoderId: "location", as: "localização" }],
  },
  {
    id: "musica",
    reading: "música",
    test: /musica|cancao|melodia|sinfonia|\bnota\b|\bnotas\b|acorde|partitura|\bouvir\b|\bsom\b/,
    detail: "notas A–G como letras, ou o título da música como portador (GIA-30)",
    suggests: [{ decoderId: "music-notes", as: "notas musicais" }],
  },
  {
    id: "romano",
    reading: "romano",
    test: /romano|imperador|imperio|\blatim\b|coliseu/,
    detail: "algarismo romano vira número — e, na GIA-29, índice de letra no nome do imperador",
    suggests: [{ decoderId: "roman", as: "números romanos" }],
  },
  {
    // Separado de "romano": um título que diz César fala da cifra; um que diz
    // imperador fala do algarismo. Juntar os dois fabricaria um chip por tabela.
    id: "cesar",
    reading: "césar",
    test: /\bcesar\b/,
    detail: "a cifra homônima — e o algarismo romano, se o tema for o império",
    suggests: [
      { decoderId: "caesar-bruteforce", as: "César (força bruta)" },
      { decoderId: "roman", as: "números romanos" },
    ],
  },
  {
    id: "binario",
    reading: "binário",
    test: /binari|\bbits?\b|zeros e uns|\b0 e 1\b/,
    detail: "blocos de 8 são bytes; blocos menores costumam ser número puro",
    suggests: [
      { decoderId: "binary", as: "binário → texto" },
      { decoderId: "binary-number", as: "binário → número" },
    ],
  },
  {
    id: "inicial",
    reading: "inicial",
    test: /inicial|primeira letra|maiuscul|acrostic|comeco de cada/,
    detail: "acróstico: a inicial de cada frase, verso ou item (4 provas da GIA)",
    suggests: [
      { decoderId: "acrostic", as: "acróstico" },
      { decoderId: "acrostic-nth", as: "acróstico posicional" },
    ],
  },
  {
    id: "palavra",
    reading: "palavras",
    test: /\bpalavra|\bfrases?\b|\bparagrafo/,
    detail: "contar palavras por parágrafo virou A1Z26 na GIA-04",
    suggests: [
      { decoderId: "count-key", as: "contagem como chave" },
      { decoderId: "acrostic", as: "acróstico" },
    ],
  },
  {
    id: "contar",
    reading: "contar",
    test: /\bcontar\b|contagem|quantidade|\bquantos?\b|\bquantas?\b/,
    detail: "contagem como chave: o que se conta vira número, o número vira letra",
    suggests: [
      { decoderId: "count-key", as: "contagem como chave" },
      { decoderId: "digit-count", as: "quantidade de dígitos" },
    ],
  },
  {
    id: "posicao",
    reading: "posição",
    test: /posica|\bindice\b|\bordem\b|\benesim|lugar da letra|\bnesima/,
    detail: "letra por posição indexada — a mecânica mais frequente do acervo",
    suggests: [{ decoderId: "letter-index", as: "letra por posição" }],
  },
  {
    id: "valor",
    reading: "valor",
    // "ponto" fica de fora de propósito: em pt-BR ele é o falso positivo mais
    // caro do lote ("ponto de encontro", "ponto turístico", "ponto e vírgula").
    test: /\bvalor\b|\bvalores\b|gematria|\bpeso\b|\bpontuacao\b/,
    detail: "soma dos valores das letras (A=1…Z=26) e variantes",
    suggests: [{ decoderId: "letter-values", as: "valor das letras" }],
  },
  {
    id: "espelho",
    reading: "espelho",
    test: /espelh|invertid|inversao|ao contrario|de tras para frente|\breverso\b|refletid/,
    detail:
      "inversão pode ser da string, do alfabeto (Atbash) ou da numeração (GIA-41 lia de trás)",
    suggests: [
      { decoderId: "reverse", as: "inverter" },
      { decoderId: "atbash", as: "Atbash" },
      { decoderId: "a1z26-reverse", as: "A1Z26 invertido" },
    ],
  },
  {
    id: "telefone",
    reading: "telefone",
    test: /telefone|ligac|\bligad|discar|chamada|\bcelular\b|\bramal\b/,
    detail: "telefone como resposta aparece 3× na GIA — e o teclado numérico também é cifra",
    suggests: [
      { decoderId: "ddd", as: "DDD" },
      { decoderId: "t9-multitap", as: "T9" },
    ],
  },
  {
    id: "ddd",
    reading: "ddd",
    test: /\bddd\b|codigo de area/,
    detail: "cidade → DDD é a cadeia inversa da GIA-40",
    suggests: [{ decoderId: "ddd", as: "DDD" }],
  },
  {
    id: "pais",
    reading: "país",
    test: /\bpais\b|\bpaises\b|bandeira|internacional|\bnacoes\b|fronteira|\bmundo\b/,
    detail: "bandeira/brasão dá o país; o país dá DDI, prefixo GS1 ou nome de rua",
    suggests: [
      { decoderId: "ddi", as: "DDI" },
      { decoderId: "location", as: "localização" },
    ],
  },
  {
    id: "cep",
    reading: "cep",
    test: /\bcep\b|endereco|\brua\b|\bruas\b|avenida|logradouro|correio|\bbairro/,
    detail: "CEP → rua é o cavalo-de-batalha do acervo, nos dois sentidos",
    suggests: [
      { decoderId: "cep-exact", as: "CEP" },
      { decoderId: "street-name", as: "nome de rua" },
    ],
  },
  {
    id: "cidade",
    reading: "cidade",
    test: /\bcidade|municipio|\bibge\b|\bcenso\b|populaca/,
    detail: "código IBGE do município, e o nome do município como banco de letras",
    suggests: [{ decoderId: "ibge-municipio", as: "município (IBGE)" }],
  },
  {
    id: "lei",
    reading: "lei",
    test: /\blei\b|\bleis\b|\bartigo\b|estatuto|decreto|\bnorma\b|regulamento/,
    detail: "documento normativo como livro-código: artigo → palavra (GIA-35)",
    suggests: [{ decoderId: "street-law", as: "lei de Blumenau" }],
  },
  {
    id: "documento",
    reading: "documento",
    test: /\bcpf\b|\bcnpj\b|documento|identidade|\brg\b|cadastro|eleitor/,
    detail: "dígito verificador confirma ou desmente o palpite antes de gastar tempo",
    suggests: [{ decoderId: "documento", as: "CPF/CNPJ" }],
  },
  {
    id: "site",
    reading: "site",
    test: /\bsite\b|dominio|internet|\bweb\b|\burl\b|\blink\b|\bportal\b/,
    detail: "site externo real como chave — a marca registrada da GIA",
    suggests: [
      { decoderId: "registrobr", as: "domínio .br" },
      { decoderId: "url", as: "URL (percent-encoding)" },
    ],
  },
  {
    id: "livro",
    reading: "livro",
    test: /\blivro|biblioteca|\bpagina|capitulo|editora|\bobra\b|\bautor/,
    detail: "livro-código: página/linha/palavra como coordenadas de texto (GIA-42)",
    suggests: [{ decoderId: "isbn", as: "ISBN" }],
  },
  {
    id: "aeroporto",
    reading: "aeroporto",
    test: /aeroporto|\bvoo\b|\bviagem\b|\baviao\b|decolar|\bpiloto\b/,
    detail: "sigla de três letras é quase sempre IATA",
    suggests: [{ decoderId: "airport", as: "aeroporto" }],
  },
  {
    id: "hash",
    reading: "hash",
    test: /\bhash\b|criptograf|\bmd5\b|\bsha\b|\bcriptomoeda|blockchain/,
    detail: "identificar o algoritmo pelo comprimento antes de tentar quebrar",
    suggests: [{ decoderId: "hash-id", as: "identificador de hash" }],
  },
  {
    id: "chave",
    reading: "palavra-chave",
    // "segredo" fica de fora: numa gincana todo título é um segredo.
    test: /palavra-?chave|frase-?chave|\bsenha\b|\bcofre\b|\bcadeado\b/,
    detail: "cifra com chave: preencha o campo Chave e rode Vigenère/XOR",
    suggests: [
      { decoderId: "vigenere", as: "Vigenère" },
      { decoderId: "xor-key", as: "XOR" },
    ],
  },
  {
    id: "teclado",
    reading: "teclado",
    test: /teclado|qwerty|\btecla|digitar|datilograf/,
    detail: "deslocamento físico no teclado, não no alfabeto",
    suggests: [{ decoderId: "keyboard", as: "deslocamento de teclado" }],
  },
  {
    id: "batida",
    reading: "batida",
    test: /batid|\bbater\b|\bparede|\bprisao\b|\bpreso\b|\bcela\b/,
    detail: "tap code: grade 5×5 batida em dois tempos",
    suggests: [{ decoderId: "tap-code", as: "tap code" }],
  },
  {
    id: "grade",
    reading: "grade",
    test: /\bgrade\b|quadriculad|\bmatriz\b|linhas e colunas|tabuleiro|\bpadrao\b/,
    detail: "grade se lê em espiral, caracol, boustrophedon ou por coordenada",
    suggests: [
      { decoderId: "grid-read", as: "leitura de grade" },
      { decoderId: "polybius", as: "Políbio" },
    ],
  },
  {
    id: "cruzadinha",
    reading: "cruzadinha",
    test: /caca-?palavras|cruzadinha|palavras cruzadas|\bcruzament|encruzilhada/,
    detail: "no acervo o caça-palavras entrega o cruzamento, não a palavra (GIA-20)",
    suggests: [{ decoderId: "grid-read", as: "leitura de grade" }],
  },
  {
    id: "coluna",
    reading: "coluna",
    test: /transposic|\bcoluna|colunar|embaralhad/,
    detail: "transposição colunar reordena, não substitui",
    suggests: [{ decoderId: "columnar", as: "transposição colunar" }],
  },
  {
    id: "cerca",
    reading: "cerca",
    test: /\bcerca\b|zigue|zig-?zag|\btrilho|\bserra\b|\bondas?\b/,
    detail: "rail fence escreve em zigue-zague e lê em linha",
    suggests: [{ decoderId: "railfence", as: "cerca (rail fence)" }],
  },
  {
    id: "disco",
    reading: "disco",
    test: /\bdisco|\broda\b|\bcirculo|\bgiro\b|girar|rotac|\banel\b/,
    detail: "roda alfabética de 26 setores (GIA-17 tinha 9 discos)",
    suggests: [{ decoderId: "cipher-disk", as: "roda alfabética" }],
  },
  {
    id: "deslocamento",
    reading: "deslocamento",
    test: /deslocament|\bdesloca|\bavanc|retroced|\bandar\b|\bpassos?\b|\bshift\b/,
    detail: "César, com a direção às vezes marcada por +/− (GIA-26)",
    suggests: [{ decoderId: "caesar-bruteforce", as: "César (força bruta)" }],
  },
  {
    id: "vogal",
    reading: "vogal",
    test: /\bvogal\b|\bvogais\b|\bconsoante/,
    detail: "cifra vocálica: só as 5 vogais são deslocadas (GIA-22)",
    suggests: [{ decoderId: "vowel-cipher", as: "cifra vocálica" }],
  },
  {
    id: "oculto",
    reading: "oculto",
    test: /\boculto|\boculta|escondid|invisivel|\bsecreto|entrelinhas|nas sombras/,
    detail: "camada escondida: espaço duplo, caractere de largura zero, texto atrás da imagem",
    suggests: [
      { decoderId: "whitespace-stego", as: "espaços escondidos" },
      { decoderId: "zero-width", as: "caracteres invisíveis" },
    ],
  },
  {
    id: "olhos",
    reading: "o que não se vê",
    test: /sem ver\b|\bolhos?\b|enxergar|\bcego|\bvista\b|\bilusao\b|enganam/,
    detail:
      "ambiguidade assumida: “Enxergar sem ver” (40) era texto atrás da imagem; “Os olhos enganam” (41) era Braille nos espaços duplos. Mesma regra, alvos diferentes — escolha você",
    suggests: [
      { decoderId: "whitespace-stego", as: "espaços escondidos" },
      { decoderId: "zero-width", as: "caracteres invisíveis" },
      { decoderId: "braille", as: "Braille" },
    ],
  },
  {
    id: "espaco",
    reading: "espaço",
    test: /\bespaco|\bbranco\b|\bvazio\b|silencio|silenciosa|\bnada\b/,
    detail: "o espaço em branco como bit: invisível em PDF, sobrevive em texto plano",
    suggests: [{ decoderId: "whitespace-stego", as: "espaços escondidos" }],
  },
  {
    id: "detalhe",
    reading: "detalhe",
    test: /\bdetalhe|\bminucia|\bpequeno|\bmiudo|de perto/,
    detail: "na GIA-37 o índice era um número preto camuflado no fundo escuro da foto",
    suggests: [{ as: "amplie o material, não a bancada" }],
  },
  {
    id: "anagrama-tema",
    reading: "anagrama",
    test: /anagrama|misturad|desordem|fora de ordem|\btrocad|reorganiz/,
    detail: "a aba Anagramas resolve com as duas wordlists; aqui a bancada só aponta",
    suggests: [{ as: "aba Anagramas" }],
  },
  {
    id: "digito",
    reading: "algarismo",
    test: /algarismo|\bdigito|\bcifras?\b|\bnumeracao\b/,
    detail: "reagrupar dígitos muda tudo: 8 dígitos podem ser CEP, coordenada ou telefone",
    suggests: [
      { decoderId: "digit-regroup", as: "reagrupar dígitos" },
      { decoderId: "a1z26", as: "A1Z26" },
    ],
  },
  {
    id: "leet",
    reading: "hacker",
    test: /\bleet\b|\bhacker|\b1337\b|\bgamer\b/,
    detail: "leetspeak troca letra por dígito parecido",
    suggests: [{ decoderId: "leetspeak", as: "leetspeak" }],
  },
  {
    id: "radio",
    reading: "rádio",
    test: /\bradio\b|alfabeto fonetico|\bnato\b|alfa bravo|\bcodinome/,
    detail: "alfabeto fonético soletra; o locator de radioamador geolocaliza",
    suggests: [
      { decoderId: "nato", as: "alfabeto fonético" },
      { decoderId: "location", as: "Maidenhead" },
    ],
  },
  {
    id: "hexadecimal",
    reading: "hexadecimal",
    test: /hexadecimal|\bhexa\b|\b0x\b/,
    detail: "hex é byte a byte; se for cor, o decodificador é outro",
    suggests: [
      { decoderId: "hex", as: "hexadecimal" },
      { decoderId: "color-convert", as: "cores (hex/RGB/HSL)" },
    ],
  },
  {
    id: "esporte",
    reading: "esporte",
    test: /\bcopa\b|\bfutebol|\bescudo|\bcampeonato|\bselecao\b|\bolimpi/,
    detail: "escudo dá o país, e o número de participações costuma ser o deslocamento (GIA-26)",
    suggests: [
      { decoderId: "caesar-bruteforce", as: "César (força bruta)" },
      { decoderId: "ddi", as: "DDI" },
    ],
  },
  {
    id: "trilha",
    reading: "sequência",
    test: /sequencia|\bordem de|\bpasso a passo|\betapas?\b|\btrilha\b/,
    detail: "cadeia multi-etapas: resolva uma camada, use “usar como entrada” e siga",
    suggests: [{ as: "encadeie as camadas" }],
  },
  {
    id: "fogo",
    reading: "fogo",
    test: /\bfogo\b|incendi|\bqueim|\bchama|\bbombeiro/,
    detail: "no acervo o fogo levou a mapas institucionais de órgão público (GIA-23)",
    suggests: [{ decoderId: "ibge-municipio", as: "município (IBGE)" }],
  },
  {
    id: "saude",
    reading: "saúde",
    test: /\bsaude\b|\bcovid\b|vacin|pandemi|\bsintoma|\bdoenca/,
    detail: "portal municipal como tabela calibrada (GIA-12: os bullets soletravam COVID)",
    suggests: [{ decoderId: "acrostic", as: "acróstico" }],
  },
  {
    id: "filme",
    reading: "filme",
    test: /\bfilme|\bcinema\b|\belenco\b|\bator\b|\batores\b|\boscar\b|\bserie\b/,
    detail: "elenco fabricado costura nome↔sobrenome pela letra repetida (GIA-28)",
    suggests: [{ decoderId: "acrostic", as: "acróstico" }],
  },
  {
    id: "peso-medida",
    reading: "medida",
    test: /\bmedida|\bmetro\b|\bregua\b|\bcomprimento|\btamanho\b|\baltura\b/,
    detail: "comprimento de barra ou de nome como índice (GIA-39 não tinha um dígito impresso)",
    suggests: [{ decoderId: "letter-index", as: "letra por posição" }],
  },
  {
    id: "moeda",
    reading: "dinheiro",
    test: /\bmoeda|dinheiro|\bdolar|\beuro\b|\bcambio|\bbanco\b|\bconta bancaria/,
    detail: "valor monetário costuma ser dígito disfarçado antes de virar identificador",
    suggests: [
      { decoderId: "math-helper", as: "aritmética escondida" },
      { decoderId: "pix-participant", as: "PIX (ISPB)" },
    ],
  },
  {
    id: "transito",
    reading: "trânsito",
    test: /transito|\bplaca\b|\bplacas\b|sinaliza|semaforo|\bctb\b|orientac/,
    detail: "o nome oficial da placa no CTB é que vira dicionário (GIA-25)",
    suggests: [{ as: "nome oficial da placa (CTB)" }],
  },
  {
    id: "arquivo",
    reading: "arquivo",
    test: /\barquivo|\bdocx\b|\bword\b|\bcamada\b|\bpdf\b|\bimagem\b/,
    detail: "o arquivo entregue pode ser o esconderijo — texto atrás da imagem, link sob a foto",
    suggests: [{ decoderId: "zero-width", as: "caracteres invisíveis" }],
  },
];

// ---------------------------------------------------------------------------
// Família 3 — anagrama do título
// ---------------------------------------------------------------------------

/**
 * Alvos de anagrama: palavras que o acervo usa como **checkpoint** — nome de
 * sistema, de mecânica ou de dicionário. A checagem é estrutural (multiconjunto
 * de letras), sem wordlist: *SONGI* → **SIGNO** (GIA-13) sai daqui.
 *
 * Não há wordlist porque `titleHints` é síncrono e as listas do repositório
 * carregam de forma assíncrona (`engine/words.ts`). Uma lista completa aumentaria
 * o alcance e o ruído na mesma proporção; estes alvos são os que **valem uma
 * cifra**.
 */
const ANAGRAM_TARGETS: { word: string; suggests: Suggestion[] }[] = [
  { word: "signo", suggests: [{ decoderId: "date-key", as: "data como chave" }] },
  { word: "signos", suggests: [{ decoderId: "date-key", as: "data como chave" }] },
  { word: "morse", suggests: [{ decoderId: "morse", as: "Morse" }] },
  { word: "braille", suggests: [{ decoderId: "braille", as: "Braille" }] },
  { word: "romano", suggests: [{ decoderId: "roman", as: "números romanos" }] },
  { word: "romanos", suggests: [{ decoderId: "roman", as: "números romanos" }] },
  { word: "cesar", suggests: [{ decoderId: "caesar-bruteforce", as: "César (força bruta)" }] },
  { word: "geotude", suggests: [{ decoderId: "location", as: "GeoTude" }] },
  { word: "mapcode", suggests: [{ decoderId: "location", as: "Mapcode" }] },
  { word: "geohash", suggests: [{ decoderId: "location", as: "Geohash" }] },
  { word: "binario", suggests: [{ decoderId: "binary", as: "binário → texto" }] },
  { word: "vogais", suggests: [{ decoderId: "vowel-cipher", as: "cifra vocálica" }] },
  { word: "polibio", suggests: [{ decoderId: "polybius", as: "Políbio" }] },
  { word: "teclado", suggests: [{ decoderId: "keyboard", as: "deslocamento de teclado" }] },
  { word: "alfabeto", suggests: [{ decoderId: "a1z26", as: "A1Z26" }] },
  { word: "espelho", suggests: [{ decoderId: "reverse", as: "inverter" }] },
  { word: "cores", suggests: [{ decoderId: "color-convert", as: "cores (hex/RGB/HSL)" }] },
  { word: "mapa", suggests: [{ decoderId: "location", as: "localização" }] },
  { word: "letras", suggests: [{ decoderId: "letter-index", as: "letra por posição" }] },
  { word: "palavras", suggests: [{ decoderId: "count-key", as: "contagem como chave" }] },
  { word: "telefone", suggests: [{ decoderId: "ddd", as: "DDD" }] },
  { word: "cidade", suggests: [{ decoderId: "ibge-municipio", as: "município (IBGE)" }] },
  { word: "bandeira", suggests: [{ decoderId: "ddi", as: "DDI" }] },
  { word: "musica", suggests: [{ decoderId: "music-notes", as: "notas musicais" }] },
  { word: "resistor", suggests: [{ decoderId: "resistor", as: "código de resistor" }] },
];

/** Assinatura de anagrama: letras a–z em ordem. */
function letterKey(token: string): string {
  return [...token].sort().join("");
}

/**
 * Siglas e romanos que ficam em caixa alta por convenção, não por disfarce.
 * Sem esta lista, todo título com "CEP" ou "GIA" viraria suspeita de anagrama.
 */
const CAPS_ALLOWLIST = new Set([
  "cep",
  "cpf",
  "cnpj",
  "ddd",
  "ddi",
  "gia",
  "gcb",
  "ncm",
  "isbn",
  "ean",
  "gs1",
  "iata",
  "icao",
  "ispb",
  "pix",
  "tse",
  "furb",
  "ctg",
  "ctb",
  "qr",
  "sc",
  "brasil",
  "blumenau",
  "itajai",
]);

/** Tokens do título, com a grafia original preservada para exibição. */
function tokensOf(title: string): { raw: string; folded: string }[] {
  const out: { raw: string; folded: string }[] = [];
  for (const m of title.matchAll(/[\p{L}]+/gu)) {
    const raw = m[0];
    const folded = stripDiacritics(raw).toLowerCase();
    if (/^[a-z]+$/.test(folded)) out.push({ raw, folded });
  }
  return out;
}

function anagramHints(title: string): Hint[] {
  const out: Hint[] = [];
  const toks = tokensOf(title);
  // Título inteiro em caixa alta não distingue nada — o destaque some.
  const mixedCase = title !== title.toUpperCase();

  for (const { raw, folded } of toks) {
    if (folded.length < 4 || folded.length > 12) continue;

    const key = letterKey(folded);
    const hit = ANAGRAM_TARGETS.find((t) => t.word !== folded && letterKey(t.word) === key);
    if (hit) {
      for (const s of hit.suggests) {
        out.push({
          id: `titulo-anagrama-${folded}-${s.decoderId ?? "livre"}`,
          label: `“${raw}” é anagrama de ${hit.word.toUpperCase()} → ${s.as}`,
          detail: "mesmas letras, outra ordem — foi assim que SONGI virou SIGNO na GIA-13",
          ...(s.decoderId ? { decoderId: s.decoderId } : {}),
        });
      }
      continue;
    }

    // Estrutural: a palavra em caixa alta que destoa de um título de caixa mista
    // é o sinal mais barato de "palavra fabricada". Sem wordlist não dá para
    // dizer no que ela vira — a aba Anagramas diz.
    const isShouted = mixedCase && raw === raw.toUpperCase() && !CAPS_ALLOWLIST.has(folded);
    if (isShouted) {
      out.push({
        id: `titulo-anagrama-caixa-${folded}`,
        label: `“${raw}” destoa — anagrama?`,
        detail:
          "palavra em caixa alta no meio de um título normal costuma ser fabricada; a aba Anagramas resolve com as wordlists",
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Família 4 — trunfos fonéticos curados
// ---------------------------------------------------------------------------

/**
 * Trocadilhos que o acervo registra por escrito. São **curados**, não inferidos:
 * cada um saiu de um gabarito da GIA 2026. Vêm antes dos temáticos porque quando
 * batem, batem exato.
 */
const PHONETIC_RULES: Rule[] = [
  {
    id: "ask-me",
    reading: "ask me",
    test: /\bask ?me\b/,
    detail: "trocadilho fonético com ASCII — GIA-01, 4 bytes binários viraram TOPO",
    suggests: [
      { decoderId: "decimal", as: "ASCII/decimal" },
      { decoderId: "binary", as: "binário → texto" },
    ],
  },
  {
    id: "que-bom",
    reading: "que bom",
    test: /\bque bom\b/,
    detail: "fonética de Kibon — GIA-02; a marca muda de nome por país e o acróstico deu SAL",
    suggests: [{ as: "marca global com nome local" }],
  },
  {
    id: "i-lingii",
    reading: "i lingii di i",
    test: /lingii|\bi\.? lingii/,
    detail: "o texto é feito de uma vogal só, e a cifra também: GIA-22 → LAPIS",
    suggests: [{ decoderId: "vowel-cipher", as: "cifra vocálica" }],
  },
  {
    id: "virada-maiuscula",
    reading: "virada maiúscula",
    test: /virada maiuscula/,
    detail: "o que “vira” é a maiúscula: iniciais das 7 frases deram FORMIGA (GIA-03)",
    suggests: [{ decoderId: "acrostic", as: "acróstico" }],
  },
  {
    id: "poder-das-palavras",
    reading: "o poder das palavras",
    test: /poder das palavras/,
    detail: "contar quantas palavras tem cada parágrafo → A1Z26 → VENCEDOR (GIA-04)",
    suggests: [
      { decoderId: "count-key", as: "contagem como chave" },
      { decoderId: "a1z26", as: "A1Z26" },
    ],
  },
  {
    id: "prova-quadrada",
    reading: "prova quadrada",
    test: /prova quadrada/,
    detail: "raiz quadrada dos 10 números, concatenada em dois grupos → coordenada (GIA-21)",
    suggests: [{ decoderId: "math-helper", as: "raiz quadrada" }],
  },
  {
    id: "paraiso-fiscal",
    reading: "paraíso fiscal",
    test: /paraiso fiscal/,
    detail: "dividir a carteira pela alíquota deu 8 dígitos = CEP (GIA-06)",
    suggests: [{ decoderId: "math-helper", as: "aritmética escondida" }],
  },
  {
    id: "quimico-maluco",
    reading: "químico maluco",
    test: /quimico maluco/,
    detail: "fórmula molecular: os subscritos em ordem viraram um telefone (GIA-19)",
    suggests: [{ decoderId: "periodic-table", as: "tabela periódica" }],
  },
  {
    id: "sinfonia-silenciosa",
    reading: "sinfonia silenciosa",
    test: /sinfonia silenciosa/,
    detail: "títulos de música embutidos na prosa, 5ª letra de trás para frente (GIA-30)",
    suggests: [
      { decoderId: "letter-index", as: "letra por posição" },
      { decoderId: "music-notes", as: "notas musicais" },
    ],
  },
  {
    id: "engenheiro-foragido",
    reading: "encontre o que todos têm em comum",
    test: /todos tem em comum|engenheiro foragido/,
    detail: "o comum era o MDC: dividir por 3 deu A1Z26 = GEOTUDE (GIA-27)",
    suggests: [
      { decoderId: "math-helper", as: "aritmética escondida" },
      { decoderId: "a1z26", as: "A1Z26" },
    ],
  },
];

// ---------------------------------------------------------------------------

function rulesToHints(rules: Rule[], prefix: string, folded: string): Hint[] {
  const out: Hint[] = [];
  for (const rule of rules) {
    if (!rule.test.test(folded)) continue;
    const many = rule.suggests.length > 1;
    for (const s of rule.suggests) {
      out.push({
        id: `${prefix}-${rule.id}${many ? `-${s.decoderId ?? "livre"}` : ""}`,
        label: `“${rule.reading}” → ${s.as}`,
        detail: rule.detail,
        ...(s.decoderId ? { decoderId: s.decoderId } : {}),
      });
    }
  }
  return out;
}

/**
 * Lê o título e devolve chips de sugestão. **Puro, síncrono e sem efeito no
 * ranking** — o retorno é informação para quem resolve, nunca entrada de cifra.
 *
 * Vazio quando o título não diz nada (o silêncio é resposta válida: ruído é
 * pior que ausência) e quando o texto é longo demais para ser um título.
 */
export function titleHints(title: string): Hint[] {
  const trimmed = title.trim();
  if (!trimmed) return [];
  if (trimmed.length > MAX_TITLE_CHARS) return [];
  if (trimmed.split(/\s+/).length > MAX_TITLE_WORDS) return [];

  const folded = stripDiacritics(trimmed).toLowerCase();
  // Ordem de saída: quanto mais literal a leitura, mais cedo o chip aparece —
  // citação do sistema, trocadilho curado, anagrama, tema. Com o teto de chips,
  // essa ordem é quem decide o que sobrevive.
  const out: Hint[] = [
    ...rulesToHints(SYSTEM_RULES, "titulo-sistema", folded),
    ...rulesToHints(PHONETIC_RULES, "titulo-trunfo", folded),
    ...anagramHints(trimmed),
    ...rulesToHints(THEME_RULES, "titulo-tema", folded),
  ];

  const seen = new Set<string>();
  const unique = out.filter((h) => {
    // Um decodificador por título: duas regras apontando para a mesma cifra
    // viram um chip só. A dica sem decodificador é sempre única pelo id.
    const key = h.decoderId ?? h.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.slice(0, MAX_HINTS);
}
