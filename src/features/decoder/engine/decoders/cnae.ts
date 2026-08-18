import { defineDecoder } from "../define";

/**
 * CNAE — o código da atividade econômica.
 *
 * ── POR QUE ELE ENTRA, SE O REPO JÁ TINHA DITO QUE NÃO ──────────────────────
 * A objeção antiga era peso: embarcar a tabela inteira custava centenas de KB
 * para uma prova hipotética. Ela caiu quando o caminho virou CONSULTA — a API
 * do IBGE, no mesmo host que já serve os municípios, sem chave.
 *
 * E o precedente pesa: "código burocrático + consulta pública" é a mecânica
 * mais usada do acervo, a que o dicionário chama de identidade intelectual do
 * evento. O CNAE é exatamente isso.
 *
 * ── A ASSINATURA MORA NA PONTUAÇÃO ──────────────────────────────────────────
 * `62.01-5/01` é inconfundível: dois dígitos, ponto, dois dígitos, hífen, um
 * dígito, barra, dois dígitos. Nenhum outro código brasileiro tem essa forma.
 * Já `6201501` nu é só um número de 7 dígitos — a mesma forma do IMO, de um
 * telefone sem DDD e de meia dúzia de outras coisas. Por isso a nota segue a
 * grafia, e a forma nua entra baixa, contando com a pré-resolução do card:
 * se o IBGE não conhece o código, o card diz isso e o candidato morre na tela.
 */

export interface CnaeHint {
  /** Sete dígitos, sem pontuação — é assim que a API recebe. */
  codigo: string;
  formatado: string;
  /** Veio pontuado (assinatura forte) ou nu (só número). */
  pontuado: boolean;
}

/** `6201501` → `62.01-5/01`, que é como o código aparece impresso. */
export function formatarCnae(sete: string): string {
  return sete.length === 7
    ? `${sete.slice(0, 2)}.${sete.slice(2, 4)}-${sete[4]}/${sete.slice(5)}`
    : sete;
}

/** A forma pontuada canônica: `12.34-5/67`. */
const PONTUADO = /^\d{2}\.\d{2}-\d\/\d{2}$/;

export const decoders = defineDecoder({
  id: "cnae",
  name: "CNAE",
  category: "lookup",
  decode(input) {
    const t = input.trim();
    const pontuado = PONTUADO.test(t);
    const digitos = t.replace(/\D/g, "");

    // Nada de aceitar pontuação pela metade: `62.01501` ou `6201-501` não são
    // grafias que existam, e aceitá-las só abriria porta para ruído.
    if (digitos.length !== 7) return [];
    if (!pontuado && !/^\d{7}$/.test(t)) return [];

    return [
      {
        decoderId: "cnae",
        decoderName: "CNAE",
        category: "lookup" as const,
        label: formatarCnae(digitos),
        output: `Pode ser um CNAE: ${formatarCnae(digitos)}`,
        // A pontuação é a assinatura; o número nu depende do IBGE confirmar.
        forcedScore: pontuado ? 0.88 : 0.3,
        render: "cnae" as const,
        data: { codigo: digitos, formatado: formatarCnae(digitos), pontuado } satisfies CnaeHint,
      },
    ];
  },
});
