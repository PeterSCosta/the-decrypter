/** Estações geodésicas do IBGE — a chapa de bronze cravada em ponte e calçada. */

/** `[código, índice do município, tipo, situação, descrição, lat, lng]` */
export type LinhaEstacao = [string, number, string, string, string, number, number];

export interface EstacoesData {
  source: string;
  cobertura: string;
  count: number;
  municipios: string[];
  rows: LinhaEstacao[];
}

export interface Estacao {
  codigo: string;
  municipio: string;
  tipo: string;
  situacao: string;
  descricao: string;
  lat: number;
  lng: number;
}

/** O que cada letra de tipo quer dizer no cadastro do IBGE. */
const TIPO: Record<string, string> = {
  R: "referência de nível (altitude)",
  V: "vértice (planimetria)",
  G: "estação GPS",
  M: "marégrafo",
};
export const rotuloTipo = (t: string): string => TIPO[t] ?? t;

/**
 * Busca pelo código gravado na chapa.
 *
 * Comparação em maiúsculas porque a chapa é gravada assim e ninguém digita
 * respeitando isso.
 */
export function porCodigo(data: EstacoesData | null, codigo: string): Estacao[] {
  if (!data) return [];
  const alvo = codigo.trim().toUpperCase();
  return data.rows
    .filter((r) => r[0] === alvo)
    .map(([cod, iMun, tipo, situacao, descricao, lat, lng]) => ({
      codigo: cod,
      municipio: data.municipios[iMun] ?? "",
      tipo,
      situacao,
      descricao,
      lat,
      lng,
    }));
}
