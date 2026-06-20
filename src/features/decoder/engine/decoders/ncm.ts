import { formatNcm, looksLikeNcm } from "@/features/codes/validate";
import { defineDecoder } from "../define";

export interface NcmHint {
  code: string;
  formatted: string;
}

export const decoders = defineDecoder({
  id: "ncm",
  name: "NCM",
  category: "lookup",
  decode(input) {
    if (!looksLikeNcm(input)) return [];
    const code = input.replace(/\D/g, "");
    return [
      {
        decoderId: "ncm",
        decoderName: "NCM",
        category: "lookup",
        label: "classificação fiscal",
        output: `Pode ser um NCM: ${formatNcm(code)}`,
        forcedScore: 0.55,
        render: "ncm",
        data: { code, formatted: formatNcm(code) } satisfies NcmHint,
      },
    ];
  },
});
