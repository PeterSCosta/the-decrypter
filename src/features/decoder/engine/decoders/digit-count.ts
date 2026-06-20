import { docFormatsForLength } from "@/features/reference/digit-table";
import { mapDecoder } from "../define";

/**
 * "Quantidade de dígitos" (tabela do gabarito da Equipe Arromba): dado um número
 * puro, diz quais documentos/códigos brasileiros têm aquele tamanho. Não valida
 * — só sugere o que o número PODE ser; um CPF/CNPJ válido aparece com score
 * maior pelo decoder `documento`. Só dispara para um único token só de dígitos.
 */
export const decoders = mapDecoder({
  id: "digit-count",
  name: "Quantidade de dígitos",
  category: "lookup",
  decode(input) {
    const t = input.trim();
    if (!/^\d{1,16}$/.test(t)) return null;
    const hits = docFormatsForLength(t.length);
    if (hits.length === 0) return null;
    return {
      output: `${t.length} dígitos`,
      label: `${t.length} dígitos`,
      notes: `Pode ser: ${hits.map((h) => h.name).join(" · ")}`,
      forcedScore: 0.45,
    };
  },
});
