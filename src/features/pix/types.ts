/** Participante do PIX (BrasilAPI /pix/v1/participants), indexável por ISPB (8 díg.). */
export interface PixParticipant {
  ispb: string;
  nome: string;
  nomeReduzido: string;
  tipo: string;
}

export type PixData = PixParticipant[];
