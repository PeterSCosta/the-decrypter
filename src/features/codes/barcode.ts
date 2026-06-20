/** Validação de códigos de barras GS1: EAN-13, EAN-8 e UPC-A. */

export type BarcodeType = "EAN-13" | "EAN-8" | "UPC-A";

const digits = (value: string) => value.replace(/\D/g, "");

/**
 * Dígito verificador GS1 (mod 10): a partir do dígito mais à direita do corpo
 * (sem o DV), pesos alternados 3,1,3,1… O mesmo cálculo serve para EAN-13,
 * EAN-8 e UPC-A.
 */
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const d = Number(body[body.length - 1 - i]);
    sum += d * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** Verdadeiro se o número tem 8/12/13 dígitos e o DV confere. */
export function isValidBarcode(value: string): boolean {
  const v = digits(value);
  if (![8, 12, 13].includes(v.length)) return false;
  return gs1CheckDigit(v.slice(0, -1)) === Number(v[v.length - 1]);
}

/** Tipo do código de barras, ou null se o tamanho/DV não baterem. */
export function barcodeType(value: string): BarcodeType | null {
  const v = digits(value);
  if (!isValidBarcode(v)) return null;
  if (v.length === 13) return "EAN-13";
  if (v.length === 12) return "UPC-A";
  if (v.length === 8) return "EAN-8";
  return null;
}

/** Normaliza para EAN-13 (UPC-A recebe um "0" à esquerda) — base do prefixo GS1. */
export function toEan13(value: string): string {
  const v = digits(value);
  return v.length === 12 ? `0${v}` : v;
}
