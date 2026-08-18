import { type Votacao, porVotos } from "@/features/votacao/types";
import { defineDecoder } from "../define";

/**
 * Número de votos → candidato de Blumenau.
 *
 * ── A MECÂNICA VEM DO ACERVO, NÃO DE PALPITE ────────────────────────────────
 * A GIA-34 é isto: a prova dá a votação, você acha o candidato e conta a letra
 * na posição pedida. São treze números numa cadeia só.
 *
 * ── A ASSINATURA NÃO ESTÁ NA FORMA, ESTÁ NA RARIDADE ────────────────────────
 * Um número de 4 a 6 dígitos não tem forma própria nenhuma, então este decoder
 * é 100% PRÉ-RESOLVIDO: não emite por forma, emite por ACERTO.
 *
 * E o acerto discrimina mais do que parece — vale a conta, porque a primeira
 * versão deste comentário errou nela. A base tem 171 votações DISTINTAS; um
 * número de cinco dígitos qualquer tem 171/90.000 = **0,19% de chance** de
 * bater por acaso. Isso é um filtro forte, não coincidência barata: acertar em
 * cheio a votação de um candidato de Blumenau, num universo de 90 mil números,
 * é sinal.
 *
 * A nota fica acima do corte, então, mas longe do teto — porque a base é só de
 * 2024 e o acerto pode ser de um candidato que a prova nem menciona.
 *
 * Empate é comum (17 das 171 votações da base), então mostra TODOS — escolher
 * um seria inventar a resposta.
 */

export interface VotacaoHint {
  votos: number;
  achados: Votacao[];
  cobertura: string;
}

export const decoders = defineDecoder({
  id: "votacao-blumenau",
  name: "Votação (Blumenau)",
  category: "lookup",
  decode(input, ctx) {
    const t = input.trim();
    // Só número puro: "1.490" e "1490 votos" chegam limpos por outros caminhos,
    // e aceitar texto aqui abriria porta para casar com qualquer coisa.
    if (!/^\d{1,7}$/.test(t)) return [];

    const achados = porVotos(ctx.votacoes ?? null, Number(t));
    if (!achados.length) return [];

    const quem = achados.map((a) => `${a.nome} (${a.cargo}, ${a.ano})`).join(" · ");
    return [
      {
        decoderId: "votacao-blumenau",
        decoderName: "Votação (Blumenau)",
        category: "lookup" as const,
        label: `${Number(t).toLocaleString("pt-BR")} votos`,
        output: quem,
        // Acima do corte: 0,19% de chance de bater por acaso é sinal. Mas
        // longe do teto, porque a cobertura é de um ano só.
        forcedScore: 0.55,
        render: "votacao" as const,
        // Encadeia o NOME, que é o que vira entrada do índice de letra — a
        // mecânica seguinte da própria prova.
        chainValue: achados[0].nome,
        data: {
          votos: Number(t),
          achados,
          cobertura: ctx.votacoes?.cobertura ?? "",
        } satisfies VotacaoHint,
      },
    ];
  },
});
