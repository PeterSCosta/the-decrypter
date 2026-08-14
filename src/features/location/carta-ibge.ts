/**
 * Índice de nomenclatura da carta topográfica IBGE/DSG (articulação sistemática
 * da CIM, a Carta Internacional ao Milionésimo).
 *
 * `SG-22-Z-B-IV-4-SE` se lê da esquerda para a direita, cada pedaço partindo o
 * anterior:
 *  - `SG`   hemisfério Sul + faixa de 4° de latitude (A = 0–4°, G = 24–28°);
 *  - `22`   fuso de 6° de longitude, o mesmo número da UTM (-54° a -48°);
 *  - `Z`    1:500.000 — V/X/Y/Z = NO/NE/SO/SE;
 *  - `B`    1:250.000 — A/B/C/D = NO/NE/SO/SE;
 *  - `IV`   1:100.000 — I..VI em 3 colunas × 2 linhas, da esquerda p/ a direita
 *           e de cima para baixo (inverter aqui erra 30');
 *  - `4`    1:50.000  — 1/2/3/4 = NO/NE/SO/SE;
 *  - `SE`   1:25.000  — NO/NE/SO/SE.
 *
 * Devolve o CENTRO da quadrícula, com o denominador da escala junto: o código
 * nomeia uma FOLHA, não um ponto, e a folha vai de 4°×6° (~440 km) a 7,5'×7,5'
 * (~14 km) conforme quantos níveis vierem.
 *
 * Conferido ao contrário contra registro real do acervo IBGE: Mafra/SC
 * (-26.1114, -49.8054) sai 'SG-22-Z-A-III-1', a nomenclatura publicada da folha
 * "MAFRA SG-22-Z-A-III-1 MI 2868-1"; e 'SG-22-Z-B' é a folha 1:250.000 Blumenau.
 */
import type { GeoPoint } from "./formats";

/**
 * Gate. Os hífens e a sequência de vocabulários fechados tornam o falso positivo
 * quase impossível. Exige pelo menos o nível 1:500.000 ("SG-22-Z"): parar em
 * "SG-22" deixaria a regex casar com rótulo genérico tipo "B-12".
 */
const CARTA_RE =
  /^([NS])?([A-V])-(\d{1,2})-([VXYZ])(?:-([A-D])(?:-(I{1,3}|IV|VI?)(?:-([1-4])(?:-(NO|NE|SO|SE))?)?)?)?$/;

/** Denominador da escala por nível preenchido. */
const SCALES = [500_000, 250_000, 100_000, 50_000, 25_000];

export interface CartaHit extends GeoPoint {
  /** Escala da folha (denominador): 500000 … 25000. */
  scale: number;
  /** Nomenclatura normalizada, com o hemisfério explícito. */
  sheet: string;
  /** Lados da quadrícula em graus [lat, lon]. */
  size: [number, number];
}

/** Um retângulo em graus, encolhido nível a nível. */
interface Quad {
  latN: number;
  latS: number;
  lonW: number;
  lonE: number;
}

/** Parte o retângulo em 2×2 e devolve o quadrante pedido. */
function quarter(q: Quad, east: boolean, south: boolean): Quad {
  const latMid = (q.latN + q.latS) / 2;
  const lonMid = (q.lonW + q.lonE) / 2;
  return {
    latN: south ? latMid : q.latN,
    latS: south ? q.latS : latMid,
    lonW: east ? lonMid : q.lonW,
    lonE: east ? q.lonE : lonMid,
  };
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/** Nomenclatura da folha → centro da quadrícula. `null` quando não é um código. */
export function decodeCartaIbge(raw: string): CartaHit | null {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  const m = s.match(CARTA_RE);
  if (!m) return null;

  // Cartas antigas às vezes omitem o S/N. Dentro do Brasil, assume-se Sul.
  const south = m[1] !== "N";
  const bandIdx = m[2].charCodeAt(0) - 65; // A = 0–4°, B = 4–8°, …
  const zone = Number(m[3]);
  if (zone < 1 || zone > 60) return null;
  if (bandIdx * 4 + 4 > 88) return null;

  // Folha 1:1.000.000: 4° de latitude × 6° de longitude (o fuso da UTM).
  const latFar = bandIdx * 4 + 4; // borda mais distante do equador
  let q: Quad = {
    latN: south ? -(latFar - 4) : latFar,
    latS: south ? -latFar : latFar - 4,
    lonW: (zone - 1) * 6 - 180,
    lonE: zone * 6 - 180,
  };

  // 1:500.000 — V NO, X NE, Y SO, Z SE
  const v = m[4];
  q = quarter(q, v === "X" || v === "Z", v === "Y" || v === "Z");
  let level = 0;

  // 1:250.000 — A NO, B NE, C SO, D SE
  if (m[5]) {
    const c = m[5];
    q = quarter(q, c === "B" || c === "D", c === "C" || c === "D");
    level = 1;
  }

  // 1:100.000 — 3 colunas × 2 linhas, I..VI
  if (m[6]) {
    const n = ROMAN.indexOf(m[6]);
    if (n < 0) return null;
    const col = n % 3;
    const row = Math.floor(n / 3);
    const lonStep = (q.lonE - q.lonW) / 3;
    const latStep = (q.latN - q.latS) / 2;
    q = {
      lonW: q.lonW + col * lonStep,
      lonE: q.lonW + (col + 1) * lonStep,
      latN: q.latN - row * latStep,
      latS: q.latN - (row + 1) * latStep,
    };
    level = 2;
  }

  // 1:50.000 — 1 NO, 2 NE, 3 SO, 4 SE
  if (m[7]) {
    const d = Number(m[7]);
    q = quarter(q, d === 2 || d === 4, d === 3 || d === 4);
    level = 3;
  }

  // 1:25.000 — NO/NE/SO/SE
  if (m[8]) {
    const d = m[8];
    q = quarter(q, d === "NE" || d === "SE", d === "SO" || d === "SE");
    level = 4;
  }

  const lat = (q.latN + q.latS) / 2;
  const lng = (q.lonW + q.lonE) / 2;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    lat,
    lng,
    scale: SCALES[level],
    // Sem hemisfério explícito, o "S" assumido entra na nomenclatura devolvida.
    sheet: m[1] ? s : `S${s}`,
    size: [q.latN - q.latS, q.lonE - q.lonW],
  };
}

export const parseCartaIbge = (raw: string): GeoPoint | null => {
  const hit = decodeCartaIbge(raw);
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
};

/**
 * "1:25.000" — ponto de milhar do pt-BR. Formatado à mão em vez de
 * `toLocaleString`, que depende do ICU do ambiente e mudaria o texto no teste.
 */
export const cartaScaleLabel = (scale: number): string =>
  `1:${String(scale).replace(/\B(?=(\d{3})+$)/g, ".")}`;
