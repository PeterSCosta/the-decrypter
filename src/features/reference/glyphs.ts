/**
 * Alfabetos que se LEEM, não se digitam: pigpen (maçônico) e o alfabeto manual
 * de Libras. Aqui é **só referência** — a aba Cola monta a legenda a partir
 * destes dados.
 *
 * Por que não viram decoder: nenhum dos dois tem bloco Unicode, e a entrada
 * real de prova é uma **imagem** (o puzzle desenhado, a foto da mão). Descrever
 * glifo por glifo para digitar seria mais lento do que olhar a legenda e
 * escrever a letra — a ferramenta certa é a tabela, não o motor.
 *
 * Âncoras do acervo:
 * - pigpen — P21 de 2023, *Puzzle & Poesia*: os três poetas são maçons, o puzzle
 *   é o alfabeto maçônico e a mensagem manda "levar pastel na CO" (1/4 de
 *   cumprimento — a dupla sacada é que era cara, não a decodificação);
 * - Libras — P23 de 2019, *Gincana Raiz* (o acervo registra a cifra no catálogo;
 *   o gabarito da prova não está em `RESOLUCOES.md`).
 */

// ---------------------------------------------------------------- pigpen ----

/** As quatro grades do pigpen, na ordem clássica A–I, J–R, S–V, W–Z. */
export type PigpenGrid = "grade" | "grade-ponto" | "xis" | "xis-ponto";

/** Onde a letra mora: célula da grade 3×3 ou cunha do xis. */
export type PigpenCell =
  | "superior esquerda"
  | "superior centro"
  | "superior direita"
  | "meio esquerda"
  | "centro"
  | "meio direita"
  | "inferior esquerda"
  | "inferior centro"
  | "inferior direita"
  | "cima"
  | "esquerda"
  | "direita"
  | "baixo";

export interface PigpenGlyph {
  letter: string;
  grid: PigpenGrid;
  cell: PigpenCell;
  /** O ponto é o que separa a 1ª grade da 2ª (e o 1º xis do 2º). */
  dot: boolean;
  /** Traços desenhados, na grade: cima/direita/baixo/esquerda. */
  sides?: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  /** Desenho em ASCII, sempre 3 linhas de 3 colunas — cabe em qualquer largura. */
  ascii: [string, string, string];
  /** Descrição curta, para quem lê a tabela sem olhar o desenho. */
  hint: string;
}

const GRID_CELLS: PigpenCell[] = [
  "superior esquerda",
  "superior centro",
  "superior direita",
  "meio esquerda",
  "centro",
  "meio direita",
  "inferior esquerda",
  "inferior centro",
  "inferior direita",
];

const SIDE_NAMES: [keyof NonNullable<PigpenGlyph["sides"]>, string][] = [
  ["top", "cima"],
  ["right", "direita"],
  ["bottom", "baixo"],
  ["left", "esquerda"],
];

/**
 * Numa grade da velha (o "#"), a célula só desenha os traços INTERNOS que a
 * cercam: a borda externa não existe. Daí A ser uma cantoneira (direita+baixo) e
 * só o E ser um quadrado fechado.
 */
function gridGlyph(letter: string, index: number, dot: boolean): PigpenGlyph {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const sides = { top: row > 0, right: col < 2, bottom: row < 2, left: col > 0 };
  const drawn = SIDE_NAMES.filter(([k]) => sides[k]).map(([, label]) => label);
  return {
    letter,
    grid: dot ? "grade-ponto" : "grade",
    cell: GRID_CELLS[index],
    dot,
    sides,
    ascii: [
      sides.top ? "___" : "   ",
      `${sides.left ? "|" : " "}${dot ? "." : " "}${sides.right ? "|" : " "}`,
      `${sides.left ? "|" : " "}${sides.bottom ? "_" : " "}${sides.right ? "|" : " "}`,
    ],
    hint: `traços ${drawn.join(", ")}${dot ? " · com ponto" : ""}`,
  };
}

/** No xis, a letra é a cunha (duas hastes) e o ponto mora dentro da abertura. */
function wedgeGlyph(letter: string, cell: PigpenCell, dot: boolean): PigpenGlyph {
  const d = dot ? "." : " ";
  const ascii: Record<string, [string, string, string]> = {
    cima: [` ${d} `, "\\ /", "   "],
    baixo: ["   ", "/ \\", ` ${d} `],
    esquerda: [" \\ ", `${d}  `, " / "],
    direita: [" / ", `  ${d}`, " \\ "],
  };
  return {
    letter,
    grid: dot ? "xis-ponto" : "xis",
    cell,
    dot,
    ascii: ascii[cell],
    hint: `cunha aberta para ${cell === "cima" || cell === "baixo" ? cell : `a ${cell}`}${
      dot ? " · com ponto" : ""
    }`,
  };
}

const WEDGE_CELLS: PigpenCell[] = ["cima", "esquerda", "direita", "baixo"];

/** A–Z na variante clássica: 2 grades da velha + 2 xis, o ponto marcando a 2ª. */
export const PIGPEN: PigpenGlyph[] = [
  ...[..."ABCDEFGHI"].map((l, i) => gridGlyph(l, i, false)),
  ...[..."JKLMNOPQR"].map((l, i) => gridGlyph(l, i, true)),
  ...[..."STUV"].map((l, i) => wedgeGlyph(l, WEDGE_CELLS[i], false)),
  ...[..."WXYZ"].map((l, i) => wedgeGlyph(l, WEDGE_CELLS[i], true)),
];

