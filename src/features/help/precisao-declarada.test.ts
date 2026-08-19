import { describe, expect, it } from "vitest";
import { HELP_SECTIONS } from "./help-content";

/**
 * O número que a Ajuda cita tem de existir no código.
 *
 * ── O ERRO QUE ISTO PRENDE, E ELE FOI MEU ───────────────────────────────────
 * Escrevi na Ajuda "100% de acerto exato com 160 letras" e "97% da chave com 80
 * letras", copiando o que os agentes relataram. A revisão adversária mediu de
 * novo, com 40 textos frescos por comprimento, e achou **80% em 160** e **60%
 * em 120**; e o Vigenère é MUDO em 80 e em 100 letras, porque o piso é 150 —
 * ou seja, os dois números que publiquei eram inalcançáveis.
 *
 * É a mesma falha que a auditoria de ontem achou nos exemplos, num lugar novo:
 * o guia descrevendo o que o código faz em vez de conferir. Exemplo agora se
 * roda (`help-examples.test.ts`); NÚMERO se confere aqui.
 *
 * Este teste não sabe medir precisão — medir custa minutos. Ele checa a coisa
 * que dá para checar barato e que teria pego o erro: **o comprimento citado no
 * texto não pode ser menor que o piso do decoder**. Prometer resultado onde a
 * bancada nem responde é a forma mais grosseira de mentira, e foi a que eu
 * cometi duas vezes.
 */
const PISOS: { verbete: string; piso: number }[] = [
  { verbete: "Vigenère SEM chave (criptanálise)", piso: 150 },
  { verbete: "Substituição monoalfabética (solver)", piso: 200 },
];

describe("a Ajuda não promete resultado abaixo do piso do decoder", () => {
  for (const { verbete, piso } of PISOS) {
    it(`${verbete}: nenhum comprimento citado abaixo de ${piso}`, () => {
      const e = HELP_SECTIONS.flatMap((s) => s.entries).find((x) => x.name === verbete);
      expect(e, `sumiu o verbete "${verbete}"`).toBeDefined();

      /**
       * Um comprimento abaixo do piso PODE aparecer — e deve: explicar por que
       * o piso existe ("em 120 letras eram 12 leituras erradas em 40") é
       * justamente o texto que faz a pessoa confiar no número de cima. O que
       * não pode é aparecer como PROMESSA.
       *
       * A separação é por frase: a que cita comprimento abaixo do piso tem de
       * trazer junto a palavra que a marca como contra-exemplo. Sem isso o
       * teste não distingue "acerta em 120" de "erra em 120" — e um teste que
       * não distingue reprova texto bom ou aprova texto mentiroso.
       */
      const NEGATIVAS = /err|invent|não emite|nao emite|cala|abaixo|piso|chuta/i;
      const citados = (e?.desc ?? "").split(/(?<=[.;])\s+/).flatMap((f) =>
        [...f.matchAll(/(\d+)\s+letras/g)].map((m) => ({
          n: Number(m[1]),
          promessa: !NEGATIVAS.test(f),
        })),
      );
      expect(
        citados.length,
        "o verbete parou de citar comprimento — atualize este teste",
      ).toBeGreaterThan(0);

      const abaixo = citados.filter((c) => c.n < piso && c.promessa).map((c) => c.n);
      expect(
        abaixo,
        `o verbete promete resultado em ${abaixo.join(", ")} letras, e o decoder cala abaixo de ${piso}`,
      ).toEqual([]);
    });
  }
});
