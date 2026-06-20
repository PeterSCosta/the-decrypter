import { mapDecoder } from "../define";

// Tap code (código de batidas): grade 5×5 sem o K (C cobre o K).
// Cada letra = duas rajadas de batidas (linha, coluna), em pontos.
const SQUARE = "ABCDEFGHIJLMNOPQRSTUVWXYZ"; // 25 letras, sem K

export const decoders = mapDecoder({
  id: "tap-code",
  name: "Tap code (batidas)",
  category: "classical",
  decode(input) {
    const s = input.trim();
    if (!/[.·•]/.test(s) || !/^[.·•\s/|,-]+$/.test(s)) return null;
    const groups = s.split(/[\s/|,-]+/).filter(Boolean);
    if (groups.length === 0 || groups.length % 2 !== 0) return null;
    let out = "";
    for (let i = 0; i < groups.length; i += 2) {
      const r = groups[i].length;
      const c = groups[i + 1].length;
      if (r < 1 || r > 5 || c < 1 || c > 5) return null;
      out += SQUARE[(r - 1) * 5 + (c - 1)];
    }
    return out;
  },
});
