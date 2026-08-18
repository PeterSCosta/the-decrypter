import { decodeCar } from "@/features/location/car";
import { defineDecoder } from "../define";

/**
 * CAR — Cadastro Ambiental Rural.
 *
 * A melhor assinatura de todo o levantamento de geocódigos: UF válida + sete
 * dígitos com dígito verificador do IBGE + exatos 32 hexadecimais. Nada mais no
 * mundo tem essa forma, e nenhuma base é necessária para afirmar de que
 * município o imóvel é.
 *
 * O que ele NÃO dá é a coordenada: o polígono vive no SICAR, cuja consulta
 * pública passa por captcha — e captcha, pela regra da casa, encerra o assunto.
 * Meia resposta certa vale mais que uma inteira inventada.
 */

export interface CarHint {
  uf: string;
  ibge: string;
  imovel: string;
  municipio?: string;
}

export const decoders = defineDecoder({
  id: "car",
  name: "CAR (imóvel rural)",
  category: "lookup",
  decode(input, ctx) {
    const car = decodeCar(input);
    if (!car) return [];

    // O nome do município sai da base que a bancada já consulta, quando ela
    // está carregada; sem ela, o card mostra o código, que já é resposta.
    const municipio =
      ctx.hits?.municipio && String(ctx.hits.municipio.codigoIbge) === car.ibge
        ? ctx.hits.municipio.nome
        : undefined;

    return [
      {
        decoderId: "car",
        decoderName: "CAR (imóvel rural)",
        category: "lookup" as const,
        label: `${car.uf} · ${car.ibge}`,
        output: municipio
          ? `Imóvel rural em ${municipio}/${car.uf} — CAR ${car.imovel}`
          : `Imóvel rural no município IBGE ${car.ibge}/${car.uf} — CAR ${car.imovel}`,
        forcedScore: 0.93,
        render: "car" as const,
        // Encadeia o código do município: é ele que vira entrada do decoder do
        // IBGE, que devolve o nome e a UF.
        chainValue: car.ibge,
        data: { ...car, municipio } satisfies CarHint,
      },
    ];
  },
});
