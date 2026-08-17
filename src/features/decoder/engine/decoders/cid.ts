import type { Cid } from "@/lib/lookup-cache";
import { defineDecoder } from "../define";

/**
 * CID-10 → doença, capítulo e grupo. Nas duas direções: o código (`A00.0`)
 * responde a doença, e o nome da doença responde o código.
 *
 * ── POR QUE O PONTO VALE MAIS QUE O CÓDIGO ──────────────────────────────────
 * `A00` é a forma de coisa demais: célula de planilha, assento de avião,
 * vitamina, sufixo de peça. Já `A00.0` — letra, dois dígitos, ponto, um dígito —
 * praticamente só existe como CID. Por isso a nota acompanha a grafia, e não o
 * acerto: os três formatos resolvem contra a mesma tabela, mas só um deles
 * carrega o sinal.
 *
 * A forma nua de três caracteres fica ABAIXO do corte de propósito (0,35): ela
 * casa com 2.045 combinações, quase 80% do espaço letra+2 dígitos, então "achou"
 * ali não é notícia. Continua visível para quem procurar, sem empurrar as
 * hipóteses de verdade para baixo.
 */

/** Reposiciona o ponto: a API guarda `A000`, o mundo lê `A00.0`. */
export function comPonto(codigo: string): string {
  return codigo.length === 4 ? `${codigo.slice(0, 3)}.${codigo[3]}` : codigo;
}

/** O contexto que faz o código significar algo — capítulo, grupo e restrições. */
export function detalhesDoCid(c: Cid): string[] {
  const partes = [`Capítulo ${c.capitulo} — ${c.capituloDesc}`];
  if (c.grupoDesc) partes.push(c.grupoDesc);
  if (c.sexo) partes.push(c.sexo === "F" ? "só para o sexo feminino" : "só para o sexo masculino");
  if (c.classif === "+") partes.push("† etiologia (dupla classificação)");
  if (c.classif === "*") partes.push("* manifestação (dupla classificação)");
  if (c.naoObito) partes.push("não pode ser causa básica de óbito");
  return partes;
}

export const decoders = defineDecoder({
  id: "cid",
  name: "CID-10",
  category: "lookup",
  decode(input, ctx) {
    const texto = input.trim();
    if (ctx.hits?.q !== texto) return [];
    const saida = [];

    if (ctx.hits.cid) {
      const c = ctx.hits.cid;
      // A nota sai da GRAFIA digitada, não do acerto. Com ponto é assinatura de
      // CID; sem ponto e com quatro caracteres é a grafia das bases do SUS
      // (SIH/SIM), que também discrimina; a de três é forma de qualquer coisa.
      const temPonto = /[.\s-]/.test(texto);
      const nota = temPonto ? 0.88 : texto.replace(/\D/g, "").length === 3 ? 0.55 : 0.3;
      saida.push({
        decoderId: "cid",
        decoderName: "CID-10",
        category: "lookup" as const,
        label: comPonto(c.codigo),
        output: `${comPonto(c.codigo)} — ${c.descricao}`,
        forcedScore: nota,
        render: "cid" as const,
        // Encadeia a DESCRIÇÃO: é ela que vira entrada de outra cifra (um
        // anagrama, um acróstico). O código já está na tela.
        chainValue: c.descricao,
        data: c,
      });
    }

    if (ctx.hits.cids?.length) {
      const lista = ctx.hits.cids;
      saida.push({
        decoderId: "cid-nome",
        decoderName: "CID-10 pelo nome",
        category: "lookup" as const,
        label: `${lista.length} código${lista.length > 1 ? "s" : ""}`,
        output: lista.map((c) => `${comPonto(c.codigo)} — ${c.descricao}`).join(" · "),
        // Sugestão, não achado: quem digitou "dengue" queria a palavra, e o
        // código é um extra que não pode disputar o topo com a decifração.
        forcedScore: 0.32,
        render: "cid" as const,
        chainValue: comPonto(lista[0].codigo),
        data: lista,
      });
    }

    return saida;
  },
});
