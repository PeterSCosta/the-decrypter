import { mapDecoder } from "../define";
import { bytesToText } from "../util";

/**
 * basE91 — binário→texto mais denso que o Base64.
 *
 * Empacota 13 ou 14 bits por par de caracteres, o que dá ~23% de inchaço contra
 * os 33% do Base64. Usa 91 dos 94 ASCII imprimíveis; ficam de fora o hífen, a
 * barra invertida e as aspas simples.
 *
 * A decodificação lê o texto **aos pares**: cada par vira um valor de 0 a 8280,
 * e o número de bits que ele carrega depende do próprio valor — 13 quando os 13
 * bits baixos ficam abaixo de 89, senão 14. É essa densidade variável que o
 * distingue de todas as outras bases da bancada.
 */
const ALFABETO =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';

const INDICE = new Map<string, number>();
for (let i = 0; i < ALFABETO.length; i++) INDICE.set(ALFABETO[i], i);

export const decoders = mapDecoder({
  id: "base91",
  name: "Base91 (basE91)",
  category: "encoding",
  decode(input) {
    const s = input.trim();
    // Curto demais não decide nada, e todo Base64 é Base91 válido — a diferença
    // aparece no resultado, não no formato. O piso de 4 evita o card em ruído.
    if (s.length < 4 || s.length > 4096) return null;
    if (![...s].every((c) => INDICE.has(c))) return null;

    const saida: number[] = [];
    let acumulador = 0;
    let bits = 0;
    let valor = -1;

    for (const c of s) {
      const d = INDICE.get(c) as number;
      if (valor < 0) {
        valor = d;
        continue;
      }
      valor += d * 91;
      acumulador |= valor << bits;
      // Aqui mora a densidade variável: 13 bits quando cabe, senão 14.
      bits += (valor & 8191) > 88 ? 13 : 14;
      do {
        saida.push(acumulador & 0xff);
        acumulador >>= 8;
        bits -= 8;
      } while (bits > 7);
      valor = -1;
    }
    // Sobra ímpar: o último caractere fecha o que restou.
    if (valor >= 0) saida.push((acumulador | (valor << bits)) & 0xff);

    if (!saida.length) return null;
    return bytesToText(Uint8Array.from(saida));
  },
});
