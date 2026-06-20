import { lookupDDD } from "@/features/reference/phone-codes";
import { defineDecoder } from "../define";

/**
 * DDD: interpreta número(s) de 2 dígitos como código(s) de área do Brasil.
 * Ex.: "47 48" → norte de SC, sul de SC; "11" → Grande São Paulo. Só dispara
 * quando todos os tokens são DDDs válidos.
 */
export const decoders = defineDecoder({
  id: "ddd",
  name: "DDD (área do Brasil)",
  category: "lookup",
  decode(input) {
    const hits = lookupDDD(input);
    if (!hits) return [];
    return [
      {
        decoderId: "ddd",
        decoderName: "DDD (área do Brasil)",
        category: "lookup",
        label: hits.map((h) => h.name).join(" · "),
        output: hits.map((h) => h.name).join(" · "),
        notes: hits.map((h) => `${h.code} → ${h.name}`).join(" · "),
        forcedScore: 0.6,
        render: "code-list",
        data: hits,
      },
    ];
  },
});
