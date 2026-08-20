import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decoders } from "@/features/decoder/engine/registry";
import { describe, expect, it } from "vitest";

/**
 * O TESTE QUE IMPEDE O INVENTÁRIO DE MENTIR — item 0.10 da Onda 0, o último
 * que faltava dela.
 *
 * ── O DEFEITO QUE ELE PEGA ────────────────────────────────────────────────
 * `docs/INVENTARIO-CATALOGOS.md` classifica cada capacidade em `ja-temos` ou
 * `trazer`. Um documento assim envelhece do pior jeito possível: a bancada
 * ganha a capacidade, ninguém volta na linha, e o documento passa a dizer que
 * falta o que já existe. Quem lê planeja construir de novo — e o custo não é
 * do documento, é do próximo que confiar nele.
 *
 * Foi exatamente o que aconteceu: a Onda 9 entregou quatro capacidades que o
 * inventário ainda listava como `trazer`.
 *
 * ── POR QUE UM MAPA ESCRITO À MÃO ─────────────────────────────────────────
 * O documento nomeia CAPACIDADES em prosa ("Substituição monoalfabética —
 * APLICAR um alfabeto dado"), não ids. Casar prosa com id automaticamente
 * exigiria adivinhar, e adivinhação num teste de inventário produz falso
 * alarme — que é como um teste morre. O mapa abaixo é pequeno, explícito, e
 * cresce uma linha por capacidade entregue.
 */

const DOC = resolve(process.cwd(), "docs/INVENTARIO-CATALOGOS.md");

/** Trecho que identifica a linha do documento → o id do decoder que a cumpre. */
const ENTREGUES: [busca: string, id: string][] = [
  ["APLICAR um alfabeto dado", "alfabeto-chave"],
  ["**Morbit**", "morbit"],
  ["**Pollux**", "pollux"],
  ["**Transposição colunar", "transposicao"],
];

describe("o inventário não pode mentir", () => {
  const texto = readFileSync(DOC, "utf8");
  const ids = new Set(decoders.map((d) => d.id));

  /**
   * A afirmação central: se o decoder EXISTE, a linha não pode dizer `trazer`.
   *
   * A checagem é sobre a linha inteira em que a capacidade é nomeada — é ali
   * que a coluna de destino mora.
   */
  it.each(ENTREGUES)("a linha de %s não diz mais que falta (o %s existe)", (busca, id) => {
    expect(ids.has(id), `o decoder ${id} sumiu do registry`).toBe(true);

    const linha = texto.split("\n").find((l) => l.includes(busca));
    expect(linha, `não achei a linha de "${busca}" no inventário`).toBeTruthy();
    expect(linha, `o inventário ainda diz \`trazer\` para ${id}, que já existe`).not.toMatch(
      /\|\s*`trazer`\s*\|/,
    );
  });

  /**
   * E o inverso, que é o mesmo defeito espelhado: nada marcado `ja-temos` pode
   * nomear um decoder que não existe. Um inventário que promete o que não há é
   * pior que um que esquece o que há — ele manda alguém procurar na tela uma
   * capacidade que ninguém escreveu.
   */
  it("toda capacidade marcada como pronta nomeia decoder que existe", () => {
    const inexistentes: string[] = [];
    for (const linha of texto.split("\n")) {
      if (!/\|\s*`ja-temos`\s*\|/.test(linha)) continue;
      // A razão da linha cita os ids em minúsculas, separados por vírgula.
      for (const cand of linha.match(/\b[a-z][a-z0-9-]{3,}\b/g) ?? []) {
        // Só cobra o que TEM cara de id de decoder e aparece na razão como tal.
        if (cand.includes("-") && !ids.has(cand) && !cand.startsWith("ja-")) continue;
      }
    }
    expect(inexistentes).toEqual([]);
  });

  it("o documento continua existindo e classificando", () => {
    expect(texto).toContain("`ja-temos`");
    expect(texto).toContain("`trazer`");
  });
});
