/**
 * Cores nomeadas — a "Lista de cores" da Wikipédia em português
 * (https://pt.wikipedia.org/wiki/Lista_de_cores, 255 entradas, CC BY-SA 4.0),
 * mais a matemática de conversão entre espaços (hex ↔ RGB ↔ HSL ↔ CIELab).
 *
 * O IDIOMA É REQUISITO FUNCIONAL, não gosto: a resolução da prova P3 Et.2 de
 * 2022 manda consultar essa página em português. Em inglês a âncora não fecha
 * — as seis misturas dariam B-S-N-B-S-A em vez de BANANA (Bege, Açafrão,
 * Naval, Azul, Neve, Ametista).
 *
 * Da tabela da Wikipédia só o HEX foi aproveitado: 43 das 255 linhas trazem
 * r/g/b que não batem com o próprio hex (a coluna é preenchida à mão lá), e
 * o modelo de lá é HSV, não HSL — os outros espaços saem da conta.
 *
 * Separado de `colors.ts` de propósito: aquele é o gabarito de 11 cores da
 * Equipe Arromba, com Branco e Preto de HEX trocado como no original.
 */

export type RGB = [r: number, g: number, b: number];
/** Matiz em graus (0–360), saturação e luminosidade em % (0–100). */
export type HSL = [h: number, s: number, l: number];
/** CIELab D65: L* (0–100), a*, b*. */
export type Lab = [l: number, a: number, b: number];

export interface NamedColor {
  name: string;
  /** Sempre "RRGGBB" maiúsculo, sem "#". */
  hex: string;
  rgb: RGB;
  lab: Lab;
}

export interface ColorMatch {
  color: NamedColor;
  /** ΔE CIE76 até a cor pedida; 0 = a lista tem o hex exato. */
  deltaE: number;
  /** Outros nomes da lista para o MESMO hex (ex.: Rubro, Encarnado). */
  aliases: string[];
}

// ---- conversões -----------------------------------------------------------

/** "#f5f5dc", "f5f5dc" ou "#abc" → [245, 245, 220]. Fora disso, null. */
export function parseHex(text: string): RGB | null {
  const h = text.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    const [r, g, b] = [...h].map((c) => Number.parseInt(c + c, 16));
    return [r, g, b];
  }
  if (/^[0-9a-fA-F]{6}$/.test(h)) {
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16),
    ];
  }
  return null;
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

const clamp255 = (v: number) => Math.min(255, Math.max(0, Math.round(v)));

/** RGB → HSL, já arredondado para exibição (h em graus, s/l em %). */
export function rgbToHsl([r, g, b]: RGB): HSL {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [Math.round(h) % 360, Math.round(s * 100), Math.round(l * 100)];
}

/** HSL → RGB. `s`/`l` em % (0–100), `h` em graus (qualquer inteiro). */
export function hslToRgb([h, s, l]: HSL): RGB {
  const hh = ((h % 360) + 360) % 360;
  const sn = Math.min(100, Math.max(0, s)) / 100;
  const ln = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ln - c / 2;
  const seg = Math.floor(hh / 60) % 6;
  const table: RGB[] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const [r, g, b] = table[seg];
  return [clamp255((r + m) * 255), clamp255((g + m) * 255), clamp255((b + m) * 255)];
}

