/**
 * Votações de Blumenau — a base que responde "quantos votos" → "quem".
 *
 * A cobertura é o dado mais importante daqui, e por isso vem no próprio
 * arquivo: só 2024. Os anos anteriores existem, mas só nos ZIPs nacionais do
 * TSE, que é outro trabalho — e "não achei" NÃO pode ser lido como "não
 * existe" numa prova que atravessa sete eleições.
 */

/** `[votos, nome, cargo, ano, número na urna]` */
export type LinhaVotacao = [number, string, string, number, string];

export interface VotacoesData {
  source: string;
  generatedAt: string;
  cobertura: string;
  aviso: string;
  count: number;
  rows: LinhaVotacao[];
}

export interface Votacao {
  votos: number;
  nome: string;
  cargo: string;
  ano: number;
  numero: string;
}

/**
 * Todos os candidatos com AQUELA votação exata.
 *
 * Devolve lista, e não o primeiro: empate de votação é comum — nesta base, 17
 * das 171 votações distintas têm mais de um candidato. Escolher um seria
 * inventar a resposta da prova.
 */
export function porVotos(data: VotacoesData | null, votos: number): Votacao[] {
  if (!data || !Number.isFinite(votos)) return [];
  return data.rows
    .filter((r) => r[0] === votos)
    .map(([v, nome, cargo, ano, numero]) => ({ votos: v, nome, cargo, ano, numero }));
}
