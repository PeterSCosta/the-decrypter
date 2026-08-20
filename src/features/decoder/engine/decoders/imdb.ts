import { type Filme, tituloPrincipal } from "@/features/filme/types";
import { defineDecoder } from "../define";

/**
 * ID da IMDb → ficha do filme, pelo Wikidata.
 *
 * ── A ASSINATURA É FORTE, E A CONFIRMAÇÃO AINDA É OBRIGATÓRIA ──────────────
 * `tt` seguido de 7 ou 8 dígitos é forma fechada: medida contra o acervo de
 * provas, a rejeição é de 100,000% — nenhum token de lá tem esse desenho. Mesmo
 * assim o decoder **não emite pela forma**: emite quando a consulta confirma.
 * A forma diz o que perguntar; quem responde é a fonte.
 *
 * ── O SILÊNCIO TEM DE DIZER QUAL SILÊNCIO É ────────────────────────────────
 * Três estados diferentes, e confundi-los é o defeito:
 *
 *   achou            → card com a ficha
 *   perguntou e não  → "não consegui confirmar este ID", NUNCA "não existe"
 *   não perguntou    → a faixa de dicas já avisa que a consulta está fora
 *
 * O segundo caso é o comum: o Wikidata cobre uma fração do catálogo da IMDb.
 * Dizer "esse filme não existe" a partir daí seria afirmar a partir de uma
 * ausência — e ausência de evidência não é evidência de ausência.
 *
 * ── E O TÍTULO ─────────────────────────────────────────────────────────────
 * Ver `features/filme/types.ts`: o card mostra o título brasileiro quando a
 * fonte tem, e quando não tem **diz que não tem**, em vez de oferecer o
 * original ou o de Portugal como se fossem.
 */

const ID = "imdb";
const NAME = "Filme (IMDb)";

/** `tt` e 7 ou 8 dígitos — a mesma forma que o servidor confere em `ImdbId`. */
export const PARECE_IMDB = /^tt\d{7,8}$/i;

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input, ctx) {
    const t = input.trim();
    if (!PARECE_IMDB.test(t)) return [];
    // A resposta precisa ser DESTA entrada: um acerto de duas teclas atrás
    // apareceria como se fosse deste texto.
    if (ctx.hits?.q !== t) return [];

    const f = ctx.hits.filme as Filme | null | undefined;
    if (!f) {
      // Perguntamos e a fonte não conhece. Isso é informação — e é diferente de
      // "o filme não existe". O card sai com nota baixa: ele não resolveu nada,
      // só evita que a pessoa fique achando que a bancada ignorou o ID.
      return [
        {
          decoderId: ID,
          decoderName: NAME,
          category: "lookup" as const,
          label: `${t.toLowerCase()} · não confirmado`,
          output: `${t.toLowerCase()} — tem forma de ID da IMDb, mas o Wikidata não conhece este ID. Isso não quer dizer que o filme não exista: a fonte cobre só parte do catálogo.`,
          forcedScore: 0.36,
          chainValue: "",
        },
      ];
    }

    const titulo = tituloPrincipal(f);
    const partes = [
      titulo.texto,
      f.ano ? `(${f.ano})` : "",
      f.duracaoMin ? `· ${f.duracaoMin} min` : "",
      f.direcao?.length ? `· dir. ${f.direcao.join(", ")}` : "",
    ].filter(Boolean);

    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup" as const,
        label: `${titulo.texto}${f.ano ? ` (${f.ano})` : ""}`,
        output: partes.join(" "),
        // Acerto confirmado numa fonte externa, com assinatura de forma fechada.
        forcedScore: 0.88,
        render: "filme" as const,
        // Encadeia o TÍTULO, que é o que vira entrada de outra cifra (anagrama,
        // acróstico, contagem de letras). O QID do Wikidata **jamais** encadeia:
        // medido em 2.000 QIDs sorteados, 61,0% deles são lidos como coordenada
        // pela própria bancada — `Q220741` devolve três leituras de Geohash no
        // litoral de SC antes de qualquer outra coisa.
        chainValue: titulo.texto,
        data: f,
      },
    ];
  },
});
