import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

/**
 * Leet ao contrário: LETRA que parece dígito → o dígito.
 *
 * ── POR QUE UM ARQUIVO NOVO, E NÃO UM `encode` NO `leetspeak` ───────────────
 * Porque não é codificação, é DECIFRAÇÃO — e a bancada precisa emitir card sem
 * ninguém escolher a cifra na lateral. O `leetspeak` faz o caminho conhecido
 * (`l33t` → `leet`) e o portão dele exige dígito na ENTRADA, o que recusa
 * exatamente o caso desta cifra: uma palavra só de letras.
 *
 * ── A PROVA QUE PEDIU ISTO ──────────────────────────────────────────────────
 * ITC 2024, p07 "Um século de tradição". As letras em negrito espalhadas no
 * texto formam `BBEOEOAO`; lidas como dígitos viram `88303040`, que é o CEP da
 * Rua Almirante Barroso, em Itajaí. Conferido na base embarcada:
 * `["88303040","Rua Almirante Barroso","Centro",259,-26.90753,-48.6657]`.
 *
 * A bancada não resolvia: rodando `BBEOEOAO`, o topo era "Afim: FFESESOS".
 *
 * ── O MAPA É MENOR QUE O DO LEET, DE PROPÓSITO ──────────────────────────────
 * Só entram as letras cuja SEMELHANÇA é de desenho, nas duas direções:
 * B↔8, E↔3, O↔0, A↔4, S↔5, I↔1, T↔7, G↔6, Z↔2. Ficam de fora `@`, `$`, `!` e
 * `+`, que não são letra; e fica de fora `l`→`1`, porque `l` minúsculo vira `1`
 * mas `1` já é `i` no mapa de ida — admitir os dois faria a mesma entrada
 * produzir duas saídas conflitantes.
 *
 * ── A NOTA ──────────────────────────────────────────────────────────────────
 * Não há assinatura: `BOA` é uma palavra portuguesa e também `804`. O portão é
 * o COMPRIMENTO e a exigência de que TODA letra seja convertível — uma palavra
 * comum tem consoante fora do mapa (`R`, `N`, `M`) e cai fora sozinha. Ainda
 * assim é palpite, então 0,45: aparece, não lidera.
 */
const PARECIDAS: Record<string, string> = {
  a: "4",
  b: "8",
  e: "3",
  g: "6",
  i: "1",
  o: "0",
  s: "5",
  t: "7",
  z: "2",
};

/**
 * Curto demais vira ruído: com 3 letras, "boa" → "804" e qualquer sigla de três
 * caracteres acenderia. Seis é o piso do que uma prova esconde de propósito —
 * o caso real tem oito.
 */
const MIN = 6;

export const decoders = defineDecoder({
  id: "leet-reverso",
  name: "Leet ao contrário (letra → dígito)",
  category: "transform",
  decode(input) {
    const t = input.trim();
    // Só letras, sem espaço: é assim que a palavra escondida chega, e admitir
    // frase inteira encheria a tela de números sem sentido.
    if (!/^[a-z]+$/i.test(t) || t.length < MIN) return [];

    const letras = [...t.toLowerCase()];
    // TODA letra tem de ser convertível. É este portão que faz `almirante` (com
    // `l`, `m`, `r`, `n`) não acender, e `bbeoeoao` acender.
    if (!letras.every((c) => c in PARECIDAS)) return [];

    const digitos = letras.map((c) => PARECIDAS[c]).join("");
    return [
      {
        decoderId: "leet-reverso",
        decoderName: "Leet ao contrário (letra → dígito)",
        category: "transform",
        label: `${t.toUpperCase()} → ${digitos}`,
        output: digitos,
        notes:
          "Letras que se parecem com dígitos, lidas como número. Toda letra da " +
          "entrada precisou ser convertível — palavra comum tem consoante fora " +
          "do mapa e não chega aqui.",
        forcedScore: 0.45,
      } satisfies DecodeCandidate,
    ];
  },
});
