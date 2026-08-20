import type { LookupHits } from "@/lib/lookup-cache";
import { describe, expect, it } from "vitest";
import { acertosDe, estadoDeResposta, nomeDaBase, resumir } from "./resumo";
import type { EstadoItem } from "./tipos";

const vazia = (q: string, consultou?: string[]): LookupHits =>
  ({ q, ...(consultou === undefined ? {} : { consultou }) }) as LookupHits;

/**
 * OS TRÊS SILÊNCIOS. Esta é a razão de a aba existir: "perguntei e não achei",
 * "não sei procurar isto" e "não sei dizer se perguntei" são coisas diferentes,
 * e apresentar uma pela outra afirma uma busca que talvez não tenha havido.
 * Numa lista de sessenta itens o engano não erra uma linha — erra sessenta.
 */
describe("os três silêncios", () => {
  it("consultou vazio = não sei procurar isto", () => {
    expect(estadoDeResposta(vazia("...", []), "...")).toEqual({ tipo: "sem-forma" });
  });

  it("consultou com bases = perguntei nestas, nenhuma tinha", () => {
    const e = estadoDeResposta(vazia("Bacurau", ["RuaOuBairro", "CidNome"]), "Bacurau");
    expect(e.tipo).toBe("sem-acerto");
    expect(e).toMatchObject({ bases: ["rua ou bairro", "nome de doença na CID-10"] });
  });

  /**
   * A REGRA QUE NÃO PODE AFROUXAR. Campo ausente = API anterior a ele. Degradar
   * para "não achei" afirmaria uma consulta que talvez não tenha existido.
   */
  it("consultou AUSENTE nunca vira 'não achei'", () => {
    expect(estadoDeResposta(vazia("89010000"), "89010000")).toEqual({ tipo: "indeterminado" });
  });

  it("nenhum desfecho diz que a coisa não existe", () => {
    for (const h of [vazia("x", []), vazia("x", ["CepExato"]), vazia("x")]) {
      expect(JSON.stringify(estadoDeResposta(h, "x"))).not.toMatch(/não existe/i);
    }
  });
});

/**
 * FICHA DE OUTRO ITEM NA LINHA ERRADA. A promessa em voo é compartilhada pelo
 * cache; um aborto pode fazer a resposta de um termo chegar onde outro
 * esperava. É a mesma conferência que os decoders de lookup já fazem.
 */
describe("identidade da resposta", () => {
  it("resposta de outro termo não vira acerto deste", () => {
    const h = { q: "89010000", cep: { code: "89010000", logradouro: "Rua X" } } as LookupHits;
    expect(estadoDeResposta(h, "89020000")).toEqual({ tipo: "interrompido" });
  });
});

describe("acertos vindos das bases", () => {
  it("um CEP preenche os campos que a coluna copiável oferece", () => {
    const h = {
      q: "89010000",
      consultou: ["CepExato"],
      cep: {
        code: "89010000",
        logradouro: "Rua XV de Novembro",
        bairro: "Centro",
        localidade: "Blumenau",
        uf: "SC",
        lat: -26.91,
        lng: -49.06,
      },
    } as LookupHits;
    const e = estadoDeResposta(h, "89010000");
    expect(e.tipo).toBe("resolvido");
    const a = (e as Extract<EstadoItem, { tipo: "resolvido" }>).acertos[0];
    expect(a.campos.bairro).toBe("Centro");
    expect(a.campos.cidade).toBe("Blumenau");
    expect(a.campos.uf).toBe("SC");
    expect(a.campos.coordenada).toBe("-26.91, -49.06");
  });

  it("chave nula não vira acerto — zero palpite", () => {
    expect(acertosDe({ q: "x", cep: null, municipio: null, filme: null } as LookupHits)).toEqual(
      [],
    );
  });

  /**
   * O filme sem título brasileiro DIZ que o título é o original. Mostrar o
   * inglês calado, numa coluna que vai para a folha da prova, é o pior formato
   * possível para esse engano.
   */
  it("filme sem título brasileiro avisa na própria linha", () => {
    const h = {
      q: "tt7975244",
      consultou: ["Filme"],
      filme: {
        imdbId: "tt7975244",
        tituloBr: null,
        tituloOriginal: "Jumanji: The Next Level",
        ano: 2019,
      },
    } as unknown as LookupHits;
    const e = estadoDeResposta(h, "tt7975244") as Extract<EstadoItem, { tipo: "resolvido" }>;
    expect(e.acertos[0].texto).toContain("sem título brasileiro na fonte");
  });

  it("bandeira desconhecida aparece com o nome cru, e não some", () => {
    expect(nomeDaBase("BandeiraNova")).toBe("BandeiraNova");
    expect(nomeDaBase("CepExato")).toBe("CEP");
  });
});

