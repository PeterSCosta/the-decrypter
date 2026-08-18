import { FIPE_RE } from "@/lib/fipe";
import { defineDecoder } from "../define";

/**
 * Código FIPE → o carro.
 *
 * ── A ASSINATURA ────────────────────────────────────────────────────────────
 * Seis dígitos, hífen, um dígito: `005345-7`. O CEP tem o hífen depois do
 * quinto, o processo judicial é muito mais longo, e telefone não tem essa
 * forma — o desenho é dele.
 *
 * ── POR QUE O CARD CONSULTA, E NÃO A BANCADA ────────────────────────────────
 * A FIPE é a ÚNICA consulta desta bancada que não passa pelo backend: o WAF
 * dela bloqueia IP de datacenter. O card chama do navegador, que é de onde a
 * chamada é legítima — ver o cabeçalho de `lib/fipe.ts`.
 */

export interface FipeHint {
  codigo: string;
}

export const decoders = defineDecoder({
  id: "fipe",
  name: "Código FIPE",
  category: "lookup",
  decode(input) {
    const t = input.trim();
    if (!FIPE_RE.test(t)) return [];
    return [
      {
        decoderId: "fipe",
        decoderName: "Código FIPE",
        category: "lookup" as const,
        label: t,
        output: `Pode ser um código FIPE: ${t}`,
        forcedScore: 0.7,
        render: "fipe" as const,
        data: { codigo: t } satisfies FipeHint,
      },
    ];
  },
});
