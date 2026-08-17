import { apiFetch } from "./api";

/**
 * Identificar a música de um TRECHO de áudio.
 *
 * ── A ÚNICA COISA DESTA BANCADA QUE SAI DO NAVEGADOR ────────────────────────
 * Toda a análise da aba Arquivo é local, e a tela diz isso. Este módulo é a
 * exceção, e por isso não roda sozinho: nada é enviado sem um clique explícito,
 * e o que sobe é o recorte que a pessoa escolheu — nunca o arquivo inteiro,
 * nunca automaticamente.
 *
 * Manda áudio cru em vez de fingerprint porque quem recorta é o navegador, e o
 * recorte é o que resolve os dois casos reais: várias faixas em sequência, e
 * uma música em CADA canal ao mesmo tempo (a mistura para mono não casa com
 * nenhuma das duas).
 */

export interface MusicaIdentificada {
  titulo: string;
  artista: string;
  album: string | null;
  lancamento: string | null;
  /** Onde, dentro da faixa original, este trecho começa. */
  timecode: string | null;
  url: string | null;
}

export type ResultadoMusica =
  | { reconhecido: true; configurado: true; musica: MusicaIdentificada }
  /**
   * `configurado: false` é uma resposta DIFERENTE de "não reconheci", e leva a
   * uma ação oposta: não adianta recortar outro trecho se ninguém pôs a chave
   * no servidor. Sem essa distinção, a pessoa tentaria dez vezes à toa.
   */
  | { reconhecido: false; configurado?: boolean; message?: string };

/** O texto do consentimento — vive aqui para a tela e o teste dizerem o mesmo. */
export const AVISO_DE_ENVIO =
  "Este é o único recurso da bancada que envia dado para fora. O trecho recortado " +
  "sobe para um serviço de reconhecimento de música; o resto da análise continua " +
  "acontecendo só no seu navegador.";

export async function identificarMusica(trecho: Blob, nome: string): Promise<ResultadoMusica> {
  const form = new FormData();
  form.append("arquivo", trecho, nome);
  // Sem `Content-Type` no cabeçalho de propósito: o navegador precisa escrever
  // o boundary do multipart, e defini-lo à mão quebra o upload em silêncio.
  return apiFetch<ResultadoMusica>("/musica/identificar", { method: "POST", body: form });
}
