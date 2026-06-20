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
