/** Compact row tuple: [cep, logradouro, localidade, municipioIdx, lat, lng] */
export type CepRow = [
  cep: string,
  logradouro: string,
  localidade: string,
  municipioIdx: number,
  lat: number | null,
  lng: number | null,
];

export interface CepsData {
  source: string;
  generatedAt: string;
  count: number;
  municipios: string[];
  rows: CepRow[];
}

export interface CepHit {
  cep: string;
  logradouro: string;
  localidade: string;
  municipio: string;
  lat: number | null;
  lng: number | null;
}

export function toHit(row: CepRow, municipios: string[]): CepHit {
  return {
    cep: row[0],
    logradouro: row[1],
    localidade: row[2],
    municipio: municipios[row[3]] ?? "",
    lat: row[4],
    lng: row[5],
  };
}

/** "88010000" → "88010-000" */
export function formatCep(cep: string): string {
  return cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
}
