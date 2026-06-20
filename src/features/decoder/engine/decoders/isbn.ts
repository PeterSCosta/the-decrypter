import { cleanIsbn, formatIsbn, isbnType } from "@/features/codes/validate";
import { defineDecoder } from "../define";

export interface IsbnHint {
  isbn: string;
  formatted: string;
  type: string;
}

export const decoders = defineDecoder({
  id: "isbn",
  name: "ISBN",
  category: "lookup",
  decode(input) {
    const type = isbnType(input);
    if (!type) return [];
    const isbn = cleanIsbn(input);
    return [
      {
        decoderId: "isbn",
        decoderName: type,
        category: "lookup",
        label: "código de livro",
        output: `${type} válido: ${formatIsbn(isbn)}`,
        forcedScore: 0.9,
        render: "isbn",
        data: { isbn, formatted: formatIsbn(isbn), type } satisfies IsbnHint,
      },
    ];
  },
});
