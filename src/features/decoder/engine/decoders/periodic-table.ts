import { lookupCompound } from "@/features/reference/compounds";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";

// [símbolo, nome (pt-BR), peso atômico] indexado pelo número atômico (1..118).
// biome-ignore format: tabela compacta.
const E: [string, string, number][] = [
  ["", "", 0],
  ["H","Hidrogênio",1.008],["He","Hélio",4.0026],["Li","Lítio",6.94],["Be","Berílio",9.0122],
  ["B","Boro",10.81],["C","Carbono",12.011],["N","Nitrogênio",14.007],["O","Oxigênio",15.999],
  ["F","Flúor",18.998],["Ne","Neônio",20.18],["Na","Sódio",22.99],["Mg","Magnésio",24.305],
  ["Al","Alumínio",26.982],["Si","Silício",28.085],["P","Fósforo",30.974],["S","Enxofre",32.06],
  ["Cl","Cloro",35.45],["Ar","Argônio",39.948],["K","Potássio",39.098],["Ca","Cálcio",40.078],
  ["Sc","Escândio",44.956],["Ti","Titânio",47.867],["V","Vanádio",50.942],["Cr","Cromo",51.996],
  ["Mn","Manganês",54.938],["Fe","Ferro",55.845],["Co","Cobalto",58.933],["Ni","Níquel",58.693],
  ["Cu","Cobre",63.546],["Zn","Zinco",65.38],["Ga","Gálio",69.723],["Ge","Germânio",72.63],
  ["As","Arsênio",74.922],["Se","Selênio",78.971],["Br","Bromo",79.904],["Kr","Criptônio",83.798],
  ["Rb","Rubídio",85.468],["Sr","Estrôncio",87.62],["Y","Ítrio",88.906],["Zr","Zircônio",91.224],
  ["Nb","Nióbio",92.906],["Mo","Molibdênio",95.95],["Tc","Tecnécio",98],["Ru","Rutênio",101.07],
  ["Rh","Ródio",102.91],["Pd","Paládio",106.42],["Ag","Prata",107.87],["Cd","Cádmio",112.41],
  ["In","Índio",114.82],["Sn","Estanho",118.71],["Sb","Antimônio",121.76],["Te","Telúrio",127.6],
  ["I","Iodo",126.9],["Xe","Xenônio",131.29],["Cs","Césio",132.91],["Ba","Bário",137.33],
  ["La","Lantânio",138.91],["Ce","Cério",140.12],["Pr","Praseodímio",140.91],["Nd","Neodímio",144.24],
  ["Pm","Promécio",145],["Sm","Samário",150.36],["Eu","Európio",151.96],["Gd","Gadolínio",157.25],
  ["Tb","Térbio",158.93],["Dy","Disprósio",162.5],["Ho","Hólmio",164.93],["Er","Érbio",167.26],
  ["Tm","Túlio",168.93],["Yb","Itérbio",173.05],["Lu","Lutécio",174.97],["Hf","Háfnio",178.49],
  ["Ta","Tântalo",180.95],["W","Tungstênio",183.84],["Re","Rênio",186.21],["Os","Ósmio",190.23],
  ["Ir","Irídio",192.22],["Pt","Platina",195.08],["Au","Ouro",196.97],["Hg","Mercúrio",200.59],
  ["Tl","Tálio",204.38],["Pb","Chumbo",207.2],["Bi","Bismuto",208.98],["Po","Polônio",209],
  ["At","Astato",210],["Rn","Radônio",222],["Fr","Frâncio",223],["Ra","Rádio",226],
  ["Ac","Actínio",227],["Th","Tório",232.04],["Pa","Protactínio",231.04],["U","Urânio",238.03],
  ["Np","Netúnio",237],["Pu","Plutônio",244],["Am","Amerício",243],["Cm","Cúrio",247],
  ["Bk","Berquélio",247],["Cf","Califórnio",251],["Es","Einstênio",252],["Fm","Férmio",257],
  ["Md","Mendelévio",258],["No","Nobélio",259],["Lr","Laurêncio",262],["Rf","Rutherfórdio",267],
  ["Db","Dúbnio",268],["Sg","Seabórgio",269],["Bh","Bóhrio",270],["Hs","Hássio",269],
  ["Mt","Meitnério",278],["Ds","Darmstácio",281],["Rg","Roentgênio",282],["Cn","Copernício",285],
  ["Nh","Nihônio",286],["Fl","Fleróvio",289],["Mc","Moscóvio",290],["Lv","Livermório",293],
  ["Ts","Tennesso",294],["Og","Oganessônio",294],
];

