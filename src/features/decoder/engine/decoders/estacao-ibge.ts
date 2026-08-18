import { type Estacao, porCodigo, rotuloTipo } from "@/features/estacao/types";
import { defineDecoder } from "../define";
import type { LocationData } from "./location";

/**
 * Estação geodésica do IBGE → a chapa no mapa.
 *
 * ── POR QUE ISTO É "DE GINCANA" ─────────────────────────────────────────────
 * É a mesma forma da GIA-25: objeto físico numerado em lugar público. Só que
 * aqui a descrição do cadastro costuma ser enunciado pronto — "chapa cravada
 * na cabeceira da ponte de concreto sobre o Rio Perequê".
 *
 * ── ASSINATURA: NENHUMA, E POR ISSO É PRÉ-RESOLVIDO ─────────────────────────
 * `1400M` é dígitos e uma letra — a forma de qualquer coisa. O decoder não
 * emite por forma: emite quando o código EXISTE na base do Vale. E ainda assim
 * fica com nota moderada, porque a coincidência é possível.
 */

export const decoders = defineDecoder({
  id: "estacao-ibge",
  name: "Estação geodésica (IBGE)",
  category: "lookup",
  decode(input, ctx) {
    const t = input.trim();
    // Portão barato antes de varrer a base: até 5 caracteres, dígitos e letras.
    if (!/^\d{1,4}[A-Za-z]?$/.test(t) && !/^[A-Za-z]?\d{1,4}[A-Za-z]?$/.test(t)) return [];

    const achados = porCodigo(ctx.estacoes ?? null, t);
    if (!achados.length) return [];

    return achados.slice(0, 3).map((e: Estacao) => {
      const data: LocationData = {
        lat: e.lat,
        lng: e.lng,
        label: `Estação ${e.codigo} — ${e.municipio}`,
        detail: [rotuloTipo(e.tipo), e.situacao, e.descricao].filter(Boolean).join(" · "),
        format: "Estação geodésica (IBGE)",
      };
      return {
        decoderId: "estacao-ibge",
        decoderName: "Estação geodésica (IBGE)",
        category: "lookup" as const,
        label: `${e.codigo} · ${e.municipio}`,
        output: `${e.codigo} — ${e.municipio} · ${e.descricao || rotuloTipo(e.tipo)}`,
        forcedScore: 0.6,
        render: "map" as const,
        chainValue: `${e.lat}, ${e.lng}`,
        data,
      };
    });
  },
});
