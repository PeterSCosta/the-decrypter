import { defineDecoder } from "../define";

export interface RegistroBrHint {
  domain: string;
}

// Domínio .br (1+ rótulos, terminando em ".br"): ex. uol.com.br, blumenau.sc.gov.br
const DOMAIN_BR = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+br$/i;

/**
 * Domínio .br → consulta no Registro.br (via BrasilAPI). O card busca o status
 * (registrado/disponível) e a data de expiração ao detectar um domínio válido.
 */
export const decoders = defineDecoder({
  id: "registrobr",
  name: "Domínio .br (Registro.br)",
  category: "lookup",
  decode(input) {
    const domain = input.trim().toLowerCase();
    if (!DOMAIN_BR.test(domain)) return [];
    return [
      {
        decoderId: "registrobr",
        decoderName: "Domínio .br (Registro.br)",
        category: "lookup",
        label: domain,
        output: domain,
        forcedScore: 0.85,
        render: "registrobr",
        data: { domain } satisfies RegistroBrHint,
      },
    ];
  },
});
