import { defineDecoder } from "../define";

/**
 * Código de município do IBGE → nome + UF. Aceita o código de 7 dígitos
 * (ex.: 4205407 → Florianópolis, SC) ou o de 6 dígitos (sem o dígito
 * verificador). Lê a base de municípios do contexto (carregada sob demanda).
 */
export const decoders = defineDecoder({
  id: "ibge-municipio",
  name: "Município (IBGE)",
  category: "lookup",
  decode(input, ctx) {
    const code = input.trim();
    if (!ctx.municipios || !/^\d{6,7}$/.test(code)) return [];

    const row =
      code.length === 7
        ? ctx.municipios.rows.find((r) => r[0] === code)
        : ctx.municipios.rows.find((r) => r[0].slice(0, 6) === code);
    if (!row) return [];

    return [
      {
        decoderId: "ibge-municipio",
        decoderName: "Município (IBGE)",
        category: "lookup",
        label: `código ${code}`,
        output: `${row[1]} — ${row[2]} (IBGE ${row[0]})`,
        forcedScore: 0.95,
      },
    ];
  },
});
