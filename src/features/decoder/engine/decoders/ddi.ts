import { lookupDDI } from "@/features/reference/phone-codes";
import { defineDecoder } from "../define";

/**
 * DDI: interpreta número(s) como código(s) de país. Ex.: "55 56" → Brasil,
 * Chile. Só dispara quando todos os tokens são códigos de país conhecidos.
 */
export const decoders = defineDecoder({
  id: "ddi",
  name: "DDI (código de país)",
  category: "lookup",
  decode(input) {
    const hits = lookupDDI(input);
    if (!hits) return [];
    return [
      {
        decoderId: "ddi",
        decoderName: "DDI (código de país)",
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
