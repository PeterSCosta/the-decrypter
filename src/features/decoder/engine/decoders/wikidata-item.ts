import type { ItemWikidata } from "@/features/filme/types";
import { defineDecoder } from "../define";
import { PARECE_QID } from "./imdb";
import type { LocationData } from "./location";

/**
 * Um item do Wikidata pelo código `Q…` — o que a coisa É.
 *
 * ── POR QUE UM QID PODE, E UM NOME NÃO ────────────────────────────────────
 * A avaliação da Onda 10 recusou resolver NOME → entidade, e a razão era a
 * ambiguidade medida: "Bacurau" é filme e é ave; "Maria" devolve 113
 * candidatos; sem declarar o tipo, o topo é a entidade errada em 3 de 9. Um
 * QID não tem esse problema — ele identifica **um** item e só um, por
 * construção. É acerto exato, não triagem, e é por isso que este caminho
 * existe e aquele continua fechado.
 *
 * ── E POR QUE ELE VALE MAIS QUE A CAUDA DE GEOHASH ────────────────────────
 * A bancada lê todo `Q…` como cauda de Geohash e devolve cinco pontos em
 * Blumenau — medido, 61% dos QIDs fazem isso. Aquelas cinco leituras continuam
 * na tela, e valem 0,52 porque são palpite entre cinco, todas assumindo um
 * prefixo de cidade. Um acerto exato numa base real é evidência de outra
 * natureza. O que muda é a ordem, não a presença.
 *
 * ── QUANDO O ITEM É FILME, ESTE CARD CALA ─────────────────────────────────
 * Ali quem responde é o `imdb`, que tem título, ano, duração e direção. Dois
 * cards dizendo a mesma coisa com detalhe diferente é ruído com cara de
 * confirmação.
 */

const ID = "wikidata-item";
const NAME = "Item do Wikidata";

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input, ctx) {
    const t = input.trim();
    if (!PARECE_QID.test(t)) return [];
    if (ctx.hits?.q !== t) return [];

    const i = ctx.hits.item as ItemWikidata | null | undefined;
    // Filme tem card próprio, mais rico. E QID que o Wikidata não conhece cala:
    // um `Q…` não promete existir, e a leitura de coordenada que fica na tela é
    // a resposta honesta ali.
    if (!i || i.ehFilme) return [];

    const oQueE = i.tipos?.length ? i.tipos.slice(0, 3).join(" · ") : "";
    const linha = [i.rotulo ?? i.qid, i.descricao ? `— ${i.descricao}` : ""]
      .filter(Boolean)
      .join(" ");

    // A língua do rótulo aparece quando NÃO é português: "Douglas Adams [mul]"
    // é honesto; apresentá-lo como se fosse o nome em português não é.
    const emPortugues = i.lingua === "pt-BR" || i.lingua === "pt";
    const notas = [
      oQueE,
      emPortugues ? "" : i.lingua ? `rótulo em ${i.lingua}` : "",
      i.imdbId ? `IMDb ${i.imdbId}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const temPonto = i.lat != null && i.lng != null;
    const data: LocationData | undefined = temPonto
      ? {
          lat: i.lat as number,
          lng: i.lng as number,
          label: `${i.rotulo ?? i.qid} — ${i.qid}`,
          detail: notas,
          format: NAME,
        }
      : undefined;

    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup" as const,
        label: `${i.qid} · ${oQueE || "item"}`,
        output: linha,
        notes: notas || undefined,
        // Acerto exato num identificador que aponta para um item só. Fica no
        // patamar das outras bases pré-resolvidas da casa.
        forcedScore: 0.9,
        ...(temPonto ? { render: "map" as const, data } : {}),
        /**
         * O que encadeia é o RÓTULO, ou a coordenada quando existe — nunca o
         * QID. Essa regra é medida: 61% dos QIDs sorteados são lidos como
         * coordenada pela própria bancada, então encadear um joga a volta
         * seguinte de volta na armadilha que este card acabou de desarmar.
         */
        chainValue: temPonto ? `${i.lat}, ${i.lng}` : (i.rotulo ?? ""),
      },
    ];
  },
});
