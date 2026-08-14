import { parseChaveAcesso } from "@/features/reference/chave-nfe";
import { defineDecoder } from "../define";

/**
 * Chave de acesso de documento fiscal eletrônico (44 posições): fatia os nove
 * campos oficiais e confere o dígito verificador módulo 11.
 *
 * Uma nota fiscal de padaria entrega UF, mês/ano e um CNPJ completo na mesma
 * string — e o CNPJ sai por `chainValue` para cair no decoder `documento`.
 *
 * O gate tem cinco travas (formato de 44 posições, cUF do IBGE, mês 01–12,
 * modelo conhecido, DV do CNPJ e cDV da chave) porque "44 dígitos" sozinho é
 * também o código de barras do boleto bancário — ver `reference/chave-nfe.ts`.
 */
export const decoders = defineDecoder({
  id: "chave-nfe",
  name: "Chave de acesso (NF-e)",
  category: "lookup",
  decode(input) {
    const chave = parseChaveAcesso(input);
    if (!chave) return [];

    return [
      {
        decoderId: "chave-nfe",
        decoderName: `Chave de acesso (${chave.modeloSigla})`,
        category: "lookup",
        label: `${chave.ufSigla} · ${String(chave.mes).padStart(2, "0")}/${chave.ano}`,
        output: chave.resumo,
        // O CNPJ do emitente é a camada seguinte da cadeia: encadeia direto no
        // decoder `documento` (que já valida o alfanumérico de 2026).
        chainValue: chave.cnpj,
        // Cinco travas fecharem por acaso é improvável a ponto de a leitura ser
        // uma resposta, não um palpite — mesmo patamar do `documento` válido.
        forcedScore: 0.96,
        render: "code-list",
        data: chave.campos,
      },
    ];
  },
});
