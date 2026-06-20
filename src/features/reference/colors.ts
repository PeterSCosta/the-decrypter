import { stripDiacritics } from "@/features/decoder/engine/util";

/**
 * Tabela CORES do gabarito da Equipe Arromba: cada cor com seu HEX, a
 * quantidade de letras e a soma A1Z26 do nome (computadas — batem com o
 * gabarito). Os HEX são reproduzidos exatamente como no gabarito; note que
 * Branco e Preto aparecem com o HEX trocado (#000000 / #FFFFFF) no original.
 */
export interface ColorRef {
  name: string;
  hex: string;
  letters: number;
  sum: number;
}

const RAW: [name: string, hex: string][] = [
  ["Amarelo", "#fff200"],
  ["Azul", "#00aeef"],
  ["Branco", "#000000"],
  ["Cinza", "#939598"],
  ["Laranja", "#f7941d"],
  ["Marrom", "#7d3d19"],
  ["Preto", "#ffffff"],
  ["Rosa", "#ec008c"],
  ["Verde", "#00a651"],
  ["Vermelho", "#ed1c24"],
  ["Violeta", "#50479d"],
];

/** Quantidade de letras (A–Z) e soma A1Z26 de um nome, ignorando acentos. */
function letterStats(name: string): { letters: number; sum: number } {
  let letters = 0;
  let sum = 0;
  for (const ch of stripDiacritics(name).toUpperCase()) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) {
      letters++;
      sum += c - 64;
    }
  }
  return { letters, sum };
}

export const COLORS: ColorRef[] = RAW.map(([name, hex]) => ({ name, hex, ...letterStats(name) }));
