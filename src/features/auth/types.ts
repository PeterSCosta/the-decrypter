/** Espelha os DTOs da API (`AuthDtos.cs`). camelCase vem do serializador. */

export type PapelUsuario = "admin" | "user";
export type SituacaoUsuario = "pendente" | "aprovado" | "bloqueado";

export interface Usuario {
  id: string;
  /** O identificador de quem se cadastrou depois do apelido. */
  apelido: string | null;
  /**
   * Nulo em conta nova sem e-mail, e nulo é o caso REAL — não a exceção.
   * Toda tela que mostra identidade precisa passar por `rotuloDe`.
   */
  email: string | null;
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

/**
 * Como esta conta se chama numa tela.
 *
 * Existe porque interpolar `u.email` cru virou frase sem sujeito no dia em que o
 * e-mail ficou opcional: "Remover ? A conta some e a pessoa perde o acesso" —
 * com o admin confirmando uma exclusão definitiva sem saber de quem.
 */
export function rotuloDe(u: Usuario): string {
  return u.apelido ?? u.email ?? `conta ${u.id.slice(0, 8)}`;
}
