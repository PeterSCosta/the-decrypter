/** Espelha os DTOs da API (`AuthDtos.cs`). camelCase vem do serializador. */

export type PapelUsuario = "admin" | "user";
export type SituacaoUsuario = "pendente" | "aprovado" | "bloqueado";

export interface Usuario {
  id: string;
  email: string;
  nome: string | null;
  papel: PapelUsuario;
  situacao: SituacaoUsuario;
  criadoEm: string;
  aprovadoEm: string | null;
}

export interface Sessao {
  token: string;
  expira: string;
  usuario: Usuario;
}

export const SITUACAO_LABEL: Record<SituacaoUsuario, string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Liberado",
  bloqueado: "Bloqueado",
};

export const PAPEL_LABEL: Record<PapelUsuario, string> = {
  admin: "Administrador",
  user: "Usuário",
};
