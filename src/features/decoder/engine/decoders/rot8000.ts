import { mapDecoder } from "../define";

/**
 * ROT8000 — o ROT13 do Unicode.
 *
 * Rotaciona cada caractere METADE do Plano Multilíngue Básico, pulando os
 * blocos que não são texto (controles, espaços exóticos, área de substitutos).
 * Sobram 63.404 posições, e o deslocamento é 31.702 — exatamente a metade, o
 * que torna a cifra AUTO-INVERSA: aplicar duas vezes devolve o original, como
 * no ROT13. O efeito visível é que texto latino vira ideograma CJK e vice-versa
 * ("Blumenau" → "籋籵籾籶籮籷籪籾").
 *
 * POR QUE ENTRA NA BANCADA: o acervo tem a tradição dos alfabetos exóticos
 * (A10 do DICIONARIO-CIFRAS.md — nyctográfico, runas, ideogramas japoneses em
 * 2016) e a regra prática registrada lá é que alfabeto exótico EXIGE dica da
 * fonte, senão zera. O ROT8000 dispensa a dica: a equipe vê chinês, cola aqui e
 * sai português. É camada vistosa que não é filtro.
 *
 * Referência: github.com/rottytooth/rot8000 (rot8000.js).
 */

const ID = "rot8000";
const NAME = "ROT8000 (Unicode)";

/**
 * As 9 faixas válidas do BMP, em ordem crescente e com limites INCLUSIVOS.
 * Os buracos entre elas são justamente o que a cifra não toca: 0–32 e 127–160
 * (controles), 5760 / 8192–8202 / 8232–8233 / 8239 / 8287 / 12288 (espaços e
 * marcas de direção) e 55296–57343 (substitutos UTF-16).
 */
const RANGES: readonly (readonly [number, number])[] = [
  [33, 126],
  [161, 5759],
  [5761, 8191],
  [8203, 8231],
  [8234, 8238],
  [8240, 8286],
  [8288, 12287],
  [12289, 55295],
  [57344, 65535],
];

/** Índice acumulado onde cada faixa começa no alfabeto achatado. */
const STARTS: number[] = (() => {
  const out: number[] = [];
  let n = 0;
  for (const [a, b] of RANGES) {
    out.push(n);
    n += b - a + 1;
  }
  return out;
})();

/** 63.404 posições — o número documentado pela implementação de referência. */
const TOTAL =
  STARTS[STARTS.length - 1] + (RANGES[RANGES.length - 1][1] - RANGES[RANGES.length - 1][0] + 1);
/** 31.702 = TOTAL / 2. É o que torna a cifra auto-inversa. */
const ROT = TOTAL / 2;

/**
 * Faz a conta por aritmética de faixas em vez de materializar as 63.404
 * posições: a tabela inteira seria megabytes carregados a cada import só para
 * girar meia dúzia de caracteres.
 */
function indexToCodePoint(i: number): number {
  for (let r = RANGES.length - 1; r >= 0; r--) {
    if (i >= STARTS[r]) return RANGES[r][0] + (i - STARTS[r]);
  }
  return RANGES[0][0] + i;
}

/** Gira um code point; o que está fora das faixas passa intacto. */
function rotateCodePoint(cp: number): number {
  for (let r = 0; r < RANGES.length; r++) {
    const [a, b] = RANGES[r];
    if (cp < a) return cp; // caiu num buraco entre faixas
    if (cp <= b) return indexToCodePoint((STARTS[r] + (cp - a) + ROT) % TOTAL);
  }
  return cp; // acima do BMP (emoji, por exemplo)
}

/** Aplica o ROT8000. Serve para cifrar e decifrar — é a mesma operação. */
export function rot8000(input: string): string {
  let out = "";
  for (const ch of input) {
    const cp = ch.codePointAt(0);
    out += cp === undefined ? ch : String.fromCodePoint(rotateCodePoint(cp));
  }
  return out;
}

/** Latim legível: ASCII imprimível + acentuados (Latin-1 e Latin Extended-A). */
function isLatinish(cp: number): boolean {
  return (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0x17f);
}

/** Um caractere que a cifra de fato mexe (fora das faixas não conta pra nada). */
function isRotatable(cp: number): boolean {
  for (const [a, b] of RANGES) {
    if (cp < a) return false;
    if (cp <= b) return true;
  }
  return false;
}

const NOTA =
  "rotação de metade do BMP (63.404 posições, deslocamento 31.702) — aplicar de novo devolve o original. Copiar e colar entre apps pode normalizar ou perder caracteres: prefira colar o texto cru.";

export const decoders = mapDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  decode(input, ctx) {
    const saida = rot8000(input);
    // No modo "uma cifra só" o usuário já escolheu: mostra a rotação nos dois
    // sentidos, inclusive cifrar português em ideograma.
    if (ctx.only === ID) {
      return { output: saida, notes: NOTA };
    }

    // ---- portão anti-ruído -------------------------------------------------
    // A cifra é auto-inversa, então o MESMO código cifra e decifra. Sem portão
    // ela entupiria todo decode de texto latino com ideogramas. O critério é o
    // resultado, não a entrada: só entra no fan-out quando girar produz latim.
    let giraveis = 0;
    let entradaExotica = 0;
    for (const ch of input) {
      const cp = ch.codePointAt(0) ?? -1;
      if (!isRotatable(cp)) continue;
      giraveis++;
      if (!isLatinish(cp)) entradaExotica++;
    }
    // Um ideograma solto não é cifra, é um caractere solto.
    if (giraveis < 4) return null;
    // Pré-filtro barato: entrada majoritariamente não-latina. Poupa a varredura
    // da saída no caso comum (CEP, CPF, coordenada, data, Base64, prosa).
    if (entradaExotica / giraveis < 0.6) return null;

    let latimNaSaida = 0;
    for (const ch of saida) {
      const cp = ch.codePointAt(0) ?? -1;
      if (isRotatable(cp) && isLatinish(cp)) latimNaSaida++;
    }
    // O portão de verdade. Chinês/japonês legítimo ocupa uma faixa larga do CJK
    // e volta como glifo alto aleatório, não como latim — só o recorte estreito
    // U+7C4A–U+7CA7 (imagem do ASCII imprimível) atravessa aqui.
    if (latimNaSaida / giraveis < 0.8) return null;

    return { output: saida, notes: NOTA };
  },
  // Auto-inversa: cifrar é rodar a mesma função.
  encode: (input) => rot8000(input),
});
