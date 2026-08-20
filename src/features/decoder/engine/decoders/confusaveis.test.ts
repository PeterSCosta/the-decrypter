import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runDecoders } from "../run";
import { setWordSet } from "../score";
import type { DecodeContext } from "../types";
import { decoders, pareceHomoglifo } from "./confusaveis";

const d = Array.isArray(decoders) ? decoders[0] : decoders;
const ctx = { key: "", streets: null, ceps: null } as unknown as DecodeContext;

/** `a рorta рreta`, com dois `р` cirílicos escondidos. */
const DISFARCADO = "a рorta рreta";

describe("o decoder de homóglifos", () => {
  it("acha a letra escondida e devolve as duas leituras", () => {
    const r = d.decode(DISFARCADO, ctx);
    expect(r).toHaveLength(2);
    expect(r[0].output).toBe("a porta preta");
    // Posições 1-based, prontas para entrar no `letter-index`.
    expect(r[1].output).toBe("3 9");
  });

  /**
   * OS NEGATIVOS DUROS. Texto legítimo em grego ou cirílico, e notação
   * científica — os casos em que a letra de outra escrita está ali de direito.
   * Se algum destes acender, o portão afrouxou.
   */
  it.each([
    "Ελληνικά",
    "Привет мир",
    "Москва 2026",
    "ΑΘΗΝΑ",
    "το κείμενο",
    "площадь",
    "π = 3,14159",
    "1000 Ω ±5%",
    "20 m² e 30 µg",
    "β-caroteno",
    "α-tocoferol",
    "Δt = 5 s",
    "raio-γ",
    "partícula α",
    "íon Ca²⁺",
    "ΣΟΜΑ",
    "modo ΤΕΜ",
    "a porta preta",
  ])("cala em %s", (texto) => {
    expect(d.decode(texto, ctx)).toEqual([]);
    expect(pareceHomoglifo(texto)).toBe(false);
  });

  it("o inverso existe e volta", () => {
    const cifrado = d.encode?.("a porta preta") ?? "";
    expect(cifrado).not.toBe("a porta preta");
    expect(d.decode(cifrado, ctx)[0]?.output).toBe("a porta preta");
  });

  it("é determinístico", () => {
    expect(d.decode(DISFARCADO, ctx)).toEqual(d.decode(DISFARCADO, ctx));
  });

  /**
   * Sem vocabulário conferido, o card não promove: a assinatura aqui é o
   * caractere, e ela é forte, mas não é a palavra.
   */
  it("sem vocabulário, a nota fica no patamar da assinatura", () => {
    setWordSet(null);
    expect(d.decode(DISFARCADO, ctx)[0].forcedScore).toBe(0.55);
  });
});

/**
 * O CONSERTO QUE VALE MAIS QUE O DECODER.
 *
 * Antes disto, `a рorta рreta` devolvia no TOPO do leque, a 0,62, o card do
 * `alfabeto`: `"a rorta rreta"` — porque ele translitera por SOM, e por som o
 * `р` cirílico é mesmo `r`. Mas quem esconde uma letra numa prova esconde um
 * DESENHO. Resposta errada com confiança, e já estava em produção.
 */
describe("a leitura fonética e a visual convivem", () => {
  const fold = (w: string) => w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const carregarVocabulario = () => {
    const set = new Set(readFileSync("public/data/words-pt.txt", "utf8").split("\n").map(fold));
    setWordSet({ has: (w: string) => set.has(w) } as never);
  };
  const leque = (t: string) =>
    (
      runDecoders(t, ctx) as unknown as {
        results: { decoderId: string; score: number; output: string }[];
      }
    ).results;

  it("com a letra escondida, a leitura VISUAL fica no topo", () => {
    carregarVocabulario();
    const r = leque(DISFARCADO);
    expect(r[0].decoderId).toBe("confusaveis");
    expect(r[0].output).toBe("a porta preta");
    // E a fonética some de vista em vez de disputar: desce abaixo do corte.
    expect(r.filter((c) => c.decoderId === "alfabeto" && c.score >= 0.35)).toHaveLength(0);
    setWordSet(null);
  });

  /**
   * A REGRESSÃO INVERSA, que importa tanto quanto: `Привет мир` é cirílico de
   * verdade, a transliteração por SOM é a resposta certa, e tem de continuar
   * saindo.
   */
  it("com texto de verdade em outra escrita, a leitura FONÉTICA fica de pé", () => {
    const r = leque("Привет мир");
    const fonetica = r.find((c) => c.decoderId === "alfabeto");
    expect(fonetica?.output).toBe("Privet mir");
    expect(fonetica?.score).toBeGreaterThanOrEqual(0.6);
    expect(r.some((c) => c.decoderId === "confusaveis")).toBe(false);
  });
});
