import { cepByCode, formatCep } from "@/features/cep/types";
import { proximas } from "@/features/estacao/types";
import { detectLocations, detectWhat3Words } from "@/features/location/formats";
import { detectMapcode } from "@/features/location/mapcode";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

export interface LocationData {
  /**
   * Estações geodésicas do IBGE mais próximas — enriquecimento do card que já
   * ganhou nota por outro motivo. Não cria card novo nem portão novo: é a
   * resposta a "o que há neste ponto", que a prova costuma perguntar em
   * seguida. Calculado local, sobre 491 linhas, sem rede.
   */
  perto?: { codigo: string; municipio: string; descricao: string; km: number }[];
  lat: number | null;
  lng: number | null;
  label: string;
  detail?: string;
  format: string;
  /** CEP a resolver via API quando não há coordenada local. */
  cep?: string;
  /** Endereço what3words a resolver via API. */
  w3w?: string;
  /**
   * Mapcode a resolver no card. Fica assíncrono como o what3words, mas por
   * outro motivo: a lib pesa ~305 KB gz — mais que o bundle inteiro — e entra
   * por `import()` dinâmico, para não cobrar isso de quem nunca vai usar.
   */
  mapcode?: string;
}

function mapCandidate(data: LocationData, score: number): DecodeCandidate {
  const coord = data.lat != null && data.lng != null;
  return {
    decoderId: "location",
    decoderName: data.format,
    category: "lookup",
    label: coord ? `${data.lat?.toFixed(5)}, ${data.lng?.toFixed(5)}` : (data.cep ?? data.w3w),
    output: data.detail ? `${data.label} — ${data.detail}` : data.label,
    forcedScore: score,
    render: "map",
    data,
  };
}

/**
 * Detecta uma localização na entrada e mostra no mapa:
 *  - coordenadas em vários formatos (DD, DMS, DDM, Geohash, Plus Code, UTM,
 *    Maidenhead, Quadkey);
 *  - CEP (8 dígitos): usa a base local de SC; se não achar, o card resolve via
 *    BrasilAPI + Nominatim.
 * Só aparece quando há de fato uma localização.
 */
export const decoders = defineDecoder({
  id: "location",
  name: "Localização",
  category: "lookup",
  decode(input, ctx) {
    const out: DecodeCandidate[] = [];

    /**
     * TODAS as leituras, não só a melhor.
     *
     * Usava `detectLocation` (singular), e a leitura de baixo só chegava à tela
     * porque o decoder `local-geocode` a emitia por fora. Quando ele foi
     * absorvido — os dois liam as mesmas funções e duplicavam o card —, a
     * segunda leitura sumiu junto: `MD2005` deixou de mostrar a cauda de
     * geohash, e `g7rpj` deixou de mostrar a Islândia.
     *
     * A regra da casa é que **localização longe continua válida e não se
     * apaga**. Quem decide qual serve é quem está jogando, olhando o mapa; o
     * que a bancada deve é ordenar por evidência e mostrar as duas.
     */
    for (const loc of detectLocations(input)) {
      out.push(
        mapCandidate(
          {
            lat: loc.lat,
            lng: loc.lng,
            label: `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`,
            format: loc.format,
            // Enriquecimento, não card novo — ver `LocationData.perto`.
            perto: proximas(ctx.estacoes ?? null, loc.lat, loc.lng, 3)
              .filter((e) => e.km <= 15)
              .map((e) => ({
                codigo: e.codigo,
                municipio: e.municipio,
                descricao: e.descricao,
                km: e.km,
              })),
          },
          // A nota vem da CAMADA que resolveu, não é fixa: um Geohash frouxo
          // não pode empatar com um Plus Code completo, e muito menos ganhar
          // de um acerto pré-resolvido numa base real.
          loc.confianca,
        ),
      );
    }

    // Mapcode: só a DETECÇÃO é síncrona e barata (é a forma do código). A
    // coordenada sai no card, porque a lib é pesada e nem sempre resolve —
    // mapcode local é válido em 467 dos 543 territórios, então sem território
    // explícito a bancada assume BR-SC e diz que assumiu.
    const mc = detectMapcode(input);
    if (mc) {
      out.push(
        mapCandidate(
          { lat: null, lng: null, label: mc.full, format: "Mapcode", mapcode: mc.full },
          0.85,
        ),
      );
    }

    const w3w = detectWhat3Words(input);
    if (w3w) {
      out.push(
        mapCandidate({ lat: null, lng: null, label: `///${w3w}`, format: "what3words", w3w }, 0.85),
      );
    }

    const digits = input.replace(/\D/g, "");
    if (digits.length === 8 && ctx.ceps) {
      const row = cepByCode(ctx.ceps).get(digits)?.[0];
      if (row && row[4] != null && row[5] != null) {
        out.push(
          mapCandidate(
            {
              lat: row[4],
              lng: row[5],
              label: formatCep(digits),
              detail: `${[row[1] || row[2], ctx.ceps.municipios[row[3]]].filter(Boolean).join(" — ")} · SC`,
              format: "CEP",
            },
            0.92,
          ),
        );
      } else {
        out.push(
          mapCandidate(
            { lat: null, lng: null, label: formatCep(digits), format: "CEP", cep: digits },
            0.7,
          ),
        );
      }
    }
    return out;
  },
});
