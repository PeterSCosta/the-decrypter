import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { APELIDOS_DE_ABA } from "@/lib/rota";
import { describe, expect, it } from "vitest";
import { ORDEM, TABS } from "./app-tabs";

/**
 * OS DOIS JEITOS DE UMA ABA NASCER MORTA.
 *
 * (1) Existir na união de rotas e ficar fora da lista: o `Record<TabId, …>` já
 *     transforma isso em erro de compilação, e o teste de ordem cobre o resto.
 * (2) Estar na lista e não ter tela: o botão fica ativo, a área de conteúdo fica
 *     em branco, e **não há erro em lugar nenhum** — a renderização é uma
 *     cadeia de `{tab === "x" && …}` sem ramo padrão.
 *
 * O segundo não tem como ser pego por tipo. Como nada no repositório renderiza
 * o `App`, a rede possível é ler o próprio arquivo e exigir o ramo.
 */
describe("as abas existem inteiras", () => {
  it("a ordem cobre exatamente as abas, sem repetir nem faltar", () => {
    expect([...ORDEM].sort()).toEqual(Object.keys(TABS).sort());
    expect(new Set(ORDEM).size).toBe(ORDEM.length);
  });

  it("toda aba tem apelido de URL", () => {
    expect([...ORDEM].sort()).toEqual(Object.keys(APELIDOS_DE_ABA).sort());
  });

  it("toda aba tem rótulo e ícone", () => {
    for (const id of ORDEM) {
      expect(TABS[id].label, id).toBeTruthy();
      expect(TABS[id].icon, id).toBeTruthy();
    }
  });

  it("toda aba tem uma tela no App — senão o botão abre o vazio", () => {
    const fonte = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    const semTela = ORDEM.filter((id) => !fonte.includes(`tab === "${id}"`));
    expect(semTela, `abas sem ramo de renderização: ${semTela.join(", ")}`).toEqual([]);
  });
});