const BY_SYM = new Map<string, number>();
E.forEach(([sym], n) => {
  if (sym) BY_SYM.set(sym.toUpperCase(), n);
});

export interface ElementInfo {
  z: number; // número atômico
  sym: string;
  name: string;
  weight: number;
}

const info = (n: number): ElementInfo => ({ z: n, sym: E[n][0], name: E[n][1], weight: E[n][2] });

function cand(o: {
  label: string;
  output: string;
  els: ElementInfo[];
  forcedScore: number;
  notes?: string;
  /** Só para saída que é valor limpo — o card de elementos não encadeia sozinho. */
  chainValue?: string;
}): DecodeCandidate {
  return {
    decoderId: "periodic-table",
    decoderName: "Tabela periódica",
    category: "transform",
    label: o.label,
    output: o.output,
    notes: o.notes ?? o.els.map((e) => `${e.name} (peso ${e.weight})`).join(" · "),
    forcedScore: o.forcedScore,
    ...(o.chainValue ? { chainValue: o.chainValue } : {}),
    render: "elements",
    data: o.els,
  };
}

// ---- fórmula molecular → subscritos como dígitos --------------------------
// GIA-19 "Químico maluco": H3PO4 H2O HNO3 → 3·1·4 | 2·1 | 1·1·3 → 31421113,
// o telefone da loja de crachás. O subscrito ausente vale 1 — é ele que fecha
// os oito dígitos.

/** Símbolo exato → número atômico. Distinto de `BY_SYM`, que normaliza a caixa. */
const BY_SYM_EXACT = new Map<string, number>();
E.forEach(([sym], n) => {
  if (sym) BY_SYM_EXACT.set(sym, n);
});

interface FormulaRead {
  /** Preenchido só quando a entrada veio pelo nome do composto. */
  name?: string;
  formula: string;
  units: { el: ElementInfo; n: number }[];
}

/**
 * Lê uma fórmula em notação padrão. A caixa é o próprio significado — CO é
 * carbono+oxigênio e Co é cobalto — então aqui nada de `toUpperCase`. Devolve
 * null ao primeiro caractere que sobra, senão "Hoje2" viraria fórmula.
 */
function parseFormula(formula: string): FormulaRead | null {
  const parts = [...formula.matchAll(/([A-Z][a-z]?)(\d*)/g)];
  if (parts.length === 0 || parts.map((p) => p[0]).join("") !== formula) return null;
  const units: FormulaRead["units"] = [];
  for (const [, sym, sub] of parts) {
    const z = BY_SYM_EXACT.get(sym);
    if (z === undefined) return null;
    units.push({ el: info(z), n: sub ? Number(sub) : 1 });
  }
  return { formula, units };
}

/** Entrada como fórmulas soltas. Exige subscrito explícito: é o portão. */
function readFormulas(tokens: string[]): FormulaRead[] | null {
  const reads: FormulaRead[] = [];
  for (const t of tokens) {
    const r = parseFormula(t);
    if (!r) return null;
    reads.push(r);
  }
  // Sem nenhum subscrito escrito, "H O Cu" só devolveria 1s e duplicaria o
  // modo dos símbolos.
  if (!reads.some((r) => r.units.some((u) => u.n > 1))) return null;
  return reads;
}

/**
 * Entrada como nomes pt-BR ("ácido fosfórico, água, ácido nítrico"), que é o
 * que o enunciado dá. O portão é o dicionário: ou todos os trechos são
 * compostos conhecidos, ou o decoder se cala.
 */
