import { describe, expect, it } from "vitest";
import { setWordSet } from "../score";
import type { DecodeContext } from "../types";
import { decoders as ciclico } from "./a1z26-ciclico";

/**
 * O teto que a revisão adversária exigiu.
 *
 * A primeira versão do decoder tinha piso e nenhum teto, e apostava que sem
 * palavra a leitura ficaria na gaveta. Medido em 20 listas numéricas
 * realistas, SETE cruzaram o corte de 0,35 com saída sem sentido — e o
 * decoder acende em 98,5% das listas de 4 a 7 números até 78, ou seja em
 * quase toda lista de números que alguém cola numa prova.
 *
 * A regra passou a ser: só cruza o corte com PALAVRA REAL confirmada. Este
 * teste carrega uma lista de palavras de mentira para poder cobrar isso —
 * sem ela, `realWords` devolve vazio para tudo e o critério não existe.
 */
const rodar = (entrada: string) =>
  ciclico.decode(entrada, { key: "", streets: null } as unknown as DecodeContext);

describe("o cíclico só sobe com palavra real", () => {
  it("com a lista carregada, lixo pronunciável fica no piso", () => {
    setWordSet(new Set(["hello", "casa", "porta"]));
    try {
      // Medidos na revisão: os sete que cruzavam o corte sem querer dizer nada.
      const lixo = ["34 31 38 41", "12 34 45 67 78", "12 08 26 14 30", "04 17 29 33 41 52"];
      for (const e of lixo) {
        const c = rodar(e);
        expect(c.length, `${e} devia acender`).toBeGreaterThan(0);
        expect(c[0].forcedScore, `${e} → "${c[0].output}" passou do corte`).toBeLessThan(0.35);
      }

      // E o que É palavra continua subindo — o teto não pode calar o acerto.
      const bom = rodar("34 31 38 38 41");
      expect(bom[0].output).toBe("hello");
      expect(bom[0].forcedScore as number).toBeGreaterThan(0.5);
    } finally {
      setWordSet(null);
    }
  });

  it("sem a lista, o critério é o score — não se pune por dado que não chegou", () => {
    // É o mesmo erro do `wordsReady` que não re-ranqueava, e que esta bancada
    // já corrigiu uma vez: quem ainda não pode conferir não pode condenar.
    setWordSet(null);
    const c = rodar("34 31 38 38 41");
    expect(c[0].forcedScore as number).toBeGreaterThan(0.5);
  });
});
