import type { Poste } from "@/features/poste/types";
import type { DecodeContext } from "../types";
import { decoders } from "./poste";

const [poste] = decoders;

function ponto(over: Partial<Poste> = {}): Poste {
  return {
    id: 1,
    plaqueta: "65299",
    lat: -26.9196,
    lng: -49.0654,
    rua: "Rua XV de Novembro",
    ruaTipo: "Rua",
    ruaNome: "XV de Novembro",
    ruaId: 1,
    numero: 920,
    bairro: "Centro",
    estrutura: null,
    estruturaId: null,
    tipo: "Ponto IP",
    status: "Instalado",
    pontosLuminosos: 1,
    altura: null,
    instalacao: null,
    alteracao: null,
    cor: null,
    ...over,
  };
}

const ctx = (hits: DecodeContext["hits"]): DecodeContext =>
  ({ key: "", streets: null, ceps: null, hits }) as DecodeContext;

describe("decoder de poste", () => {
  it("não emite nada sem acerto — não chuta pela forma", () => {
    expect(poste.decode("65299", ctx({ q: "65299", poste: null }))).toEqual([]);
    expect(poste.decode("65299", ctx(null))).toEqual([]);
  });

  it("emite quando o acerto é da entrada atual", () => {
    const [c] = poste.decode("65299", ctx({ q: "65299", poste: ponto() }));
    expect(c.output).toContain("65299");
    expect(c.output).toContain("Rua XV de Novembro");
    expect(c.render).toBe("poste");
  });

  /**
   * `hits` chega por rede e pode ser de uma tecla atrás. Sem esta guarda, o card
   * de um poste apareceria embaixo de uma entrada que já não é a dele.
   */
  it("recusa acerto de uma consulta anterior", () => {
    expect(poste.decode("65300", ctx({ q: "65299", poste: ponto() }))).toEqual([]);
  });

  it("plaqueta com zero à esquerda é outro poste", () => {
    // "0338" e "338" existem os dois na base, em ruas diferentes. O decoder só
    // formata o que o servidor achou — mas o `q` precisa bater com a string
    // exata, senão o zero se perderia aqui.
    const hits = { q: "0338", poste: ponto({ plaqueta: "0338", rua: "Rua Germano Beduschi" }) };
    expect(poste.decode("338", ctx(hits))).toEqual([]);
    const [c] = poste.decode("0338", ctx(hits));
    expect(c.output).toContain("0338");
  });

  it("pontua conforme o quanto a plaqueta discrimina", () => {
    const score = (plaqueta: string) =>
      poste.decode(plaqueta, ctx({ q: plaqueta, poste: ponto({ plaqueta }) }))[0].forcedScore;
    // 5-6 dígitos são 78% da base; 2 dígitos casam com quase qualquer número.
    expect(score("65299")).toBeGreaterThan(score("6529") as number);
    expect(score("6529")).toBeGreaterThan(score("65") as number);
    // E nunca acima do código de rua (0,97), que é chave de verdade.
    expect(score("65299")).toBeLessThan(0.97);
  });

  it("encadeia a coordenada, não a prosa", () => {
    const [c] = poste.decode("65299", ctx({ q: "65299", poste: ponto() }));
    expect(c.chainValue).toBe("-26.9196, -49.0654");
  });
});
