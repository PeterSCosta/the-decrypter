/** Espelha `Poste.cs`. camelCase vem do serializador da API. */
export interface Poste {
  id: number;
  plaqueta: string | null;
  lat: number;
  lng: number;
  rua: string | null;
  ruaTipo: string | null;
  ruaNome: string | null;
  ruaId: number | null;
  numero: number | null;
  bairro: string | null;
  estrutura: string | null;
  estruturaId: number | null;
  tipo: string | null;
  status: string | null;
  pontosLuminosos: number | null;
  altura: number | null;
  instalacao: string | null;
  alteracao: string | null;
  cor: number | null;
  /** Só nas consultas por proximidade. */
  distanciaMetros?: number | null;
}

export function enderecoDoPoste(p: Poste): string {
  const rua = p.rua ?? p.ruaNome ?? "";
  // A origem usa 0 para "sem número", não nulo — sem esta guarda o endereço
  // sairia como "Rodovia Ingo Hering, 0".
  return p.numero && p.numero > 0 ? `${rua}, ${p.numero}` : rua;
}

/**
 * "Braço Longo (2.5 a 4m);Alto Rendimento 150W" → partes legíveis.
 * O portal junta braço, luminária e lâmpada com ponto e vírgula.
 */
export function partesDaEstrutura(estrutura: string | null): string[] {
  if (!estrutura) return [];
  return estrutura
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
