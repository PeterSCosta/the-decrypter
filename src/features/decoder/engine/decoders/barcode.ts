import { barcodeType, toEan13 } from "@/features/codes/barcode";
import { type Gs1Special, gs1Lookup } from "@/features/reference/gs1-prefixes";
import { defineDecoder } from "../define";

export interface BarcodeHint {
  code: string;
  type: string;
  country: string | null;
  special?: Gs1Special;
}

/**
 * Código de barras: detecta EAN-13, EAN-8 ou UPC-A (com dígito verificador
 * válido), identifica o país pelo prefixo GS1 e marca faixas especiais (ISBN,
 * ISSN, uso interno). O card busca o produto na Open Food Facts.
 */
export const decoders = defineDecoder({
  id: "barcode",
  name: "Código de barras",
  category: "lookup",
  decode(input) {
    // Só números (admite espaços/pontos/hífens como separadores).
    if (!/^[\d\s.-]+$/.test(input.trim())) return [];
    const type = barcodeType(input);
    if (!type) return [];

    const code = input.replace(/\D/g, "");
    const prefix3 = Number(toEan13(code).slice(0, 3));
    const gs1 = gs1Lookup(prefix3);

    const hint: BarcodeHint = {
      code,
      type,
      country: gs1?.name ?? null,
      special: gs1?.special,
    };
    const where = gs1 ? ` · ${gs1.name}` : "";
    return [
      {
        decoderId: "barcode",
        decoderName: "Código de barras",
        category: "lookup",
        label: type,
        output: `${type} válido: ${code}${where}`,
        forcedScore: 0.85,
        render: "barcode",
        data: hint,
      },
    ];
  },
});
