/** Validação/normalização de ISBN (10 e 13) e NCM. */

export function cleanIsbn(value: string): string {
  return value.toUpperCase().replace(/[^0-9X]/g, "");
}

export function isValidIsbn10(value: string): boolean {
  const v = cleanIsbn(value);
  if (!/^\d{9}[\dX]$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = v[i] === "X" ? 10 : Number(v[i]);
    sum += d * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(value: string): boolean {
  const v = cleanIsbn(value);
  if (!/^\d{13}$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(v[i]) * (i % 2 === 0 ? 1 : 3);
  return sum % 10 === 0;
}

export type IsbnType = "ISBN-10" | "ISBN-13" | null;

export function isbnType(value: string): IsbnType {
  const v = cleanIsbn(value);
  if (v.length === 10 && isValidIsbn10(v)) return "ISBN-10";
  if (v.length === 13 && isValidIsbn13(v)) return "ISBN-13";
  return null;
}

export function formatIsbn(value: string): string {
  const v = cleanIsbn(value);
  if (v.length === 13)
    return `${v.slice(0, 3)}-${v[3]}-${v.slice(4, 9)}-${v.slice(9, 12)}-${v[12]}`;
  if (v.length === 10) return `${v[0]}-${v.slice(1, 4)}-${v.slice(4, 9)}-${v[9]}`;
  return v;
}

// ---- NCM (8 dígitos, sem dígito verificador) ------------------------------
export function looksLikeNcm(value: string): boolean {
  return /^\d{8}$/.test(value.replace(/\D/g, "")) && value.replace(/\D/g, "").length === 8;
}

export function formatNcm(value: string): string {
  const v = value.replace(/\D/g, "");
  return v.length === 8 ? `${v.slice(0, 4)}.${v.slice(4, 6)}.${v.slice(6)}` : v;
}
