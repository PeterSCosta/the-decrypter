import { formatPhone, lookupCityDDD } from "@/features/reference/city-ddd";
import type { CodeHit } from "@/features/reference/phone-codes";
import { defineDecoder } from "../define";

const ID = "ddd-cidade";
const NAME = "Cidade → DDD";

/**
 * Cidade → DDD: a lista de cidades vira a sequência de códigos de área, que na
 * prova costuma montar um telefone (GIA-40: Blumenau, Juiz de Fora,
 * Teresópolis, Porto Alegre, Maringá → 47 3221-5144, a Ilhatur).
 *
 * O portão é a lista fechada de cidades: **todos** os tokens precisam ser
 * cidade conhecida, senão uma frase com vírgulas viraria um cartão. Por isso
 * uma cidade só marca pouco (0.45) e o telefone completo marca alto (0.85) —
 * dez dígitos que fecham em formato de telefone não acontecem por acaso.
 */
export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input) {
    const matches = lookupCityDDD(input);
    if (!matches) return [];

    const digits = matches.map((m) => m.ddd).join("");
    const phone = formatPhone(digits);
    const items: CodeHit[] = matches.map((m) => ({
      code: m.ddd,
      // A UF vai no nome de propósito: é como o usuário flagra um homônimo
      // (digitou Palmas pensando no Paraná e a bancada respondeu Tocantins).
      name: `${m.city} (${m.uf})`,
      detail: m.token === m.city ? undefined : m.token,
    }));

    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup",
        label: matches.map((m) => `${m.city} ${m.ddd}`).join(" · "),
        output: digits,
        notes: phone
          ? `${matches.length} cidades → ${phone}`
          : matches.map((m) => `${m.city} → ${m.ddd}`).join(" · "),
        forcedScore: phone ? 0.85 : matches.length > 1 ? 0.75 : 0.45,
        chainValue: digits,
        render: "code-list",
        data: items,
      },
    ];
  },
});
