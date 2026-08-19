export interface StreetRow {
  codigo: number;
  tipo: string; // R, Pça, Av, …
  nome: string;
  bairroNum: number | null;
  bairro: string;
  numLei: number | null;
  dataLei: string | null; // dd/mm/aaaa
  localizacao: string;
  ext: number | null; // metros
  larg: number | null; // metros
  atas: string;
  /** Centroide do logradouro (join local com a base de CEPs de Blumenau). */
  lat?: number;
  lng?: number;
  /**
   * De onde veio a coordenada, quando NÃO veio do join por nome com o CEP:
   * `eixos:codigo+bairro` ou `eixos:codigo` (ver `scripts/enrich-streets-eixos.ts`).
   * Ausente = a rua casou por nome com a base de CEP, o caminho original.
   */
  fonteGeo?: string;
  /**
   * Nome da via no cadastro do geoportal, gravado só quando difere DE VERDADE
   * do nome do Rol — "ANNA CATHARINA LENZ" contra o "LEZ" que o PDF truncou.
   * O nome do Rol continua sendo o `nome`: aqui ninguém sobrescreve ninguém.
   */
  nomeEixos?: string;
}

export interface StreetsData {
  source: string;
  generatedAt: string;
  count: number;
  rows: StreetRow[];
}

/** "R" → "Rua", "Pça" → "Praça", … (display only). */
export const TIPO_LABELS: Record<string, string> = {
  R: "Rua",
  Pça: "Praça",
  Av: "Avenida",
  Tv: "Travessa",
  Rod: "Rodovia",
  Estr: "Estrada",
  Al: "Alameda",
  Parque: "Parque",
  Servidão: "Servidão",
};

export function nomeCompleto(row: StreetRow): string {
  return `${row.tipo} ${row.nome}`.trim();
}
