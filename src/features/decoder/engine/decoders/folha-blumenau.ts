import { PARECE_FOLHA, buscarFolha } from "@/features/location/articulacao";
import { defineDecoder } from "../define";
import type { LocationData } from "./location";

/**
 * FOLHA CARTOGRÁFICA MUNICIPAL DE BLUMENAU — onde a carta nacional para.
 *
 * ── O BURACO ───────────────────────────────────────────────────────────────
 * O `location` já lê a carta topográfica brasileira e vai bem até **1:25.000**
 * (`SG-22-Z-B-VI-1-NE`), porque cada nível é uma divisão regular do anterior e
 * se calcula. Abaixo disso ele calava — e calava certo, porque o desdobramento
 * municipal foi ESCOLHIDO pela prefeitura, não deduzido. Nomes plausíveis e
 * errados seriam o pior resultado possível.
 *
 * ── A FONTE, E POR QUE ELA VALE ────────────────────────────────────────────
 * A articulação de voo de 2022 do geoportal de Blumenau: **93 folhas** em
 * 1:5.000 e **938** em 1:1.000, num ArcGIS REST aberto, sem chave e sem login.
 * O dado é público e o script `build:articulacao` o baixa.
 *
 * ── PRÉ-RESOLVIDO, COMO TODA BASE ──────────────────────────────────────────
 * O portão de forma existe só para não varrer 1.031 nomes a cada tecla. Quem
 * decide é o casamento EXATO contra a articulação publicada: fora dela, "não
 * reconheci". É esse silêncio que separa o dado da dedução.
 *
 * ── A RESSALVA QUE VIAJA COM O CARD ────────────────────────────────────────
 * A articulação é de 2022. Se a prefeitura republicar, a nossa cópia envelhece
 * **em silêncio** — por isso a data de geração aparece no cartão, e não só no
 * arquivo.
 */

const ID = "folha-blumenau";
const NAME = "Folha cartográfica (Blumenau)";

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input, ctx) {
    const t = input.trim();
    // Portão barato antes de varrer a articulação — ver o cabeçalho.
    if (!PARECE_FOLHA.test(t)) return [];

    const hit = buscarFolha(ctx.articulacao ?? null, t);
    if (!hit) return [];

    const metrosLat = Math.round(hit.size[0] * 111_320);
    const metrosLon = Math.round(hit.size[1] * 111_320 * Math.cos((hit.lat * Math.PI) / 180));

    const data: LocationData = {
      lat: hit.lat,
      lng: hit.lng,
      label: `Folha ${hit.folha}`,
      detail: `1:${hit.escala.toLocaleString("pt-BR")} · ${metrosLat} × ${metrosLon} m · articulação de voo ${hit.geradoEm}`,
      format: NAME,
    };

    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup" as const,
        label: `${hit.folha} · 1:${hit.escala.toLocaleString("pt-BR")}`,
        output: `${hit.folha} — centro em ${hit.lat.toFixed(5)}, ${hit.lng.toFixed(5)}`,
        // Acerto exato numa articulação publicada: não é palpite. Fica no mesmo
        // patamar das outras bases pré-resolvidas da casa.
        forcedScore: 0.92,
        render: "map" as const,
        chainValue: `${hit.lat}, ${hit.lng}`,
        data,
      },
    ];
  },
});
