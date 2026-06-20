/** Resolvedor de anagramas: rearranja TODAS as letras em palavras do dicionário. */

/** Remove acentos e baixa caixa (para a chave do anagrama). */
function fold(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFD")) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x300 || c > 0x36f) out += ch;
  }
  return out.toLowerCase();
}

/** Chave canônica: letras a–z ordenadas (acentos dobrados). "Roma" → "amor". */
export function anagramKey(word: string): string {
  return [...fold(word)]
    .filter((c) => c >= "a" && c <= "z")
    .sort()
    .join("");
}

/** Índice chave → palavras (mesmas letras). */
export function buildIndex(words: string[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const w of words) {
    const k = anagramKey(w);
    if (!k) continue;
    const arr = m.get(k);
    if (arr) arr.push(w);
    else m.set(k, [w]);
  }
  return m;
}

/** Anagramas exatos de `input` (usam todas as letras). */
export function solveAnagram(index: Map<string, string[]>, input: string): string[] {
  const k = anagramKey(input);
  return k ? (index.get(k) ?? []).slice() : [];
}