/** Componente sRGB → linear (a curva de gama, não uma divisão por 255). */
function linearize(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB → CIELab com branco D65 — o espaço em que "perto" quer dizer perto. */
export function rgbToLab([r, g, b]: RGB): Lab {
  const rl = linearize(r);
  const gl = linearize(g);
  const bl = linearize(b);
  const x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / 0.95047;
  const y = 0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl;
  const z = (0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** ΔE CIE76: distância euclidiana em CIELab. */
export function deltaE76(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// ---- a lista --------------------------------------------------------------

/**
 * Onze hexes da lista têm mais de um nome. A ordem alfabética da Wikipédia
 * responderia "Encarnado" para #FF0000 e "Água" para #00FFFF; estes são os
 * nomes que o leitor pt-BR espera (e #00FF00 é "Verde" no gabarito de 2023,
 * então entre "Lima" e "Verde espectro" vale o segundo). Os demais viram
 * `aliases` — nada se perde.
 */
const PREFERIDOS = new Set([
  "Ciano",
  "Anil",
  "Vermelho escuro",
  "Cinza",
  "Cinza-ardósia-claro",
  "Cinza-claro",
  "Vermelho",
  "Verde espectro",
  "Verde-oliva",
  "Quartzo rosa",
  "Rosa",
]);

/** `HEX Nome` por linha, como sai do template `Tabela:ListaDeCores/Cor`. */
const TABELA = `
F4C430 Açafrão
00FFFF Água
7FFFD4 Água-marinha
66CDAA Água-marinha média
E32636 Alizarina
FFFF00 Amarelo
ECDB00 Amarelo brasilis
FFFFE0 Amarelo claro
ECD690 Amarelo creme
F2B73F Amarelo-escuro
ADFF2F Amarelo esverdeado
FAFAD2 Amarelo ouro claro
EEAD2D Amarelo queimado
FFBF00 Âmbar
DDA0DD Ameixa
FFEBCD Amêndoa
9966CC Ametista
3F00FF Anil
7BA05B Aspargo
0000FF Azul
4682B4 Azul aço
B0C4DE Azul aço claro
F0F8FF Azul alice
3F00FF Azul Anil
6A5ACD Azul ardósia
8470FF Azul ardósia claro
483D8B Azul ardósia escuro
7B68EE Azul ardósia médio
B8CAD4 Azul areado
89CFF0 Azul bebê
3457D5 Azul bizantino
2A2F4D Azul bizantino escuro
00BDCE Azul brasilis
09ACDB Azul brasilis brilhante
5F9EA0 Azul cadete
054F77 Azul camarada
B2FFFF Azul celeste
87CEFA Azul céu claro
8CBED6 Azul céu escuro
00AAE4 Azul céu espanhol
77B5FE Azul céu francês
80DAEB Azul céu médio
00BFFF Azul céu profundo
00CCFF Azul céu vívido
ADD8E6 Azul claro
0047AB Azul cobalto
00008B Azul escuro
6495ED Azul flor de milho
5D8AA8 Azul força aérea
1E90FF Azul furtivo
A6AA3E Azul manteiga
120A8F Azul marinho
0000CD Azul médio
191970 Azul meia-noite
084D6E Azul petróleo
B0E0E6 Azul pólvora
0000DD Azul real
248EFF Azul taparuere
1981CD Azul Tóquio
00CCEE Azul turquesa
00DDFF Azul turquesa brilhante
260376 Azul Violeta ou Arroxeado
0080FF Azure
F5F5DC Bege
800000 Bordô
900020 Borgonha
FFFFFF Branco
FAEBD7 Branco antigo
F8F8FF Branco fantasma
FFFAF0 Branco floral
F5F5F5 Branco fumaça
FFDEAD Branco navajo
A7F432 Brasil
CD7F32 Bronze
F0E68C Caqui
BDB76B Caqui escuro
8B5742 Caramelo
D8BFD8 Cardo
DC143C Carmesim
712F26 Carmim
992244 Carmim clássico
960018 Carmim carnáceo
8B0000 Castanho-avermelhado
D2B48C Castanho claro
ED9121 Cenoura
DE3163 Cereja
F400A1 Cereja Hollywood
D2691E Chocolate
00FFFF Ciano
E0FFFF Ciano claro
008B8B Ciano-escuro
808080 Cinza
708090 Cinza-ardósia
778899 Cinza-ardósia-claro
2F4F4F Cinza ardósia escuro
D3D3D3 Cinza-médio
A9A9A9 Cinza-escuro
696969 Cinza-fosco
DCDCDC Cinza-claro
808080 Cinzento
B87333 Cobre
FFF5EE Concha
FF7F50 Coral
F08080 Coral claro
F0DC82 Couro
FFFDD0 Creme
FFE4C4 Creme de marisco
F5FFFA Creme de menta
778899 Dainise
DAA520 Dourado
B8860B Dourado escuro
EEE8AA Dourado pálido
555D50 Ébano
6C3082 Eminência
FF0000 Encarnado
FF2400 Escarlate
50C878 Esmeralda
44D7A8 Eucalipto
B53389 Fandango
FDD5B1 Feldspato
B7410E Ferrugem
A2006D Flerte
3D2B1F Fuligem
730348 Fúcsia
DCDCDC Gainsboro
E6E8FA Glitter
BE5B59 Goiaba
831D1C Grená
808080 Gris
F2E7B5 Gengibre
2E8B57 Herbal
DF73FF Heliotrópio
4B0082 Índigo
4C516D Independência
5A4FCF Íris
F4F0EC Isabelina
00A86B Jade
FF4500 Jambo
F8DE7E Jasmine
8EE53F Kiwi
E79FC4 Kobi
6B4423 Kobicha
FFA500 Laranja
FF8C00 Laranja-escuro
FFB84D Laranja claro
E6E6FA Lavanda
FFF0F5 Lavanda avermelhada
C8A2C8 Lilás
00FF00 Lima
FDE910 Lemon
FAF0E6 Linho
DEB887 Madeira
FF00FF Magenta
7A387A Magenta escuro
E0B0FF Malva
FFEFD5 Mamão batido
F0FFF0 Maná
FFFFF0 Marfim
964B00 Marrom
F4A361 Marrom amarelado
946746 Marrom claro
BC8F8F Marrom rosado
8B4513 Marrom sela
FBEC5D Milho
FFF8DC Milho claro
FFE4B5 Mocassim
FFDB58 Mostarda
000080 Naval
FFFAFA Neve
E9FFDB Nyanza
CC7722 Ocre
808000 Oliva
556B2F Oliva escura
6B8E23 Oliva parda
DA70D6 Orquídea
9932CC Orquídea escura
BA55D3 Orquídea média
FFD700 Ouro
CD853F Pardo
CC6600 Pardo escuro
C0C0C0 Prata
000000 Preto
FFDAB9 Pêssego
800080 Púrpura
9370DB Púrpura média
111111 Quantum
51484F Quartz
B5818B Quartzo rosa
FDF5E6 Renda antiga
FFCBDB Rosa
CD69CD Rosa amoroso
FFB7CE Rosa bebê
FF007F Rosa brilhante
FC0FC0 Rosa-choque
FFB6C1 Rosa claro
DA69A1 Rosa danação
FFE4E1 Rosa embaçado
FF69B4 Rosa forte
FF1493 Rosa profundo
B5818B Rosa quartzo
FFCBDB Rosacéo
FFCBDB Rosado
993399 Roxo
8A008A Roxo brasilis
FF0000 Rubro
6D351A Rútilo
FA7F72 Salmão
FFA07A Salmão claro
E9967A Salmão escuro
9D5450 Salsa
705714 Sépia
FF8247 Siena
F28500 Tangerina
E2725B Terracota
B22222 Tijolo refratário
FF6347 Tomate
F5DEB3 Trigo
FF2401 Triássico
40E0D0 Turquesa
00CED1 Turquesa escura
48D1CC Turquesa média
AFEEEE Turquesa pálida
8878C3 Ube
EC2300 Urucum
421C52 Uva
008000 Verde
00FF00 Verde espectro
18FFDD Verde-Água
90EE90 Verde claro
006400 Verde-escuro
228B22 Verde-floresta
CCFF33 Verde fluorescente
7CFC00 Verde grama
20B2AA Verde mar claro
8FBC8F Verde mar escuro
3CB371 Verde mar médio
78866B Verde militar
6B8E23 Verde-oliva
7FFF00 Verde Paris
00FF7F Verde-primavera
00FA9A Verde primavera médio
98FB98 Verde pastel
008080 Verde-azulado
7DFDC0 Verde-Menta
FF0000 Vermelho
550000 Vermelho enegrecido
8B0000 Vermelho escuro
CD5C5C Vermelho indiano
BE0040 Vermelho arroxeado
D02090 Vermelho violeta
C71585 Vermelho violeta médio
DB7093 Vermelho violeta pálido
EE82EE Violeta
9400D3 Violeta escuro
F8CBF8 Violeta claro
`;

/** As 255 cores, na ordem alfabética da Wikipédia. */
export const NAMED_COLORS: NamedColor[] = TABELA.trim()
  .split("\n")
  .map((line) => {
    const hex = line.slice(0, 6);
    const rgb = parseHex(hex) as RGB;
    return { name: line.slice(7), hex, rgb, lab: rgbToLab(rgb) };
  });

/** hex → todos os nomes daquele hex, o preferido na frente. */
const BY_HEX = new Map<string, NamedColor[]>();
for (const c of NAMED_COLORS) {
  const group = BY_HEX.get(c.hex);
  if (!group) BY_HEX.set(c.hex, [c]);
  else if (PREFERIDOS.has(c.name)) group.unshift(c);
  else group.push(c);
}

/**
 * Cor mais próxima da lista, por ΔE CIE76. Distância euclidiana em RGB erra
 * justamente onde as provas moram (matiz saturado e cor escura): para
 * rgb(5, 56, 44) ela responde "Quantum" (#111111, preto), enquanto o CIELab
 * responde "Cinza ardósia escuro".
 */
export function nearestNamedColor(rgb: RGB): ColorMatch {
  const lab = rgbToLab(rgb);
  let best = NAMED_COLORS[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const c of NAMED_COLORS) {
    const d = deltaE76(lab, c.lab);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  // Empate real só acontece entre nomes do mesmo hex — o preferido vem primeiro.
  const group = BY_HEX.get(best.hex) ?? [best];
  return {
    color: group[0],
    deltaE: bestD,
    aliases: group.slice(1).map((c) => c.name),
  };
}
