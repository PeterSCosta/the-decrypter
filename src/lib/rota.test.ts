import { describe, expect, it } from "vitest";
import {
  APELIDOS_DE_ABA,
  APELIDOS_DE_PAINEL,
  type RotaAba,
  escreverCaminho,
  lerCaminho,
} from "./rota";

/**
 * A URL é o que se compartilha, então ela não pode quebrar em silêncio.
 *
 * O risco número um de um mapa de apelidos escrito à mão é ele divergir da
 * lista real de abas: alguém acrescenta uma aba, esquece o apelido, e o link
 * daquela tela passa a levar para o Decodificador sem avisar ninguém. É a mesma
 * família do que aconteceu com a lista de formatos da Cola, que ficou em dez
 * enquanto a fonte chegava a 26.
 */
describe("rota", () => {
  it("ida e volta: todo apelido volta para a própria aba", () => {
    for (const aba of Object.keys(APELIDOS_DE_ABA) as RotaAba[]) {
      const caminho = escreverCaminho({ painel: "app", aba });
      expect(lerCaminho(caminho)).toEqual({ painel: "app", aba });
    }
  });

  it("ida e volta: todo painel volta para o próprio painel", () => {
    for (const painel of Object.keys(APELIDOS_DE_PAINEL) as ("help" | "admin")[]) {
      const caminho = escreverCaminho({ painel, aba: "decoder" });
      expect(lerCaminho(caminho).painel).toBe(painel);
    }
  });

  it("nenhum apelido repetido — dois caminhos iguais para telas diferentes", () => {
    const todos = [...Object.values(APELIDOS_DE_ABA), ...Object.values(APELIDOS_DE_PAINEL)];
    expect(new Set(todos).size).toBe(todos.length);
  });

  it("o Decodificador é a raiz, e só ela", () => {
    // Duas URLs para a mesma tela fariam o link depender de por onde a pessoa
    // passou — e a bancada é a tela que mais se compartilha.
    expect(escreverCaminho({ painel: "app", aba: "decoder" })).toBe("/");
    expect(lerCaminho("/")).toEqual({ painel: "app", aba: "decoder" });
  });

  it("caminho desconhecido leva à bancada, sem erro", () => {
    // Link velho, apelido digitado errado, rota renomeada. Nada disso pode dar
    // tela branca: o pior caso aceitável é cair num lugar útil.
    for (const ruim of ["/nao-existe", "/geo", "/decoder", "/admin", "/ajuda/extra"]) {
      expect(lerCaminho(ruim)).toEqual({ painel: "app", aba: "decoder" });
    }
  });

  it("tolera barra sobrando e caixa alta", () => {
    // É o que sai de um link colado à mão ou copiado de mensagem.
    expect(lerCaminho("/geolocalizacao/")).toEqual({ painel: "app", aba: "geo" });
    expect(lerCaminho("//USUARIOS//").painel).toBe("admin");
  });

  it("os apelidos são legíveis em português — a URL é mensagem, não código", () => {
    expect(APELIDOS_DE_ABA.geo).toBe("geolocalizacao");
    expect(APELIDOS_DE_ABA.reference).toBe("cola");
    expect(APELIDOS_DE_PAINEL.admin).toBe("usuarios");
    // Nenhum apelido pode vazar o id interno: `text`, `diff`, `fleet` são código.
    expect(Object.values(APELIDOS_DE_ABA)).not.toContain("text");
    expect(Object.values(APELIDOS_DE_ABA)).not.toContain("fleet");
  });

  it("atalho de cifra: ida e volta pelo id do decoder", () => {
    // O apelido É o id, e isso é decisão: são 117 decoders, e um mapa de
    // apelidos escrito à mão divergiria da lista real na primeira cifra nova.
    for (const id of ["base64", "atbash", "vigenere-crack", "a1z26-ciclico"]) {
      const caminho = escreverCaminho({ painel: "app", aba: "decoder", cifra: id });
      expect(caminho).toBe(`/cifra/${id}`);
      expect(lerCaminho(caminho)).toEqual({ painel: "app", aba: "decoder", cifra: id });
    }
  });

  it("/cifra sem id não vira atalho quebrado", () => {
    expect(lerCaminho("/cifra")).toEqual({ painel: "app", aba: "decoder" });
    expect(lerCaminho("/cifra/")).toEqual({ painel: "app", aba: "decoder" });
  });

  it("caminho de dois níveis que NÃO é cifra cai na bancada", () => {
    // `/ajuda/extra` e `/geolocalizacao/algo` são link velho ou digitado
    // errado; nenhum pode dar tela branca.
    expect(lerCaminho("/geolocalizacao/algo")).toEqual({ painel: "app", aba: "decoder" });
    expect(lerCaminho("/nada/aqui")).toEqual({ painel: "app", aba: "decoder" });
  });

  it("a cifra manda sobre a aba — o atalho é da bancada", () => {
    expect(escreverCaminho({ painel: "app", aba: "geo", cifra: "morse" })).toBe("/cifra/morse");
    // Mas painel cobre tudo: ele substitui a bancada inteira.
    expect(escreverCaminho({ painel: "admin", aba: "geo", cifra: "morse" })).toBe("/usuarios");
  });
});
