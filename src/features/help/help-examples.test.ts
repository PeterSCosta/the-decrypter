import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
const arquivo = (nome: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), `public/data/${nome}`), "utf8"));
const ESTACOES = arquivo("estacoes-ibge.json");
const ARTICULACAO = arquivo("articulacao-blumenau.json");

const OFFLINE: { entrada: string; decoder: string; contem: string; primeiro?: boolean }[] = [
  // Sem `primeiro`: nestas duas o `leetspeak` fica acima, porque ele deixa a
  // PROSA passar intacta e só troca os dígitos — herdando a legibilidade de um
  // texto que não decodificou. Está anotado em docs/PENDENCIAS.md §0.5-C; o
  // math-helper aparece em 2º, que é onde ele de fato está.
  { entrada: "Fatore em primos: 60 84 210", decoder: "math-helper", contem: "2 × 2 × 3 × 5" },
  {
    entrada: "Os numeros sao triangulares: 3 6 10 15 21",
    decoder: "math-helper",
    contem: "triangulares",
  },
  { entrada: "1723680000", decoder: "timestamp", contem: "14/08/2024" },
  { entrada: "Ιησους", decoder: "numerais-antigos", contem: "888", primeiro: true },
  { entrada: "שלום", decoder: "numerais-antigos", contem: "376", primeiro: true },
  // Onda 6 — os quatro de assinatura literal, cada um medido antes de entrar.
  {
    entrada: "xn--brasil-gva.com.br",
    decoder: "punycode",
    contem: "brasilé.com.br",
    primeiro: true,
  },
  { entrada: "xn--80akhbyknj4f", decoder: "punycode", contem: "испытание", primeiro: true },
  {
    entrada: "A resposta esta na pra=C3=A7a",
    decoder: "quoted-printable",
    contem: "A resposta esta na praça",
    primeiro: true,
  },
  {
    entrada: "=?UTF-8?B?QSByZXNwb3N0YSBlc3TDoSBuYSBwcmHDp2E=?=",
    decoder: "mime-word",
    contem: "A resposta está na praça",
    primeiro: true,
  },
  // Onda 3 — cada um medido antes de entrar aqui.
  { entrada: "692000 7021000", decoder: "location", contem: "-26.9", primeiro: true },
  {
    entrada: "P de Pipa, O de Ouro, N de Navio, T de Tatu, E de Estrela",
    decoder: "soletracao",
    contem: "PONTE",
    primeiro: true,
  },
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
  // As duas portas da estação geodésica: código e inscrição da chapa. A
  // segunda foi acrescentada ao guia na Onda 5.2, e é justamente a que ninguém
  // adivinharia estar quebrada — ela nasceu barrada pelo portão de forma.
  { entrada: "8121288", decoder: "estacao-ibge", contem: "Blumenau" },
  { entrada: "MR-103", decoder: "estacao-ibge", contem: "chapa MR-103" },
  { entrada: "1400M", decoder: "estacao-ibge", contem: "Blumenau" },
  // A Onda 9. Cada um destes já foi escrito ERRADO uma vez neste mesmo arquivo:
  // os três primeiros exemplos que eu redigi à mão não decodificavam nada, e foi
  // este teste que mostrou. É a razão de ele existir.
  { entrada: "a рorta рreta", decoder: "confusaveis", contem: "a porta preta", primeiro: true },
  {
    entrada: "informaÃ§Ã£o importante sobre a praÃ§a central",
    decoder: "mojibake",
    contem: "informação importante sobre a praça central",
    primeiro: true,
  },
  // A inscrição que só existe na PROSA da descrição — o pedaço do 5.2 que
  // ninguém adivinharia estar quebrado, porque não vem de campo nenhum.
  { entrada: "RN2004H", decoder: "estacao-ibge", contem: "chapa RN2004H" },
  // A folha municipal, que a carta nacional não calcula.
  // A escala vive no `label`, não no `output` — quem confere a escala é o
  // `articulacao.test.ts`. Aqui o que se confere é que a folha vira PONTO.
  { entrada: "SG-22-Z-B-IV-4-SE-D-IV", decoder: "folha-blumenau", contem: "centro em -26.9" },
];

const rodar = (entrada: string) =>
  (
    runDecoders(entrada, {
      key: "",
      streets: null,
      // As bases de ARQUIVO entram: elas rodam sem rede, e sem elas o guia
      // podia prometer `MR-103` sem ninguém conferir. O que fica de fora é o
      // que depende de `ctx.hits` — aquilo é resposta de API.
      estacoes: ESTACOES,
      articulacao: ARTICULACAO,
    } as unknown as DecodeContext) as unknown as {
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
