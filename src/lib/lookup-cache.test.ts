import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_CACHE,
  cancelarDono,
  cancelarSuperadas,
  cancelarSuperadasExceto,
  consultar,
  limparCache,
  motivoSemConsulta,
  permissoesNaJanela,
  valeConsultar,
} from "./lookup-cache";

/**
 * O PORTÃO QUE DESLIGAVA A METADE ONLINE SEM DIZER NADA.
 *
 * `valeConsultar` devolvia só `false`, e o hook limpava os hits calado. Colar
 * uma lista no campo principal apagava CEP, município, aeroporto, poste e CID
 * de uma vez — sem aviso, e indistinguível de "não encontrei". O motivo agora
 * sai junto, e o chip na tela é feito dele.
 */
describe("o motivo de não consultar", () => {
  it("uma linha normal consulta", () => {
    expect(motivoSemConsulta("89010000")).toBeNull();
    expect(motivoSemConsulta("  MR-103  ")).toBeNull();
  });

  it("lista vem antes de comprimento — quem colou 5 linhas curtas ouve 'lista'", () => {
    expect(motivoSemConsulta("89010000\n89020000")).toBe("lista");
    expect(motivoSemConsulta(["a1", "b2", "c3", "d4", "e5"].join("\n"))).toBe("lista");
  });

  it("texto longo tem motivo próprio", () => {
    expect(motivoSemConsulta("x".repeat(65))).toBe("longo");
    expect(motivoSemConsulta("x".repeat(64))).toBeNull();
  });

  it("vazio e sem alfanumérico se distinguem", () => {
    expect(motivoSemConsulta("   ")).toBe("vazio");
    expect(motivoSemConsulta("--- ...")).toBe("sem-alfanumerico");
  });

  it("as duas leituras do mesmo portão concordam sempre", () => {
    for (const s of ["", "  ", "89010000", "a\nb", "x".repeat(65), "...", "MR-103"]) {
      expect(valeConsultar(s), JSON.stringify(s)).toBe(motivoSemConsulta(s) === null);
    }
  });
});

// ── A partir daqui o módulo é exercitado de verdade, com a rede falsa ────────

const chamadas: string[] = [];
let responder: (q: string, sinal?: AbortSignal) => Promise<unknown>;

vi.mock("./api", () => ({
  apiFetch: (url: string, init?: { signal?: AbortSignal }) => {
    const q = decodeURIComponent(url.split("q=")[1] ?? "");
    chamadas.push(q);
    return responder(q, init?.signal);
  },
  ApiError: class extends Error {},
}));

/** Resolve quando o aborto chegar — é como uma requisição real morre. */
const abortavel = (_q: string, sinal?: AbortSignal) =>
  new Promise((_, rej) => {
    sinal?.addEventListener("abort", () => {
      const e = new Error("abortado");
      e.name = "AbortError";
      rej(e);
    });
  });

beforeEach(() => {
  limparCache();
  chamadas.length = 0;
  responder = (q) => Promise.resolve({ q, consultou: [] });
});
afterEach(() => {
  limparCache();
});

/**
 * A COEXISTÊNCIA BANCADA × LOTE.
 *
 * `cancelarSuperadas` nasceu para o Decodificador, onde cada tecla supera a
 * anterior. Dez itens consultados juntos são dez termos vivos ao mesmo tempo:
 * sem noção de dono, uma tecla na bancada abortaria os dez a cada 300 ms — e as
 * dez linhas apareceriam como "não encontrei".
 */
describe("posse das consultas em voo", () => {
  it("uma tecla na bancada não encosta no lote", async () => {
    responder = abortavel;
    const doLote = ["a1", "b2", "c3"].map((q) => consultar(q, "lote").catch((e: Error) => e.name));
    const daBancada = consultar("teclado", "bancada").catch((e: Error) => e.name);

    // O que a bancada faz a cada tecla: cancela tudo o que é DELA menos o atual.
    cancelarSuperadas("outra-tecla", "bancada");

    expect(await daBancada).toBe("AbortError");
    // Os três do lote continuam vivos: nada resolveu nem rejeitou.
    let terminou = false;
    void Promise.race(doLote).then(() => {
      terminou = true;
    });
    await Promise.resolve();
    expect(terminou).toBe(false);
    cancelarDono("lote");
    expect(await Promise.all(doLote)).toEqual(["AbortError", "AbortError", "AbortError"]);
  });

  it("cancelarDono('lote') não encosta na bancada", async () => {
    responder = abortavel;
    const daBancada = consultar("teclado", "bancada").catch((e: Error) => e.name);
    const doLote = consultar("item", "lote").catch((e: Error) => e.name);

    cancelarDono("lote");
    expect(await doLote).toBe("AbortError");

    let terminou = false;
    void daBancada.then(() => {
      terminou = true;
    });
    await Promise.resolve();
    expect(terminou).toBe(false);
    cancelarDono("bancada");
    expect(await daBancada).toBe("AbortError");
  });

  it("o conjunto mantém vários de uma vez", async () => {
    responder = abortavel;
    const r = ["a1", "b2", "c3"].map((q) => consultar(q, "lote").catch((e: Error) => e.name));
    cancelarSuperadasExceto(new Set(["a1", "b2"]), "lote");
    expect(await r[2]).toBe("AbortError");
    cancelarDono("lote");
    expect(await Promise.all(r)).toEqual(["AbortError", "AbortError", "AbortError"]);
  });
});

/**
 * A PROMESSA ENVENENADA. `ctrl.abort()` é síncrono, mas a limpeza do cache
 * morava no `.catch` — um microtask à frente. Nesse intervalo, pedir o mesmo
 * termo devolvia a promessa JÁ CONDENADA: "tentar de novo" não tentava nada.
 */
