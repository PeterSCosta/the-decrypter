/**
 * Prefixos GS1 (país/organização que registrou o código de barras), a partir
 * dos 3 primeiros dígitos do EAN-13. Inclui faixas especiais: ISBN (livros),
 * ISSN (revistas), uso interno de loja e cupons.
 */
export type Gs1Special = "isbn" | "issn" | "internal" | "coupon" | "gs1";

export interface Gs1Info {
  name: string;
  special?: Gs1Special;
}

// [início, fim, nome, especial?] sobre o prefixo de 3 dígitos (000–999).
// biome-ignore format: tabela compacta.
const RANGES: [number, number, string, Gs1Special?][] = [
  [0, 19, "EUA / Canadá"], [20, 29, "uso interno (loja)", "internal"],
  [30, 39, "EUA / Canadá"], [40, 49, "uso interno (loja)", "internal"],
  [50, 59, "cupom (EUA)", "coupon"], [60, 139, "EUA / Canadá"],
  [200, 299, "uso interno (loja)", "internal"],
  [300, 379, "França e Mônaco"], [380, 380, "Bulgária"], [383, 383, "Eslovênia"],
  [385, 385, "Croácia"], [387, 387, "Bósnia e Herzegovina"], [389, 389, "Montenegro"],
  [390, 390, "Kosovo"], [400, 440, "Alemanha"], [450, 459, "Japão"], [460, 469, "Rússia"],
  [470, 470, "Quirguistão"], [471, 471, "Taiwan"], [474, 474, "Estônia"], [475, 475, "Letônia"],
  [476, 476, "Azerbaijão"], [477, 477, "Lituânia"], [478, 478, "Uzbequistão"], [479, 479, "Sri Lanka"],
  [480, 480, "Filipinas"], [481, 481, "Belarus"], [482, 482, "Ucrânia"], [483, 483, "Turcomenistão"],
  [484, 484, "Moldávia"], [485, 485, "Armênia"], [486, 486, "Geórgia"], [487, 487, "Cazaquistão"],
  [488, 488, "Tajiquistão"], [489, 489, "Hong Kong"], [490, 499, "Japão"], [500, 509, "Reino Unido"],
  [520, 521, "Grécia"], [528, 528, "Líbano"], [529, 529, "Chipre"], [530, 530, "Albânia"],
  [531, 531, "Macedônia do Norte"], [535, 535, "Malta"], [539, 539, "Irlanda"],
  [540, 549, "Bélgica e Luxemburgo"], [560, 560, "Portugal"], [569, 569, "Islândia"],
  [570, 579, "Dinamarca, Ilhas Faroé e Groenlândia"], [590, 590, "Polônia"], [594, 594, "Romênia"],
  [599, 599, "Hungria"], [600, 601, "África do Sul"], [603, 603, "Gana"], [604, 604, "Senegal"],
  [608, 608, "Bahrein"], [609, 609, "Maurício"], [611, 611, "Marrocos"], [613, 613, "Argélia"],
  [615, 615, "Nigéria"], [616, 616, "Quênia"], [617, 617, "Camarões"], [618, 618, "Costa do Marfim"],
  [619, 619, "Tunísia"], [620, 620, "Tanzânia"], [621, 621, "Síria"], [622, 622, "Egito"],
  [623, 623, "Brunei"], [624, 624, "Líbia"], [625, 625, "Jordânia"], [626, 626, "Irã"],
  [627, 627, "Kuwait"], [628, 628, "Arábia Saudita"], [629, 629, "Emirados Árabes Unidos"],
  [630, 630, "Catar"], [640, 649, "Finlândia"], [690, 699, "China"], [700, 709, "Noruega"],
  [729, 729, "Israel"], [730, 739, "Suécia"], [740, 740, "Guatemala"], [741, 741, "El Salvador"],
  [742, 742, "Honduras"], [743, 743, "Nicarágua"], [744, 744, "Costa Rica"], [745, 745, "Panamá"],
  [746, 746, "República Dominicana"], [750, 750, "México"], [754, 755, "Canadá"], [759, 759, "Venezuela"],
  [760, 769, "Suíça e Liechtenstein"], [770, 771, "Colômbia"], [773, 773, "Uruguai"], [775, 775, "Peru"],
  [777, 777, "Bolívia"], [778, 779, "Argentina"], [780, 780, "Chile"], [784, 784, "Paraguai"],
  [786, 786, "Equador"], [789, 790, "Brasil"], [800, 839, "Itália, San Marino e Vaticano"],
  [840, 849, "Espanha e Andorra"], [850, 850, "Cuba"], [858, 858, "Eslováquia"], [859, 859, "Tchéquia"],
  [860, 860, "Sérvia"], [865, 865, "Mongólia"], [867, 867, "Coreia do Norte"], [868, 869, "Turquia"],
  [870, 879, "Países Baixos"], [880, 880, "Coreia do Sul"], [883, 883, "Mianmar"], [884, 884, "Camboja"],
  [885, 885, "Tailândia"], [888, 888, "Singapura"], [890, 890, "Índia"], [893, 893, "Vietnã"],
  [896, 896, "Paquistão"], [899, 899, "Indonésia"], [900, 919, "Áustria"], [930, 939, "Austrália"],
  [940, 949, "Nova Zelândia"], [950, 950, "GS1 Global", "gs1"], [955, 955, "Malásia"],
  [958, 958, "Macau"], [960, 969, "GS1 Global (GTIN-8)", "gs1"], [977, 977, "ISSN — revista/periódico", "issn"],
  [978, 979, "ISBN — livro (Bookland)", "isbn"], [980, 980, "recibo de reembolso", "internal"],
  [981, 984, "cupom (moeda comum)", "coupon"], [990, 999, "cupom", "coupon"],
];

/** País/organização do prefixo de 3 dígitos (000–999) do EAN-13. */
export function gs1Lookup(prefix3: number): Gs1Info | null {
  for (const [lo, hi, name, special] of RANGES) {
    if (prefix3 >= lo && prefix3 <= hi) return special ? { name, special } : { name };
  }
  return null;
}
