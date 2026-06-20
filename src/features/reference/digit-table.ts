/**
 * Tabela "QUANTIDADE DE DÍGITOS" do gabarito da Equipe Arromba: tipos de
 * documentos/códigos brasileiros agrupados pelo número de dígitos. Fonte única
 * usada pelo decoder `digit-count` (número puro → o que pode ser) e pela aba
 * Cola (referência visual).
 */
export interface DocFormat {
  name: string;
  /** Menor quantidade de dígitos. */
  min: number;
  /** Maior quantidade de dígitos (igual a `min` quando é fixo). */
  max: number;
}

export const DOC_FORMATS: DocFormat[] = [
  { name: "Nº de rua / Nº de lei (extensão)", min: 1, max: 4 },
  { name: "DDD / código de área (DDI)", min: 2, max: 2 },
  { name: "Número do banco / lei", min: 3, max: 3 },
  { name: "Número do voo / CRM", min: 4, max: 4 },
  { name: "CRM", min: 5, max: 5 },
  { name: "RG", min: 7, max: 9 },
  { name: "CEP", min: 8, max: 8 },
  { name: "Data de nascimento (DDMMAAAA)", min: 8, max: 8 },
  { name: "Telefone fixo", min: 8, max: 8 },
  { name: "Unidade consumidora", min: 8, max: 8 },
  { name: "NCM", min: 8, max: 8 },
  { name: "Código de barras EAN-8", min: 8, max: 8 },
  { name: "Celular / WhatsApp", min: 9, max: 9 },
  { name: "Inscrição estadual", min: 9, max: 9 },
  { name: "ISBN (livros)", min: 10, max: 10 },
  { name: "CPF", min: 11, max: 11 },
  { name: "PIS / PASEP / NIS", min: 11, max: 11 },
  { name: "Título de eleitor", min: 11, max: 11 },
  { name: "CNH (carteira de motorista)", min: 11, max: 11 },
  { name: "Certificado de reservista", min: 12, max: 12 },
  { name: "ISRC (músicas)", min: 12, max: 12 },
  { name: "RENAVAM / ISSN (revistas)", min: 13, max: 13 },
  { name: "Código de barras EAN-13", min: 13, max: 13 },
  { name: "CNPJ", min: 14, max: 14 },
  { name: "IMEI", min: 15, max: 15 },
  { name: "Cartão de crédito (frente)", min: 16, max: 16 },
];

/** Tipos cujo intervalo de dígitos inclui `len`. */
export function docFormatsForLength(len: number): DocFormat[] {
  return DOC_FORMATS.filter((d) => len >= d.min && len <= d.max);
}

/** Rótulo do intervalo de um formato: "8" ou "1–4". */
export function lengthLabel(d: DocFormat): string {
  return d.min === d.max ? `${d.min}` : `${d.min}–${d.max}`;
}
