import { ApiError } from "@/lib/api";
import type { LookupHits } from "@/lib/lookup-cache";
import { describe, expect, it } from "vitest";
import { CONCORRENCIA, TETO_JANELA, executarLote } from "./executar";
import type { EstadoItem } from "./tipos";

const termos = (n: number) => Array.from({ length: n }, (_, i) => `t${i}`);

/** Roda e devolve o desfecho FINAL de cada termo. */
async function rodar(opts: {
  n: number;
  responder: (q: string, chamada: number) => Promise<LookupHits>;
  abortarApos?: number;
  permissoes?: () => number;
}) {
  const finais = new Map<string, EstadoItem>();
  const ctrl = new AbortController();
  let chamadas = 0;
  const pausas: { razao: string }[] = [];

  const desfecho = await executarLote({
    termos: termos(opts.n),
    sinal: ctrl.signal,
    porTermo: (t, e) => finais.set(t, e),
    aoPausar: (_, razao) => pausas.push({ razao }),
    permissoesFn: opts.permissoes ?? (() => 0),
    esperarFn: () => Promise.resolve(),
    consultarFn: (q) => {
      chamadas++;
      if (opts.abortarApos !== undefined && chamadas > opts.abortarApos) ctrl.abort();
      return opts.responder(q, chamadas);
    },
  });
  return { finais, desfecho, chamadas, pausas };
}

/** Uma resposta COM acerto — senão o desfecho certo é `sem-acerto`, não `resolvido`. */
const ok = (q: string): Promise<LookupHits> =>
  Promise.resolve({
    q,
    consultou: ["CepExato"],
    cep: {
      code: q,
      logradouro: "Rua X",
      bairro: null,
      localidade: "Blumenau",
      uf: "SC",
      lat: null,
      lng: null,
    },
  } as unknown as LookupHits);

describe("a rodada em condições normais", () => {
  it("todo termo termina com um desfecho — nenhum fica sem rótulo", async () => {
    const { finais, desfecho } = await rodar({ n: 7, responder: ok });
    expect(desfecho).toBe("completo");
    expect(finais.size).toBe(7);
    for (const [t, e] of finais) expect(["fila", "consultando"], t).not.toContain(e.tipo);
  });

  it("nunca despacha mais que a concorrência", async () => {
    let emVoo = 0;
    let pico = 0;
    await rodar({
      n: 20,
      responder: async (q) => {
        emVoo++;
        pico = Math.max(pico, emVoo);
        await Promise.resolve();
        emVoo--;
        return { q, consultou: [] } as LookupHits;
      },
    });
    expect(pico).toBeLessThanOrEqual(CONCORRENCIA);
  });
});

/**
 * OS TRÊS JEITOS DE UMA RODADA MORRER, e a regra de todos: o que sobrou vira
 * "não perguntei", com a razão dita. Jamais "não achei" — essa é a mentira que
 * transforma uma parada em sessenta respostas erradas.
 */
describe("como a rodada morre", () => {
  it("429 para tudo, marca o resto e NÃO re-tenta", async () => {
    const { finais, desfecho, chamadas, pausas } = await rodar({
      n: 12,
      responder: () => Promise.reject(new ApiError(429, "muitas requisições")),
    });
    expect(desfecho).toBe("429");
    // Uma por trabalhador, no máximo: ninguém insiste.
    expect(chamadas).toBeLessThanOrEqual(CONCORRENCIA);
    expect(pausas.some((p) => p.razao === "429")).toBe(true);
    for (const [, e] of finais) {
      expect(e.tipo).toBe("nao-perguntado");
      expect(e).toMatchObject({ razao: "429" });
    }
  });

  it("401 para no primeiro e o resto diz que a sessão caiu", async () => {
    const { finais, desfecho, chamadas } = await rodar({
      n: 10,
      responder: () => Promise.reject(new ApiError(401, "Sessão expirada.")),
    });
    expect(desfecho).toBe("sessao");
    expect(chamadas).toBeLessThanOrEqual(CONCORRENCIA);
    expect([...finais.values()].every((e) => e.tipo === "nao-perguntado")).toBe(true);
    expect(finais.get("t9")).toMatchObject({ razao: "sessao" });
  });

  it("parar no meio preserva o que resolveu e nomeia o resto", async () => {
    const { finais, desfecho } = await rodar({ n: 15, responder: ok, abortarApos: 3 });
    expect(desfecho).toBe("parado");
    const resolvidos = [...finais.values()].filter((e) => e.tipo === "resolvido");
    const nao = [...finais.values()].filter((e) => e.tipo === "nao-perguntado");
    expect(resolvidos.length).toBeGreaterThan(0);
    expect(nao.length).toBeGreaterThan(0);
    expect(resolvidos.length + nao.length).toBe(15);
    // A REGRA: nada vira "não achei" por causa de uma parada.
    expect([...finais.values()].some((e) => e.tipo === "sem-acerto")).toBe(false);
  });
});

/**
 * O ABORTO ALHEIO é diferente do nosso: vale uma retentativa (e agora ela
 * funciona, porque o cancelamento limpa o cache na mesma volta). Na segunda vez
 * vira `interrompido`, com botão manual — insistir sozinho vira laço.
 */
describe("aborto alheio", () => {
  const abortErro = () => {
    const e = new Error("abortado");
    e.name = "AbortError";
    return e;
  };

  it("re-tenta uma vez e resolve", async () => {
    const vistos = new Map<string, number>();
    const { finais, chamadas } = await rodar({
      n: 1,
      responder: (q) => {
        const n = (vistos.get(q) ?? 0) + 1;
        vistos.set(q, n);
        return n === 1 ? Promise.reject(abortErro()) : ok(q);
      },
    });
    expect(chamadas).toBe(2);
    expect(finais.get("t0")?.tipo).toBe("resolvido");
  });

  it("na segunda vez desiste e oferece o botão", async () => {
    const { finais, chamadas } = await rodar({
      n: 1,
      responder: () => Promise.reject(abortErro()),
    });
    expect(chamadas).toBe(2);
    expect(finais.get("t0")).toEqual({ tipo: "interrompido" });
  });
});

/**
 * O ORÇAMENTO. Espalhar no tempo não reduz o custo de UM lote; o que estoura o
 * balde é o segundo lote no mesmo minuto. Por isso teto, e não intervalo.
 */
describe("orçamento de requisições", () => {
  it("com o balde cheio, pausa em vez de despachar", async () => {
    let saldo = TETO_JANELA;
    const { pausas, chamadas, desfecho } = await rodar({
      n: 3,
      responder: ok,
      // O balde só abre depois de algumas voltas de espera.
      permissoes: () => {
        saldo -= 10;
        return saldo > 0 ? TETO_JANELA : 0;
      },
    });
    expect(pausas.some((p) => p.razao === "orcamento")).toBe(true);
    expect(chamadas).toBe(3);
    expect(desfecho).toBe("completo");
  });

  it("com o balde vazio, não pausa nenhuma vez", async () => {
    const { pausas } = await rodar({ n: 5, responder: ok });
    expect(pausas).toHaveLength(0);
  });
});

describe("falha comum de rede", () => {
  it("não derruba a rodada e a mensagem do servidor chega à linha", async () => {
    const { finais, desfecho } = await rodar({
      n: 3,
      responder: (q) =>
        q === "t1" ? Promise.reject(new ApiError(500, "erro no servidor")) : ok(q),
    });
    expect(desfecho).toBe("completo");
    expect(finais.get("t1")).toEqual({ tipo: "falhou", mensagem: "erro no servidor" });
    expect(finais.get("t0")?.tipo).toBe("resolvido");
  });
});
