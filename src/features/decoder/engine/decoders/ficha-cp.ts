import { type AcertoFicha, casar } from "@/features/ficha/types";
import { defineDecoder } from "../define";

/**
 * Codinome, nome civil, fobia ou alvo → a ficha daquele integrante da CP.
 *
 * ── POR QUE UMA CONSULTA, E NÃO SÓ UMA ABA ──────────────────────────────────
 * A prova cita a comissão pelo apelido. Quem lê `ZAZ` numa charada quer saber
 * quem é ZAZ **na hora**, sem trocar de tela — e o que a ficha responde não
 * está na entrada: nome civil, fobia, alvo, e a arte inteira num clique.
 *
 * ── A PORTA É EXATA, E ISSO É O ITEM CENTRAL DO DESENHO ─────────────────────
 * Os codinomes são nomes próprios curtos e comuníssimos: DIEGO, RENATA, ADRI,
 * TATI, SUZI, CARMO, GIU. Se a porta fosse por substring, TODA saída decifrada
 * que contivesse "diego" ganharia um card de ficha — o ruído exato que reprovou
 * a busca por nome no decoder de loja. Então a ENTRADA INTEIRA tem de ser o
 * termo (ver `casar()`), e a busca larga fica na Biblioteca.
 *
 * ── AS NOTAS, UMA A UMA ─────────────────────────────────────────────────────
 * `nome civil` e `ARQUIVO N` entram a **0,90**: são assinatura — ninguém digita
 * "CRISTIANO RICARDO DA CUNHA CAPORAL" nem `R325B4915` por acaso.
 * `codinome` entra a **0,80**: acerto exato numa base de 17, mas a palavra
 * também é um primeiro nome comum, e às vezes quem digitou só queria o nome.
 * `alvo` entra a **0,75** por causa do `MCACLCAS` do DIOGO — que não é palavra
 * de língua nenhuma e portanto é assinatura pura; os outros alvos são frases,
 * e frase inteira ninguém digita por acaso.
 * `fobia` entra a **0,55**, embaixo: `Claustrofobia` e `Acrofobia` são palavras
 * do dicionário, e quem as digita quase sempre quer a palavra, não a ficha —
 * ela aparece, mas não empurra a leitura certa para baixo.
 * `personagem` entra a **0,50**, o piso desta base, porque é LEITURA NOSSA da
 * foto e não está escrito na ficha. O card diz isso com todas as letras.
 *
 * O `ARQUIVO N` devolve as 17 de propósito: o número é o mesmo em todas, e essa
 * é a resposta verdadeira — é número da arte, não identificador de pessoa.
 */

/**
 * O portão da CARGA, e é o mesmo que o do decoder — de propósito.
 *
 * Alargar um e esquecer o outro faz a base nunca descer e o decoder calar sem
 * dizer por quê; já mordeu esta casa antes (ver o comentário das lojas em
 * `use-decoder.ts`). Ele é largo — qualquer punhado de palavras passa — porque
 * são 17 KB uma vez por sessão, e quem decide de verdade é o casamento exato.
 */
export const PARECE_FICHA =
  /^(?:[a-zà-ÿ][a-zà-ÿ'’.-]*)(?:[\s-]+[a-zà-ÿ'’.-]+){0,9}$|^[a-z]\d{3}[a-z]\d{4}$/i;

export interface FichaHint {
  consulta: string;
  acertos: AcertoFicha[];
}

const NOTA: Record<AcertoFicha["campo"], number> = {
  nome: 0.9,
  arquivo: 0.9,
  codinome: 0.8,
  alvo: 0.75,
  fobia: 0.55,
  personagem: 0.5,
};

export const decoders = defineDecoder({
  id: "ficha-cp",
  name: "Ficha da Comissão de Provas",
  category: "lookup",
  decode(input, ctx) {
    const t = input.trim();
    if (!t || !PARECE_FICHA.test(t)) return [];

    const acertos = casar(ctx.fichas ?? null, t);
    if (!acertos.length) return [];

    const campo = acertos[0].campo;
    const texto =
      campo === "arquivo"
        ? `${t} é o número de arquivo das ${acertos.length} fichas da CP — o mesmo em todas`
        : acertos
            .map((a) => `${a.ficha.codinome} — ${a.ficha.nomeCivil} (${a.ficha.fobia})`)
            .join(" · ");

    return [
      {
        decoderId: "ficha-cp",
        decoderName: "Ficha da Comissão de Provas",
        category: "lookup" as const,
        label: campo === "arquivo" ? `arquivo ${t}` : `ficha da CP · por ${campo}`,
        // A entrada entra no `output` porque o motor deduplica por texto
        // dobrado: sem ela, dois acertos com o mesmo resumo colapsariam num.
        output: `${t} — ${texto}`,
        forcedScore: NOTA[campo],
        render: "ficha-cp" as const,
        // Encadeia o OUTRO lado do par: quem entrou pelo codinome segue com o
        // nome civil, quem entrou pelo nome segue com o codinome. Repetir a
        // entrada é o que reprovou o decoder de assento.
        chainValue: campo === "codinome" ? acertos[0].ficha.nomeCivil : acertos[0].ficha.codinome,
        data: { consulta: t, acertos } satisfies FichaHint,
      },
    ];
  },
});