export interface PigpenGroup {
  grid: PigpenGrid;
  title: string;
  letters: PigpenGlyph[];
}

/** Os quatro blocos, na ordem em que a legenda costuma ser desenhada. */
export const PIGPEN_GROUPS: PigpenGroup[] = [
  { grid: "grade", title: "Grade — A a I", letters: PIGPEN.slice(0, 9) },
  { grid: "grade-ponto", title: "Grade com ponto — J a R", letters: PIGPEN.slice(9, 18) },
  { grid: "xis", title: "Xis — S a V", letters: PIGPEN.slice(18, 22) },
  { grid: "xis-ponto", title: "Xis com ponto — W a Z", letters: PIGPEN.slice(22, 26) },
];

export const PIGPEN_NOTES: string[] = [
  "A ordem A–I / J–R / S–V / W–Z é a variante clássica, mas há outras: se o texto não abrir, tente trocar a 2ª grade pelo 1º xis.",
  "Variante rosacruz: os pontos ficam dentro dos quadrantes, e não só na 2ª grade.",
  "O ponto é o único sinal que separa duas letras de mesmo desenho — procure-o antes de chutar.",
  "Pista de tema, não de forma: maçonaria, lojas, esquadro e compasso costumam anunciar que o puzzle é pigpen.",
];

// ---------------------------------------------------------------- Libras ----

export interface LibrasSign {
  letter: string;
  /** Configuração da mão, em texto (palma para frente, salvo indicação). */
  hand: string;
  /** Letras que só existem com movimento — a foto parada engana. */
  movement?: string;
}

/**
 * Datilologia de Libras em texto. É referência de leitura ("a foto mostra isto,
 * logo a letra é aquela"), não gabarito de prova de Libras: há variação regional
 * e de manual, e as letras com movimento não cabem numa descrição estática.
 */
export const LIBRAS: LibrasSign[] = [
  { letter: "A", hand: "punho fechado, polegar estendido ao lado do indicador" },
  { letter: "B", hand: "quatro dedos estendidos e juntos, polegar dobrado sobre a palma" },
  { letter: "C", hand: "mão curvada em C, dedos juntos" },
  { letter: "D", hand: "indicador estendido para cima; os outros dedos tocam o polegar" },
  { letter: "E", hand: "dedos dobrados sobre o polegar, como uma garra fechada" },
  { letter: "F", hand: "polegar e indicador em círculo; médio, anelar e mínimo estendidos" },
  {
    letter: "G",
    hand: "indicador e polegar estendidos em ângulo, mão deitada apontando para o lado",
  },
  {
    letter: "H",
    hand: "indicador e médio estendidos e juntos, mão deitada",
    movement: "desliza para o lado",
  },
  { letter: "I", hand: "mínimo estendido, demais dedos fechados" },
  {
    letter: "J",
    hand: "mínimo estendido, como o I",
    movement: "desenha o gancho do J no ar",
  },
  { letter: "K", hand: "indicador e médio estendidos em V, polegar entre eles" },
  { letter: "L", hand: "polegar e indicador estendidos em ângulo reto (L)" },
  { letter: "M", hand: "indicador, médio e anelar estendidos e juntos, apontando para baixo" },
  { letter: "N", hand: "indicador e médio estendidos e juntos, apontando para baixo" },
  { letter: "O", hand: "todos os dedos curvados formando um círculo" },
  { letter: "P", hand: "como o K, com a mão voltada para baixo" },
  { letter: "Q", hand: "como o G, com a mão voltada para baixo" },
  { letter: "R", hand: "indicador e médio estendidos e cruzados" },
  { letter: "S", hand: "punho fechado com o polegar cruzado por cima dos dedos" },
  { letter: "T", hand: "punho fechado com o polegar entre indicador e médio" },
  { letter: "U", hand: "indicador e médio estendidos, juntos, para cima" },
  { letter: "V", hand: "indicador e médio estendidos e separados (V)" },
  { letter: "W", hand: "indicador, médio e anelar estendidos e separados" },
  {
    letter: "X",
    hand: "indicador dobrado em gancho, demais dedos fechados",
    movement: "flexiona o indicador",
  },
  { letter: "Y", hand: "polegar e mínimo estendidos, demais fechados" },
  {
    letter: "Z",
    hand: "indicador estendido, como o D sem o círculo",
    movement: "desenha o Z no ar",
  },
];

export const LIBRAS_NOTES: string[] = [
  "Punhos parecidos: A (polegar ao lado), S (polegar por cima) e T (polegar entre os dedos) só diferem pelo polegar.",
  "Pares que se confundem em foto: M/N (três dedos × dois), U/V (juntos × separados), K/P e G/Q (mesma mão, virada para baixo).",
  "H, J, X e Z têm movimento: numa foto parada, decida pelo contexto da palavra.",
  "Letra soletrada aparece em vídeo de prova; conte as trocas de mão para saber quantas letras são antes de tentar ler.",
];
