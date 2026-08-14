import { stripDiacritics } from "@/features/decoder/engine/util";

/**
 * Nomes pt-BR de compostos → fórmula molecular. O enunciado de uma prova dá os
 * NOMES ("ácido fosfórico, monóxido de dihidrogênio, ácido nítrico"), nunca as
 * fórmulas — sem esta ponte, o modo de subscritos do decoder `periodic-table`
 * só serve a quem já fez a química de cabeça.
 *
 * Só fórmulas sem parênteses entram aqui: o parser lê `[A-Z][a-z]?\d*`, e um
 * Ca(OH)2 leria errado em silêncio, que é pior do que não aparecer.
 */
export interface Compound {
  /** Nome canônico, o que vai para a nota do card. */
  name: string;
  /** Fórmula em notação padrão. A caixa é o significado: CO ≠ Co. */
  formula: string;
  /** Outros nomes aceitos na entrada (populares ou sistemáticos). */
  aliases?: string[];
}

export const COMPOUNDS: Compound[] = [
  { name: "água", formula: "H2O", aliases: ["monóxido de dihidrogênio", "óxido de hidrogênio"] },
  { name: "água oxigenada", formula: "H2O2", aliases: ["peróxido de hidrogênio"] },
  { name: "ácido fosfórico", formula: "H3PO4" },
  { name: "ácido nítrico", formula: "HNO3" },
  { name: "ácido sulfúrico", formula: "H2SO4" },
  { name: "ácido clorídrico", formula: "HCl", aliases: ["ácido muriático"] },
  { name: "ácido carbônico", formula: "H2CO3" },
  { name: "ácido acético", formula: "C2H4O2", aliases: ["ácido etanoico"] },
  { name: "ácido cianídrico", formula: "HCN" },
  { name: "ácido fluorídrico", formula: "HF" },
  { name: "ácido bórico", formula: "H3BO3" },
  { name: "amônia", formula: "NH3", aliases: ["amoníaco", "gás amoníaco"] },
  { name: "gás carbônico", formula: "CO2", aliases: ["dióxido de carbono"] },
  { name: "monóxido de carbono", formula: "CO" },
  { name: "metano", formula: "CH4", aliases: ["gás natural"] },
  { name: "etanol", formula: "C2H6O", aliases: ["álcool etílico", "álcool comum"] },
  { name: "metanol", formula: "CH4O", aliases: ["álcool metílico"] },
  { name: "glicose", formula: "C6H12O6", aliases: ["dextrose"] },
  { name: "sacarose", formula: "C12H22O11", aliases: ["açúcar de mesa", "açúcar comum"] },
  { name: "cloreto de sódio", formula: "NaCl", aliases: ["sal de cozinha", "sal comum"] },
  { name: "bicarbonato de sódio", formula: "NaHCO3" },
  { name: "hidróxido de sódio", formula: "NaOH", aliases: ["soda cáustica"] },
  { name: "óxido de cálcio", formula: "CaO", aliases: ["cal virgem", "cal viva"] },
  { name: "carbonato de cálcio", formula: "CaCO3", aliases: ["calcário", "mármore"] },
  { name: "sulfato de cálcio", formula: "CaSO4", aliases: ["gesso"] },
  { name: "ozônio", formula: "O3" },
  { name: "gás oxigênio", formula: "O2", aliases: ["oxigênio molecular"] },
  { name: "gás nitrogênio", formula: "N2", aliases: ["nitrogênio molecular"] },
  { name: "gás hidrogênio", formula: "H2", aliases: ["hidrogênio molecular"] },
  { name: "óxido nitroso", formula: "N2O", aliases: ["gás hilariante"] },
  { name: "dióxido de enxofre", formula: "SO2" },
  { name: "gás sulfídrico", formula: "H2S", aliases: ["sulfeto de hidrogênio"] },
  { name: "sulfato de cobre", formula: "CuSO4" },
  { name: "permanganato de potássio", formula: "KMnO4" },
  { name: "nitrato de potássio", formula: "KNO3", aliases: ["salitre"] },
  { name: "óxido de ferro III", formula: "Fe2O3", aliases: ["hematita", "ferrugem"] },
  { name: "acetona", formula: "C3H6O", aliases: ["propanona"] },
  { name: "benzeno", formula: "C6H6" },
  { name: "ureia", formula: "CH4N2O" },
  { name: "cafeína", formula: "C8H10N4O2" },
  { name: "dióxido de silício", formula: "SiO2", aliases: ["sílica", "quartzo"] },
];

/** Chave de busca: sem acento, minúscula, sem hífen e com espaços colapsados. */
function norm(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/-/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const INDEX = new Map<string, Compound>();
for (const c of COMPOUNDS) {
  for (const n of [c.name, ...(c.aliases ?? [])]) INDEX.set(norm(n), c);
}

/** Nome pt-BR (com ou sem acento, hífen ou caixa) → composto conhecido. */
export function lookupCompound(text: string): Compound | null {
  return INDEX.get(norm(text)) ?? null;
}
