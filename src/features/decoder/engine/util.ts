export const A_CODE = 97; // 'a'

/** Always-positive modulo. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Remove accents/diacritics: "ÁÇÃO" → "ACAO" (strips U+0300–U+036F combining marks). */
export function stripDiacritics(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFD")) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x0300 || c > 0x036f) out += ch;
  }
  return out;
}

/** Shift a single ASCII letter by `n`, preserving case. Non-letters pass through. */
export function shiftLetter(ch: string, n: number): string {
  const c = ch.charCodeAt(0);
  if (c >= 65 && c <= 90) return String.fromCharCode(mod(c - 65 + n, 26) + 65);
  if (c >= 97 && c <= 122) return String.fromCharCode(mod(c - 97 + n, 26) + 97);
  return ch;
}

/** Count A–Z/a–z letters in a string. */
export function letterCount(s: string): number {
  let n = 0;
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) n++;
  }
  return n;
}

/** True when the trimmed string is non-empty and differs from the source. */
export function isUseful(output: string, input: string): boolean {
  const o = output.trim();
  return o.length > 0 && o !== input.trim();
}

/** Decode bytes as strict UTF-8; returns null if the bytes aren't valid text. */
export function bytesToText(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