describe("cancelar limpa na mesma volta", () => {
  it("depois de abortar, pedir de novo vai à rede de verdade", async () => {
    responder = abortavel;
    const primeira = consultar("x1", "lote").catch((e: Error) => e.name);
    cancelarDono("lote");
    expect(chamadas).toHaveLength(1);

    // SEM await no meio: é exatamente a janela em que o defeito vivia.
    responder = (q) => Promise.resolve({ q, consultou: [] });
    const segunda = consultar("x1", "lote");

    expect(chamadas).toHaveLength(2);
    expect(await primeira).toBe("AbortError");
    expect(await segunda).toEqual({ q: "x1", consultou: [] });
  });

  it("o .catch da promessa velha não apaga a entrada da nova", async () => {
    responder = abortavel;
    const velha = consultar("y1", "lote").catch(() => "morta");
    cancelarDono("lote");
    responder = (q) => Promise.resolve({ q, consultou: [] });
    const nova = consultar("y1", "lote");
    await velha; // deixa o .catch da velha rodar
    // Se a guarda de identidade não existisse, a entrada da nova teria sumido e
    // um terceiro pedido dispararia uma requisição a mais.
    const terceira = consultar("y1", "lote");
    expect(chamadas).toHaveLength(2);
    expect(await terceira).toEqual(await nova);
  });
});

/**
 * O LIVRO-CAIXA. O backend limita 120/min por IP em janela FIXA, e a equipe
 * inteira atrás do NAT divide o balde. Espalhar no tempo não reduz o custo de
 * um lote — o que estoura é o SEGUNDO lote no mesmo minuto.
 */
describe("livro-caixa de requisições", () => {
  it("conta despacho real e ignora acerto de cache", async () => {
    expect(permissoesNaJanela()).toBe(0);
    await consultar("z1", "lote");
    await consultar("z2", "lote");
    expect(permissoesNaJanela()).toBe(2);
    await consultar("z1", "lote"); // cache
    expect(permissoesNaJanela()).toBe(2);
    expect(chamadas).toHaveLength(2);
  });

  it("esquece o que saiu da janela de 60 s", async () => {
    await consultar("w1", "lote");
    expect(permissoesNaJanela()).toBe(1);
    expect(permissoesNaJanela(Date.now() + 61_000)).toBe(0);
  });

  it("conta os dois donos no mesmo balde — o IP é um só", async () => {
    await consultar("v1", "bancada");
    await consultar("v2", "lote");
    expect(permissoesNaJanela()).toBe(2);
  });
});

/**
 * O cache é FIFO com teto: um lote grande demais expulsaria a própria cabeça,
 * e a entrada evictada não é abortada nem tirada de `emVoo`. O teto do lote
 * mantém distância de 3× dessa fronteira — se alguém mexer num dos dois números
 * sem olhar o outro, cai aqui.
 */
describe("o lote cabe no cache com folga", () => {
  it("MAX_CACHE comporta três lotes cheios", async () => {
    const { TETO_POR_LOTE } = await import("./linhas");
    expect(MAX_CACHE).toBeGreaterThanOrEqual(3 * TETO_POR_LOTE);
  });
});

/**
 * A POSSE É DE QUEM PEDIU — E MAIS DE UM PODE PEDIR O MESMO TERMO.
 *
 * O dedupe faz o segundo pedido receber a MESMA promessa. Com a posse gravada
 * só no primeiro despacho, quem chegava depois herdava o cancelamento de quem
 * chegou antes: com `89010000` em voo pelo lote, o botão "na bancada" daquela
 * linha fazia o Decodificador esperar a mesma promessa, e o "Parar" do lote
 * matava a consulta da bancada junto — sem erro, só um card que não aparece.
 */
describe("o mesmo termo pedido pelos dois donos", () => {
  it("o Parar do lote não derruba a bancada que reusou a promessa", async () => {
    responder = abortavel;
    const doLote = consultar("89010000", "lote").catch((e: Error) => e.name);
    const daBancada = consultar("89010000", "bancada").catch((e: Error) => e.name);
    expect(chamadas).toHaveLength(1); // é a mesma promessa

    cancelarDono("lote");

    // A bancada ainda quer: ninguém aborta.
    let terminou = false;
    void Promise.race([doLote, daBancada]).then(() => {
      terminou = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(terminou).toBe(false);

    // Quando o último dono desiste, aí sim.
    cancelarDono("bancada");
    expect(await daBancada).toBe("AbortError");
  });

  it("uma tecla na bancada não derruba o item do lote que reusou a promessa", async () => {
    responder = abortavel;
    const daBancada = consultar("89010000", "bancada").catch((e: Error) => e.name);
    const doLote = consultar("89010000", "lote").catch((e: Error) => e.name);

    cancelarSuperadas("outra-tecla", "bancada");

    let terminou = false;
    void Promise.race([doLote, daBancada]).then(() => {
      terminou = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(terminou).toBe(false);
    cancelarDono("lote");
    expect(await doLote).toBe("AbortError");
  });
});

describe("o livro-caixa se poda ao escrever", () => {
  /**
   * O único leitor de produção é o lote. Numa tarde inteira de Decodificador
   * sem abrir a aba Lote, um array podado só na leitura cresceria sem teto.
   */
  it("consultas velhas não se acumulam quando ninguém lê o saldo", async () => {
    for (let i = 0; i < 50; i++) await consultar(`t${i}`, "bancada");
    expect(permissoesNaJanela()).toBe(50);
    // A poda na escrita é o que impede o crescimento; a leitura só confirma.
    expect(permissoesNaJanela(Date.now() + 61_000)).toBe(0);
    await consultar("depois", "bancada");
    expect(permissoesNaJanela()).toBe(1);
  });
});