/**
 * O CABEÇALHO DE INTEGRIDADE. Um resumo sem invariante é onde um balde some, e
 * um balde que some é meia lista entregue com cara de lista inteira.
 */
describe("resumo por desfecho", () => {
  const todos: EstadoItem[] = [
    { tipo: "resolvido", acertos: [] },
    { tipo: "resolvido", acertos: [] },
    { tipo: "sem-acerto", bases: ["CEP"] },
    { tipo: "sem-forma" },
    { tipo: "indeterminado" },
    { tipo: "recusado", motivo: "longo", tamanho: 80 },
    { tipo: "falhou", mensagem: "erro" },
    { tipo: "interrompido" },
    { tipo: "nao-perguntado", razao: "parado" },
    { tipo: "fila" },
    { tipo: "consultando" },
  ];

  it("a soma dos baldes é sempre o total", () => {
    const r = resumir(todos);
    expect(r.baldes.reduce((s, b) => s + b.quantos, 0)).toBe(r.total);
    expect(r.total).toBe(todos.length);
  });

  it("todo desfecho tem balde — nenhum item some do cabeçalho", () => {
    for (const e of todos) {
      const r = resumir([e]);
      expect(r.baldes, e.tipo).toHaveLength(1);
      expect(r.baldes[0].quantos).toBe(1);
    }
  });

  it("balde vazio não aparece", () => {
    expect(resumir([{ tipo: "resolvido", acertos: [] }]).baldes).toHaveLength(1);
  });

  it("só é completo quando não há falha, interrupção nem não-perguntado", () => {
    expect(resumir([{ tipo: "resolvido", acertos: [] }]).incompleto).toBe(false);
    expect(resumir([{ tipo: "sem-forma" }]).incompleto).toBe(false);
    expect(resumir([{ tipo: "sem-acerto", bases: [] }]).incompleto).toBe(false);
    for (const e of [
      { tipo: "falhou", mensagem: "x" },
      { tipo: "interrompido" },
      { tipo: "nao-perguntado", razao: "429" },
      { tipo: "indeterminado" },
    ] as EstadoItem[]) {
      expect(resumir([e]).incompleto, e.tipo).toBe(true);
    }
  });
});

/**
 * ACERTO SEM NADA A DIZER NÃO É ACERTO.
 *
 * A base de aeroportos traz `nome`, `cidade` e `pais` nulos em parte das
 * linhas. O acerto saía com a base e o texto vazio: a linha ficava muda
 * ("aeroporto: "), o cabeçalho contava "1 resolvido" e a coluna escrevia `?` —
 * três afirmações se contradizendo na mesma tela.
 */
describe("acerto vazio", () => {
  it("base que respondeu sem conteúdo não conta como resolvido", () => {
    const h = {
      q: "SBBI",
      consultou: ["Aeroporto"],
      aeroporto: {
        iata: "BNU",
        icao: "SBBI",
        nome: null,
        cidade: null,
        pais: null,
        lat: null,
        lng: null,
      },
    } as LookupHits;
    expect(acertosDe(h)).toEqual([]);
    expect(estadoDeResposta(h, "SBBI")).toEqual({ tipo: "sem-acerto", bases: ["aeroporto"] });
  });

  it("nenhum acerto emitido pode ter texto vazio", () => {
    const h = {
      q: "x",
      consultou: ["CepExato"],
      cep: {
        code: "",
        logradouro: null,
        bairro: null,
        localidade: null,
        uf: null,
        lat: null,
        lng: null,
      },
      municipio: { codigoIbge: 4202404, nome: "Blumenau", uf: "SC" },
    } as unknown as LookupHits;
    for (const a of acertosDe(h)) expect(a.texto.trim().length, a.base).toBeGreaterThan(0);
  });
});
