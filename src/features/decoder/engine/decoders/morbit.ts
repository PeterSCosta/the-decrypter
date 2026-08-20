import { defineDecoder } from "../define";
import { encodeMorseX } from "../morse-x";
import { PARES_MORBIT, resolverMorbit } from "../pollux-morbit";
import { coverage, wordsProntas } from "../score";

/**
 * Morbit — Morse em dígitos, dois símbolos por dígito. **Só no modo "uma cifra
 * só"**, e a razão está medida abaixo.
 *
 * Cada dígito 1–9 vale um PAR de símbolos morse, numa bijeção: 9! = 362.880
 * chaves possíveis.
 *
 * ── POR QUE ELE NÃO ENTRA NO LEQUE ───────────────────────────────────────
 * Duas razões, e cada uma sozinha bastaria.
 *
 * **O custo.** Medido: 49 a 66 ms por entrada, contra um piso de fan-out de 0,4
 * a 1,0 ms em texto numérico — 50× a 160×. E o leque roda a cada tecla enquanto
 * a pessoa digita, não uma vez.
 *
 * **A colisão.** O portão natural do Morbit é "dígitos sem zero", e isso é
 * povoado demais: sobre corpora reais, ele deixa passar 622 de 3.000 CEPs,
 * 1.317 de 2.000 ids de poste, 664 de 1.000 plaquetas, 175 de 400 telefones e
 * **554 de 600 listas de A1Z26 coladas** — que é a cifra nº 1 do acervo. E o
 * piso que zera os falsos positivos é 36 dígitos, o equivalente a umas 16
 * letras de resposta: 44% das cifras Morbit de verdade nem chegariam ao solver.
 *
 * Ou seja: no leque ele seria caro E errado, ou caro E mudo. No modo "uma cifra
 * só" ele é exatamente o que se quer — a pessoa já disse que é Morbit, e a
 * lista ranqueada por vocabulário é a resposta.
 *
 * ── UM ERRO DE DOCUMENTO QUE MORRE AQUI ──────────────────────────────────
 * Três documentos deste repositório afirmam que o Morbit tem **comprimento
 * par**. É falso, e mensurável: só 1.016 de 2.000 cifras reais têm (50,8%). A
 * paridade é do MORSE, não da cifra — o último dígito completa o par com um
 * separador. Um portão de paridade calaria em metade dos Morbit de verdade, e
 * calar não deixa rastro.
 */

const ID = "morbit";
const NAME = "Morbit (Morse em dígitos, aos pares)";

/** Ver o cabeçalho: 49 a 66 ms medidos. Uma cifra real de 86 dígitos fecha aqui. */
const ORCAMENTO = 400_000;
const MIN_COBERTURA = 0.35;

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "classical",
  decode(input, ctx) {
    // O PORTÃO INTEIRO. Fora do modo "uma cifra só", este decoder não existe —
    // ver as duas razões medidas no cabeçalho.
    if (ctx.only !== ID) return [];

    const t = input.trim();
    if (!/^[1-9]+$/.test(t) || t.length < 8) return [];
    if (!wordsProntas()) return [];

    const nota = (texto: string) => {
      const c = coverage(texto);
      return c.analisado > 0 ? c.covered / c.analisado : 0;
    };
    const { res, estourou } = resolverMorbit(t, ORCAMENTO, nota);

    return (
      res
        // Sem o corte de "maior pedaço" que o Pollux usa no leque: aqui o modo
        // "uma cifra só" é o único caminho, a pessoa já escolheu, e um filtro a
        // mais só esconderia leitura boa — foi o que ele quase fez no Pollux, ao
        // preferir `ANIMAISXII` a `A PONTE DE FERRO`.
        .filter((s) => nota(s.texto) >= MIN_COBERTURA)
        .slice(0, 5)
        .map((s) => ({
          decoderId: ID,
          decoderName: NAME,
          category: "classical" as const,
          label: `mapa ${Object.entries(s.mapa)
            .map(([d, v]) => `${d}=${v}`)
            .join(" ")}`,
          notes: estourou
            ? "busca cortada no teto de trabalho — pode haver leitura melhor"
            : undefined,
          output: s.texto,
          chainValue: s.texto,
        }))
    );
  },
  encode(input) {
    const mx = encodeMorseX(input);
    // O último par se completa com separador — é daí que vem a crença de que a
    // cifra tem comprimento par. Ela não tem; o MORSE é que se completa.
    const s = mx.length % 2 ? `${mx}x` : mx;
    const out: string[] = [];
    for (let i = 0; i < s.length; i += 2) {
      const idx = PARES_MORBIT.indexOf(s.slice(i, i + 2) as (typeof PARES_MORBIT)[number]);
      out.push(String(idx + 1));
    }
    return out.join("");
  },
});
