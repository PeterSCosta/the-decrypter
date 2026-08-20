import { defineDecoder } from "../define";

/**
 * ISOPSEFIA (grego) e GEMATRIA (hebraico) — a letra como NÚMERO.
 *
 * ── O NÚMERO QUE A BANCADA DAVA ERRADO ─────────────────────────────────────
 * O decoder `alfabeto` já reconhece grego e hebraico por faixa Unicode e diz a
 * **posição ordinal** da letra. Para uma prova de isopsefia isso é o número
 * errado: ρ é a 17ª letra do alfabeto grego e vale **100**; σ é a 18ª e vale
 * **200**. Os dois sistemas não são ordinais — são unidades, dezenas e centenas,
 * com três letras arcaicas ocupando o 6, o 90 e o 900 justamente para fechar a
 * conta.
 *
 * ── O PORTÃO JÁ ESTAVA PAGO ────────────────────────────────────────────────
 * Quem decidiu que a entrada é grego ou hebraico foi o bloco Unicode, e um CEP,
 * um CPF ou prosa em português nunca têm um caractere fora do latim. Este
 * decoder não acrescenta risco de falso positivo ao fan-out — ele só acende onde
 * o `alfabeto` já acendia, dizendo a outra metade da verdade.
 */

/**
 * Isopsefia grega. As três letras arcaicas — digama/stigma (6), koppa (90) e
 * sampi (900) — saíram do alfabeto corrente mas continuam no sistema numérico,
 * e sem elas a conta pula de 5 para 7.
 */
const GREGO: Record<string, number> = {
  α: 1,
  β: 2,
  γ: 3,
  δ: 4,
  ε: 5,
  ϛ: 6,
  ϝ: 6,
  ζ: 7,
  η: 8,
  θ: 9,
  ι: 10,
  κ: 20,
  λ: 30,
  μ: 40,
  ν: 50,
  ξ: 60,
  ο: 70,
  π: 80,
  ϟ: 90,
  ϙ: 90,
  ρ: 100,
  σ: 200,
  ς: 200,
  τ: 300,
  υ: 400,
  φ: 500,
  χ: 600,
  ψ: 700,
  ω: 800,
  ϡ: 900,
};

/**
 * Gematria hebraica, no método padrão (*mispar hechrachi*).
 *
 * As cinco finais (sofit) valem **o mesmo que a letra base** neste método — ך é
 * 20, como כ. Existe uma variante (*mispar gadol*) em que elas valem 500 a 900,
 * e ela é uma escolha de quem monta a prova, não um fato: por isso o card mostra
 * as duas contas quando há final no texto, em vez de escolher uma.
 */
const HEBRAICO: Record<string, number> = {
  א: 1,
  ב: 2,
  ג: 3,
  ד: 4,
  ה: 5,
  ו: 6,
  ז: 7,
  ח: 8,
  ט: 9,
  י: 10,
  כ: 20,
  ך: 20,
  ל: 30,
  מ: 40,
  ם: 40,
  נ: 50,
  ן: 50,
  ס: 60,
  ע: 70,
  פ: 80,
  ף: 80,
  צ: 90,
  ץ: 90,
  ק: 100,
  ר: 200,
  ש: 300,
  ת: 400,
};

/** *Mispar gadol*: as finais valem 500..900 em vez do valor da letra base. */
const HEBRAICO_FINAIS_GRANDES: Record<string, number> = {
  ך: 500,
  ם: 600,
  ן: 700,
  ף: 800,
  ץ: 900,
};

const ID = "numerais-antigos";
const NAME = "Isopsefia / gematria (grego e hebraico)";

/** Piso: uma letra sozinha é a tabela, não uma leitura. */
const MIN_LETRAS = 2;

function soma(texto: string, tabela: Record<string, number>): { valores: number[]; total: number } {
  const valores: number[] = [];
  for (const c of texto.toLowerCase()) {
    const v = tabela[c];
    if (v !== undefined) valores.push(v);
  }
  return { valores, total: valores.reduce((a, b) => a + b, 0) };
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  decode(input) {
    const t = input.trim();
    if (!t) return [];

    const grego = soma(t, GREGO);
    const hebraico = soma(t, HEBRAICO);
    const out = [];

    if (grego.valores.length >= MIN_LETRAS) {
      out.push({
        decoderId: ID,
        decoderName: NAME,
        category: "transform" as const,
        label: "isopsefia grega",
        output: `${grego.valores.join(" + ")} = ${grego.total}`,
        // Alto porque o portão é o bloco Unicode — quem chega aqui é grego de
        // verdade, e a conta é determinada. Abaixo de acerto em base real.
        forcedScore: 0.8,
        chainValue: String(grego.total),
      });
    }

    if (hebraico.valores.length >= MIN_LETRAS) {
      /**
       * Com final (sofit) no texto há DUAS contas legítimas, e escolher uma
       * seria decidir pela prova — ver o comentário de
       * `HEBRAICO_FINAIS_GRANDES`. Sem final no texto as duas coincidem, e o
       * card mostra uma só.
       */
      const temFinal = [...t].some((c) => HEBRAICO_FINAIS_GRANDES[c] !== undefined);
      const totalGadol = temFinal
        ? [...t.toLowerCase()].reduce(
            (a, c) => a + (HEBRAICO_FINAIS_GRANDES[c] ?? HEBRAICO[c] ?? 0),
            0,
          )
        : null;

      out.push({
        decoderId: ID,
        decoderName: NAME,
        category: "transform" as const,
        label: "gematria hebraica",
        output:
          totalGadol !== null && totalGadol !== hebraico.total
            ? `${hebraico.valores.join(" + ")} = ${hebraico.total} (padrão) · ${totalGadol} (mispar gadol, finais 500-900)`
            : `${hebraico.valores.join(" + ")} = ${hebraico.total}`,
        forcedScore: 0.8,
        chainValue: String(hebraico.total),
      });
    }

    return out;
  },
});
