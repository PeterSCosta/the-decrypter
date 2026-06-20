import { mapDecoder } from "../define";
import { stripDiacritics } from "../util";

// Solfejo pt-BR → cifra anglo-saxã (a mesma letra usada na escala).
const SOLFEGE: Record<string, string> = {
  do: "C",
  re: "D",
  mi: "E",
  fa: "F",
  sol: "G",
  la: "A",
  si: "B",
};

/** Uma nota → sua letra (C–G/A/B), ou null se o token não for nota. */
function noteToLetter(raw: string): string | null {
  // remove acentos (dó → do, lá → la) e baixa caixa
  const t = stripDiacritics(raw).toLowerCase();
  // cifra anglo: C D E F G A B, com sustenido/bemol e oitava opcionais (C#, Bb, C4)
  const anglo = t.match(/^([a-g])[#b]?\d?$/);
  if (anglo) return anglo[1].toUpperCase();
  // solfejo: do re mi fa sol la si, com oitava opcional
  const solf = t.match(/^(do|re|mi|fa|sol|la|si)\d?$/);
  if (solf) return SOLFEGE[solf[1]];
  return null;
}

/**
 * Notas musicais → letras (e números A1Z26). Lê cifra anglo (C D E F G A B) ou
 * solfejo (Dó Ré Mi Fá Sol Lá Si): "Dó Ré Mi Fá" → "CDEF". Só dispara quando
 * todos os tokens são notas válidas (≥3), para não roubar entradas comuns.
 */
export const decoders = mapDecoder({
  id: "music-notes",
  name: "Notas musicais",
  category: "transform",
  decode(input) {
    const tokens = input
      .trim()
      .split(/[\s,;]+/)
      .filter(Boolean);
    if (tokens.length < 3) return null;
    const letters: string[] = [];
    for (const tok of tokens) {
      const l = noteToLetter(tok);
      if (l === null) return null;
      letters.push(l);
    }
    const nums = letters.map((l) => l.charCodeAt(0) - 64).join(" ");
    return {
      output: letters.join(""),
      label: "notas → letras",
      notes: `A1Z26: ${nums}`,
    };
  },
});
