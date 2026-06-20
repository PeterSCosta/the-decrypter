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

function cand(label: string, output: string, notes: string, forcedScore: number): DecodeCandidate {
  return {
    decoderId: "periodic-table",
    decoderName: "Tabela periódica",
    category: "transform",
    label,
    output,
    notes,
    forcedScore,
  };
}

export const decoders = defineDecoder({
  id: "periodic-table",
  name: "Tabela periódica",
  category: "transform",
  decode(input) {
    const tokens = input
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean);
    if (tokens.length === 0) return [];
    const out: DecodeCandidate[] = [];

    // número(s) atômico(s) → símbolos (+ nomes nas notas)
    if (tokens.every((t) => /^\d{1,3}$/.test(t) && +t >= 1 && +t <= 118)) {
      const els = tokens.map((t) => E[+t]);
      out.push(
        cand(
          "número atômico",
          els.map((e) => e[0]).join(" "),
          els.map((e) => e[1]).join(" · "),
          0.75,
        ),
      );
    }

    // símbolo(s) → número(s) atômico(s)
    const up = tokens.map((t) => t.toUpperCase());
    if (up.every((t) => BY_SYM.has(t))) {
      const nums = up.map((t) => BY_SYM.get(t) as number);
      out.push(cand("símbolos", nums.join(" "), nums.map((n) => E[n][1]).join(" · "), 0.7));
    }

    // peso atômico (um valor) → elemento(s)
    if (tokens.length === 1) {
      const raw = tokens[0].replace(",", ".");
      if (/^\d+(\.\d+)?$/.test(raw)) {
        const w = Number(raw);
        const dec = raw.includes(".");
        const hits = E.filter(
          (e, n) => n >= 1 && (dec ? Math.abs(e[2] - w) < 0.5 : Math.round(e[2]) === w),
        );
        if (hits.length) {
          out.push(
            cand(
              "peso atômico",
              hits.map((e) => `${e[1]} (${e[0]})`).join(", "),
              `peso atômico ${dec ? "≈" : "~"}${w}`,
              0.7,
            ),
          );
        }
      }
    }
    return out;
  },
});
