import { defineDecoder } from "../define";
import type { LocationData } from "./location";

/**
 * Inscrição imobiliária de Blumenau → o lote no mapa.
 *
 * ── POR QUE ESTE NÚMERO INTERESSA A UMA PROVA ───────────────────────────────
 * É a mesma família do VM da planta de valores, que a GIA-20 e a GIA-34 usaram:
 * um número burocrático, estável e público, que identifica um pedaço específico
 * da cidade. A diferença é que o VM está zerado na publicação e este não — os
 * 84.539 lotes vieram inteiros do geoportal.
 *
 * ── A NOTA SEGUE A GRAFIA, COMO SEMPRE ──────────────────────────────────────
 * `4.1.24.20.2.0` pontuado é assinatura: seis grupos com aquele desenho não são
 * outra coisa. Já os 15 dígitos crus são só um número longo — mas longo o
 * bastante para não colidir com o que a bancada lê (CEP tem 8, IBGE tem 7,
 * telefone tem 11), e a pré-resolução fecha o resto: se não existe lote com
 * aquele número, não sai card.
 */
export const decoders = defineDecoder({
  id: "lote-blumenau",
  name: "Inscrição imobiliária (Blumenau)",
  category: "lookup",
  decode(input, ctx) {
    const texto = input.trim();
    if (ctx.hits?.q !== texto || !ctx.hits.lote) return [];

    const l = ctx.hits.lote;
    if (l.lat == null || l.lng == null) return [];

    const endereco = [l.logradouro, l.numero && l.numero !== "00" ? l.numero : null]
      .filter(Boolean)
      .join(", ");
    const detalhe = [l.bairro, l.areaM2 ? `${l.areaM2.toLocaleString("pt-BR")} m²` : null]
      .filter(Boolean)
      .join(" · ");

    const pontuado = /[.\-/ ]/.test(texto);
    const data: LocationData = {
      lat: l.lat,
      lng: l.lng,
      label: endereco || `Lote ${l.inscricao ?? l.iq}`,
      // O centroide não é a porta, e quem for até lá precisa saber disso.
      detail: `${detalhe} — ponto no centro do lote, não na entrada`,
      format: "Inscrição imobiliária (Blumenau)",
    };

    return [
      {
        decoderId: "lote-blumenau",
        decoderName: "Inscrição imobiliária (Blumenau)",
        category: "lookup" as const,
        label: l.iq ?? l.inscricao ?? "",
        output: `${endereco} — ${detalhe}`,
        forcedScore: pontuado ? 0.92 : 0.8,
        render: "map" as const,
        // Encadeia a coordenada: é ela que vira entrada de outra camada.
        chainValue: `${l.lat}, ${l.lng}`,
        data,
      },
    ];
  },
});
