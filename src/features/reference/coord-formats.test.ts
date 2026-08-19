import { GRUPOS_GEO } from "@/features/geo/formatos";
import { HELP_SECTIONS } from "@/features/help/help-content";
import { describe, expect, it } from "vitest";

/**
 * Uma lista só, e ela é a de `geo/formatos.ts`.
 *
 * ── O QUE ACONTECEU ─────────────────────────────────────────────────────────
 * A Cola tinha uma lista de DEZ formatos de coordenada escrita à mão, enquanto
 * `geo/formatos.ts` — que se declara "fonte única" no próprio cabeçalho —
 * chegou a 26 fichas. Quem abria a Cola sob pressão não via MGRS, GEOREF, GARS,
 * carta e grade do IBGE, Mapcode, GeoTude, Placekey, C-squares, Geo URI, ISO
 * 6709, link do OSM nem a estação geodésica: **metade do que a bancada lê**.
 *
 * Duas listas do mesmo assunto sempre divergem — a pergunta é só quando. Este
 * teste não conta quantos formatos existem (isso seria um número para atualizar
 * a cada ficha nova, e ele envelheceria igual); ele checa que a Cola DERIVA da
 * fonte, e que a fonte cobre o que a Ajuda promete.
 */
describe("a Cola não mantém lista paralela de formatos", () => {
  it("todo formato da fonte única tem exemplo digitável", () => {
    const sem = GRUPOS_GEO.flatMap((g) => g.formatos)
      .filter((f) => !f.exemplo?.entrada?.trim())
      .map((f) => f.id);
    expect(sem, `fichas sem exemplo: ${sem.join(", ")}`).toEqual([]);
  });

  it("a Ajuda não promete um número de formatos que a fonte não tem", () => {
    // O verbete da aba anunciava "18 formatos" quando já eram 26. Um número
    // escrito à mão sobre uma lista que cresce é uma mentira com data marcada.
    const total = GRUPOS_GEO.reduce((n, g) => n + g.formatos.length, 0);
    const verbete = HELP_SECTIONS.flatMap((s) => s.entries).find((e) =>
      e.name.startsWith("Geolocalização"),
    );
    expect(verbete, "sumiu o verbete da aba Geolocalização").toBeDefined();
    const numero = verbete?.desc.match(/os (\d+) formatos de coordenada/)?.[1];
    expect(
      numero,
      "a Ajuda deixou de citar o número — tudo bem, mas o teste precisa saber",
    ).toBeDefined();
    expect(Number(numero)).toBe(total);
  });
});
