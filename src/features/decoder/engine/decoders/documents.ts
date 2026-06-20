import {
  cleanCnpj,
  formatCnpj,
  formatCpf,
  isAlphanumericCnpj,
  isValidCnpj,
  isValidCpf,
  looksLikeCnpj,
} from "@/features/documents/validate";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

export interface DocResult {
  kind: "cpf" | "cnpj";
  valid: boolean;
  formatted: string;
  raw: string;
  alfanumerico: boolean;
}

function candidate(doc: DocResult): DecodeCandidate {
  const name = doc.kind === "cpf" ? "CPF" : doc.alfanumerico ? "CNPJ alfanumérico" : "CNPJ";
  return {
    decoderId: "documento",
    decoderName: name,
    category: "lookup",
    label: doc.valid ? "válido" : "inválido",
    output: `${name} ${doc.valid ? "válido" : "inválido"}: ${doc.formatted}`,
    forcedScore: doc.valid ? 0.95 : 0.6,
    render: "documento",
    data: doc,
  };
}

/**
 * Detecta CPF (11 dígitos) e CNPJ (14 posições, numérico OU alfanumérico) na
 * entrada e diz se é válido. Auto-registrado via a pasta `decoders/`.
 */
export const decoders = defineDecoder({
  id: "documento",
  name: "Documento (CPF/CNPJ)",
  category: "lookup",
  decode(input) {
    const out: DecodeCandidate[] = [];
    const cpfClean = input.replace(/[\s.\-]/g, "");
    const cnpj = cleanCnpj(input);

    if (/^\d{11}$/.test(cpfClean)) {
      out.push(
        candidate({
          kind: "cpf",
          valid: isValidCpf(cpfClean),
          formatted: formatCpf(cpfClean),
          raw: cpfClean,
          alfanumerico: false,
        }),
      );
    }
    if (looksLikeCnpj(cnpj)) {
      out.push(
        candidate({
          kind: "cnpj",
          valid: isValidCnpj(cnpj),
          formatted: formatCnpj(cnpj),
          raw: cnpj,
          alfanumerico: isAlphanumericCnpj(cnpj),
        }),
      );
    }
    return out;
  },
});
