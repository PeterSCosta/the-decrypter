import { defineDecoder } from "../define";

/**
 * Código de município do IBGE → nome + UF. Aceita o de 7 dígitos
 * (ex.: 4205407 → Florianópolis, SC) ou o de 6 (sem o dígito verificador).
 *
 * A resposta vem pré-resolvida em `ctx.hits` — antes o app baixava os 5.571
 * municípios em toda sessão e fazia um `find` linear a cada tecla, para
 * responder uma consulta por chave exata.
 */
export const decoders = defineDecoder({
  id: "ibge-municipio",
  name: "Município (IBGE)",
  category: "lookup",
  decode(input, ctx) {
    const code = input.trim();
    if (ctx.hits?.q !== code || !ctx.hits.municipio) return [];
    const m = ctx.hits.municipio;
    return [
      {
        decoderId: "ibge-municipio",
        decoderName: "Município (IBGE)",
        category: "lookup",
        label: `código ${code}`,
        output: `${m.nome} — ${m.uf} (IBGE ${m.codigoIbge})`,
        forcedScore: 0.95,
      },
    ];
  },
});
