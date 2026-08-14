import { faberLetters, lookupFaberCastell } from "@/features/reference/faber-castell";
import type { CodeHit } from "@/features/reference/phone-codes";
import { defineDecoder } from "../define";

const ID = "faber-castell";
const NAME = "Faber-Castell (código da cor)";

/**
 * Código de lápis Faber-Castell → nome da cor. É consulta pura: o valor da
 * prova é o **nome**, que a equipe depois indexa (GIA-39: "015" → "Laranja
 * escuro", 11ª letra = U). Por isso a saída encadeia como uma cor por linha —
 * é o formato que "Letra por posição" consome.
 *
 * PORTÃO: só tokens de **exatamente 3 dígitos**, todos eles. Três dígitos é o
 * formato impresso no lápis; qualquer folga aqui transformaria toda lista de
 * números da bancada em cor.
 */
export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input, ctx) {
    const tokens = input
      .trim()
      .split(/[\s,;]+/)
      .filter(Boolean);
    if (tokens.length === 0 || !tokens.every((t) => /^\d{3}$/.test(t))) return [];

    const items: CodeHit[] = tokens.map((code) => {
      const color = lookupFaberCastell(code);
      return color
        ? { code, name: color.name, detail: `${faberLetters(color.name).length} letras` }
        : { code, name: "não catalogado", detail: "fora das 12 cores conferidas do gabarito" };
    });
    const misses = items.filter((i) => i.detail?.startsWith("fora")).length;

    // A degradação explícita ("não catalogado") existe para a equipe não achar
    // que digitou errado — mas ela só faz sentido quando o assunto JÁ é cor:
    // ou algum código bateu, ou a bancada está no modo uma-cifra-só, onde a
    // pessoa escolheu esta consulta e o silêncio seria a pior resposta.
    if (misses === tokens.length && ctx.only !== ID) return [];

    const names = items.map((i) => i.name);
    const notes = items.map((i) => `${i.code} → ${i.name}`).join(" · ");
    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup",
        label: misses === 0 ? undefined : `${misses} de ${tokens.length} não catalogado(s)`,
        output: names.join(" · "),
        notes:
          misses === 0
            ? notes
            : `${notes} — só as 12 cores conferidas do gabarito da GIA-39 estão na tabela; a tabela completa da Faber-Castell não tem fonte pública utilizável`,
        // Consulta determinística, mas de tabela curta: não pode passar na
        // frente de uma leitura de texto que forme palavra.
        forcedScore: misses === 0 ? 0.55 : 0.3,
        // Uma cor por linha = as FONTES de "Letra por posição". Com furo no
        // meio a indexação sairia errada, então o candidato não encadeia.
        chainValue: misses === 0 ? names.join("\n") : "",
        render: "code-list",
        data: items,
      },
    ];
  },
});
