import { runDecoders } from "@/features/decoder/engine/run";
import type { DecodeContext } from "@/features/decoder/engine/types";
import { prepararDeteccao } from "@/features/location/formats";
import { describe, expect, it } from "vitest";
import { HELP_SECTIONS } from "./help-content";

/**
 * O guia tem de dizer a verdade.
 *
 * ── POR QUE ESTE TESTE EXISTE ───────────────────────────────────────────────
 * Uma auditoria de 18/08 rodou os 105 exemplos de decoder da Ajuda no motor e
 * achou QUATRO que mentiam — não "estavam imprecisos": mentiam.
 *
 *   Cerca      `Hloleh` → `Hello`   impossível: transposição não muda o
 *                                   comprimento, e são 6 letras contra 5
 *   Baudot     `11000 10011` → `AE` o decoder devolve `OW`
 *   Base58     `9xa^` → `bytes`     4 caracteres; nenhum dos três decoders roda
 *   Cores      lista com ` · `      o separador da SAÍDA foi copiado para a
 *                                   ENTRADA; com vírgula funciona
 *
 * Quem lê o guia digita o que está escrito, não recebe o que foi prometido, e
 * conclui que a bancada está quebrada. É o pior tipo de defeito de documento:
 * ele destrói a confiança na ferramenta inteira, não só naquele verbete.
 *
 * ── O QUE ESTE TESTE COBRE, E O QUE NÃO ─────────────────────────────────────
 * Ele NÃO varre os 137 verbetes. Muitos exemplos dependem de `ctx.hits` (a
 * resposta da API) e outros são MARCADORES, não valores — `"texto (a,b)"`,
 * `"8 parágrafos"`, `"grade 8×8 colada"`. Varrer todos daria um teste que
 * falha por motivo errado, e um teste assim é apagado na primeira pressa.
 *
 * O que ele cobre é a lista abaixo: exemplos que rodam OFFLINE e cujo decoder
 * está nomeado. Cada linha foi medida antes de entrar aqui. Ao acrescentar um
 * verbete novo que roda sem rede, acrescente a linha — é barato, e é o que
 * mantém a Ajuda honesta.
 */
const OFFLINE: { entrada: string; decoder: string; contem: string; primeiro?: boolean }[] = [
  // Os corrigidos em 18/08 — cada um estava errado no guia publicado.
  { entrada: "Hloel", decoder: "railfence", contem: "Hello" },
  { entrada: "10110 11000 01100 10000 00001", decoder: "baudot", contem: "PONTE", primeiro: true },
  { entrada: "StV1DL6CwTryKyV", decoder: "base58", contem: "hello world" },
  {
    entrada: "245-245-220, 244-196-48, 0-0-128, 0-0-255, 255-250-250, 153-102-204",
    decoder: "color-convert",
    contem: "Bege",
  },
  { entrada: "Khoor", decoder: "caesar", contem: "Hello" },

  // Os sete geocódigos que entraram em 18/08, com o exemplo publicado.
  {
    entrada: "geo:-26.9194,-49.0661;u=35",
    decoder: "location",
    contem: "-26.91940",
    primeiro: true,
  },
  { entrada: "-26.9194-049.0661/", decoder: "location", contem: "-26.91940", primeiro: true },
  {
    entrada: "https://osm.org/go/0EEQjE--",
    decoder: "location",
    contem: "51.51077",
    primeiro: true,
  },
  { entrada: "zzw-22y@5vg-7gt-qzz", decoder: "location", contem: "37.79527", primeiro: true },
  { entrada: "5204:414:340", decoder: "location", contem: "-26.90000", primeiro: true },
  {
    entrada: "SC-4202404-D9ADE9A8B4C24E5FA0F3B1C2D3E4F5A6",
    decoder: "car",
    contem: "4202404",
    primeiro: true,
  },

  // O verbete que faltava: a segunda leitura de uma entrada binária.
  { entrada: "100101010", decoder: "binary-number", contem: "dec 298", primeiro: true },
];

const rodar = (entrada: string) =>
  (
    runDecoders(entrada, { key: "", streets: null } as unknown as DecodeContext) as unknown as {
      results: { decoderId: string; output: string }[];
    }
  ).results;

describe("os exemplos do guia funcionam", () => {
  for (const caso of OFFLINE) {
    it(`"${caso.entrada.slice(0, 34)}" entrega o que a Ajuda promete`, async () => {
      // O Placekey vira H3, e o `h3-js` entra por import dinâmico — sem esta
      // linha o primeiro passe devolve null e o card não aparece. Na tela quem
      // faz isso é o `use-decoder`, que refaz a corrida quando a lib chega.
      await prepararDeteccao(caso.entrada);
      const r = rodar(caso.entrada);
      const meu = r.filter((c) => c.decoderId.includes(caso.decoder));
      expect(meu.length, `nenhum card de "${caso.decoder}"`).toBeGreaterThan(0);
      expect(meu.some((c) => c.output.includes(caso.contem))).toBe(true);
      if (caso.primeiro) expect(r[0].decoderId).toContain(caso.decoder);
    });
  }

  it("todo exemplo do guia produz ao menos um candidato", () => {
    // Rede de segurança grosseira sobre TODOS os verbetes de cifra: um exemplo
    // que não move o motor é sinal de que a entrada não é digitável.
    //
    // ATENÇÃO ao mexer: este teste já ficou CEGO uma vez. Ele lia `e.example`, e
    // a migração para `e.examples[]` deixou os verbetes de decoder de fora — o
    // teste seguiu VERDE varrendo só as abas, que nem passam pelo motor. A
    // asserção de contagem lá embaixo existe por causa disso.
    const mudos: string[] = [];
    let conferidos = 0;
    for (const sec of HELP_SECTIONS) {
      if (sec.id === "ferramentas" || sec.id === "apis") continue;
      for (const e of sec.entries) {
        for (const ex of e.examples ?? []) {
          conferidos++;
          if (rodar(ex).length === 0) mudos.push(`${e.name} ← "${ex}"`);
        }
      }
    }
    expect(
      conferidos,
      "a varredura parou de achar exemplo — o campo mudou de nome?",
    ).toBeGreaterThan(100);
    expect(mudos, `exemplos que não produzem nada:\n${mudos.join("\n")}`).toEqual([]);
  });
});