function readNames(input: string, only: boolean): FormulaRead[] | null {
  const parts = input
    .split(/[,;\n+]|\s+e\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  // Um nome sozinho ("água", "sal") é palavra comum demais para disparar no
  // meio dos outros 74 decoders — só no modo "uma cifra só".
  if (parts.length < (only ? 1 : 2)) return null;
  const reads: FormulaRead[] = [];
  for (const p of parts) {
    const c = lookupCompound(p);
    if (!c) return null;
    const r = parseFormula(c.formula);
    if (!r) return null;
    reads.push({ ...r, name: c.name });
  }
  return reads;
}

export const decoders = defineDecoder({
  id: "periodic-table",
  name: "Tabela periódica",
  category: "transform",
  decode(input, ctx) {
    const tokens = input
      .trim()
      .split(/[\s,;+]+/)
      .filter(Boolean);
    if (tokens.length === 0) return [];
    const out: DecodeCandidate[] = [];

    // número(s) atômico(s) → elementos
    if (tokens.every((t) => /^\d{1,3}$/.test(t) && +t >= 1 && +t <= 118)) {
      const els = tokens.map((t) => info(Number(t)));
      const output = els.map((e) => e.sym).join(" ");
      // 0.55 e não 0.75: TODA lista de números até 118 tem uma leitura de tabela
      // periódica, inclusive as que são A1Z26 — e com 0.75 fixo esta linha
      // ficava na frente da resposta certa. Medido em "7 5 15 20 21 4 5"
      // (GIA-27): o símbolo "N B P Ca Sc Be B" batia GEOTUDE.
      out.push(
        cand({ label: "número atômico", output, els, forcedScore: 0.55, chainValue: output }),
      );
    }

    // símbolo(s) → elementos (com nome, nº atômico e peso)
    const up = tokens.map((t) => t.toUpperCase());
    if (up.every((t) => BY_SYM.has(t))) {
      const els = up.map((t) => info(BY_SYM.get(t) as number));
      const output = els.map((e) => e.z).join(" ");
      out.push(cand({ label: "símbolos", output, els, forcedScore: 0.7, chainValue: output }));
    }

    // fórmula molecular → subscritos como dígitos (pelos nomes ou pelas fórmulas)
    const reads = readNames(input, ctx.only === "periodic-table") ?? readFormulas(tokens) ?? [];
    const unitCount = reads.reduce((n, r) => n + r.units.length, 0);
    // Um símbolo só duplicaria o modo acima e viraria presa do dedup.
    if (unitCount >= 2) {
      // O card lista cada elemento uma vez; H3PO4·H2O·HNO3 repete H e O.
      const els: ElementInfo[] = [];
      for (const r of reads) {
        for (const u of r.units) if (!els.some((e) => e.z === u.el.z)) els.push(u.el);
      }
      const digits = reads.map((r) => r.units.map((u) => u.n).join("")).join("");
      const byName = reads.some((r) => r.name);
      out.push(
        cand({
          label: byName ? "nomes → fórmula molecular" : "fórmula molecular",
          output: digits,
          els,
          // Nome do composto é intenção declarada; três fórmulas seguidas quase
          // não acontecem por acaso; uma fórmula solta ainda pode ser um código
          // qualquer ("CV20"), então empata com os outros modos.
          forcedScore: byName ? 0.85 : reads.length > 1 ? 0.8 : 0.7,
          notes: reads
            .map(
              (r) =>
                `${r.name ? `${r.name} = ` : ""}${r.formula} → ${r.units.map((u) => u.n).join("·")}`,
            )
            .join(" | "),
          chainValue: digits,
        }),
      );
    }

    // peso atômico (um valor) → elemento(s)
    if (tokens.length === 1) {
      const raw = tokens[0].replace(",", ".");
      if (/^\d+(\.\d+)?$/.test(raw)) {
        const w = Number(raw);
        const dec = raw.includes(".");
        const hits: ElementInfo[] = [];
        E.forEach((e, n) => {
          if (n >= 1 && (dec ? Math.abs(e[2] - w) < 0.5 : Math.round(e[2]) === w))
            hits.push(info(n));
        });
        if (hits.length) {
          out.push(
            cand({
              label: `peso atômico ${dec ? "≈" : "~"}${w}`,
              // Saída em prosa: não encadeia (sem `chainValue`).
              output: hits.map((e) => `${e.name} (${e.sym})`).join(", "),
              els: hits,
              forcedScore: 0.7,
            }),
          );
        }
      }
    }
    return out;
  },
});
