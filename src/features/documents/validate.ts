/**
 * Validação de CPF e CNPJ (incl. o novo CNPJ alfanumérico).
 *
 * O CNPJ alfanumérico (vigente a partir de 2026) mantém o mesmo cálculo de
 * dígitos verificadores; muda apenas o valor de cada caractere, que passa a ser
 * `ASCII(c) − 48` ('0'→0 … '9'→9, 'A'→17 … 'Z'→42). Como '0'–'9' continuam
 * valendo 0–9, o mesmo algoritmo valida CNPJ numérico e alfanumérico.
 */

// ---- CPF ------------------------------------------------------------------
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string): boolean {
  const v = onlyDigits(value);
  if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
  const d = [...v].map(Number);
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += d[i] * (t + 1 - i);
    let r = (sum * 10) % 11;
    if (r === 10) r = 0;
    if (r !== d[t]) return false;
  }
  return true;
}

/**
 * Os dois dígitos verificadores que este CPF DEVERIA ter — `null` se não tiver
 * 11 dígitos.
 *
 * O segundo é calculado sobre o primeiro **como impresso**, não sobre o
 * corrigido: é isso que permite dizer "o 1º confere, o 2º não", que é um
 * diagnóstico bem mais útil que "não é CPF válido". O acervo tem o caso — a
 * etapa 1 da madrugada de 2026 imprime 11458750330, cujo DV1 fecha e DV2 não.
 */
export function cpfCheckDigits(value: string): [number, number] | null {
  const v = onlyDigits(value);
  if (v.length !== 11) return null;
  const d = [...v].map(Number);
  const dv = (t: number) => {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += d[i] * (t + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return [dv(9), dv(10)];
}

export function formatCpf(value: string): string {
  const v = onlyDigits(value).padStart(11, "0").slice(0, 11);
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
}

// ---- CNPJ (numérico + alfanumérico) ---------------------------------------
const CNPJ_SHAPE = /^[0-9A-Z]{12}[0-9]{2}$/;
const DV1_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const DV2_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Remove formatação e normaliza para MAIÚSCULAS, mantendo [0-9A-Z]. */
export function cleanCnpj(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

const charValue = (ch: string) => ch.charCodeAt(0) - 48;

function cnpjDv(base: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < base.length; i++) sum += charValue(base[i]) * weights[i];
  const r = sum % 11;
  return r < 2 ? 0 : 11 - r;
}

export function isValidCnpj(value: string): boolean {
  const v = cleanCnpj(value);
  if (!CNPJ_SHAPE.test(v) || /^(.)\1{13}$/.test(v)) return false;
  return (
    cnpjDv(v.slice(0, 12), DV1_WEIGHTS) === Number(v[12]) &&
    cnpjDv(v.slice(0, 13), DV2_WEIGHTS) === Number(v[13])
  );
}

/**
 * Os dois DV que este CNPJ deveria ter — `null` se a forma não for de CNPJ.
 * Como no CPF, o segundo usa o primeiro **como impresso**.
 */
export function cnpjCheckDigits(value: string): [number, number] | null {
  const v = cleanCnpj(value);
  if (!CNPJ_SHAPE.test(v)) return null;
  return [cnpjDv(v.slice(0, 12), DV1_WEIGHTS), cnpjDv(v.slice(0, 13), DV2_WEIGHTS)];
}

/** Tem letra → é o novo CNPJ alfanumérico. */
export function isAlphanumericCnpj(value: string): boolean {
  return /[A-Z]/.test(cleanCnpj(value));
}

export function formatCnpj(value: string): string {
  const v = cleanCnpj(value);
  if (v.length !== 14) return v;
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
}

/** A entrada tem o formato (14 posições) de um CNPJ? (numérico ou alfanumérico) */
export function looksLikeCnpj(value: string): boolean {
  return CNPJ_SHAPE.test(cleanCnpj(value));
}
