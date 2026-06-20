/** [código IBGE de 7 dígitos, nome do município, sigla da UF] */
export type MunicipioRow = [code: string, nome: string, uf: string];

export interface MunicipiosData {
  source: string;
  generatedAt: string;
  count: number;
  rows: MunicipioRow[];
}
