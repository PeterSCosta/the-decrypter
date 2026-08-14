/**
 * Grade estatística do IBGE — o identificador de célula usado nos recortes do
 * Censo, do tipo `1KME5499000N8337000`.
 *
 * O par E/N NÃO é lat/lon: são coordenadas planas da Albers equivalente que o
 * IBGE adota para a grade (SIRGAS 2000 / GRS80, `+proj=aea +lat_0=-12
 * +lon_0=-54 +lat_1=-2 +lat_2=-22 +x_0=5000000 +y_0=10000000`). Decodificar é
 * inverter essa projeção — mesma classe de conta do inverso da UTM em
 * `formats.ts`, só que com a fórmula de área equivalente de Snyder.
 *
 * Convenções e o que fica em aberto:
 *  - o identificador TRUNCA a coordenada, então os números são o canto SUDOESTE
 *    da célula no plano; devolvemos o CENTRO (como Maidenhead e Plus Code).
 *    Isso bate com o valor conferido: Blumenau projeta em E=5.499.937,6 /
 *    N=8.337.528,3, que truncado a 1 km dá E5499/N8337;
 *  - a forma da string varia na natureza — o wiki do OSM escreve em km
 *    ("10KME5480N8500") e o repositório osm-codes/BR_IBGE em metros
 *    ("1KME5756000N8700800"). Aceitamos as duas: 6 dígitos ou mais = metros,
 *    até 5 = quilômetros;
 *  - o BR_IBGE documenta que o rótulo referenciaria o canto INFERIOR-DIREITO no
 *    1KM (e superior-direito no 200M). Isso contradiz a truncagem, que só pode
 *    produzir o canto de menor E/N. Ficamos com a truncagem, que é o que os
 *    números conferidos mostram; se um arquivo real do FTP do IBGE disser o
 *    contrário, o erro é de meia célula para leste/norte.
 *
 * A conversão em si (Albers ↔ lat/lon) foi conferida contra o pyproj com os
 * parâmetros oficiais: -26.9194,-49.0661 → E=5499937,6 N=8337528,3 e
 * -26.9078,-48.6618 → E=5540923,4 N=8338035,9, com a volta exata.
 */
import type { GeoPoint } from "./formats";

// ---- Albers equivalente do IBGE (SIRGAS 2000 sobre o GRS80) ---------------
const A = 6378137.0;
const F = 1 / 298.257222101;
const E2 = F * (2 - F);
const ECC = Math.sqrt(E2);
const RAD = Math.PI / 180;
const LAT0 = -12 * RAD;
const LON0 = -54 * RAD;
const LAT1 = -2 * RAD;
const LAT2 = -22 * RAD;
const X0 = 5_000_000;
const Y0 = 10_000_000;

/** Área autálica q(φ) de Snyder (3-12). */
function authalic(phi: number): number {
  const s = Math.sin(phi);
  return (
    (1 - E2) * (s / (1 - E2 * s * s) - (1 / (2 * ECC)) * Math.log((1 - ECC * s) / (1 + ECC * s)))
  );
}
/** m(φ) de Snyder (14-15). */
const mScale = (phi: number): number => Math.cos(phi) / Math.sqrt(1 - E2 * Math.sin(phi) ** 2);

const M1 = mScale(LAT1);
const M2 = mScale(LAT2);
const Q1 = authalic(LAT1);
const Q2 = authalic(LAT2);
const N = (M1 * M1 - M2 * M2) / (Q2 - Q1);
const C = M1 * M1 + N * Q1;
const RHO0 = (A * Math.sqrt(C - N * authalic(LAT0))) / N;

/** Plano Albers do IBGE → lat/lon (inverso de Snyder 14-20 em diante). */
export function albersToLatLng(x: number, y: number): GeoPoint | null {
  const xp = x - X0;
  const yp = RHO0 - (y - Y0);
  // Com n < 0 (é o caso aqui: padrões-padrão no hemisfério sul) o raio entra
  // negativo e o ângulo espelhado — a ressalva do próprio Snyder.
  const rho = N < 0 ? -Math.hypot(xp, yp) : Math.hypot(xp, yp);
  const theta = N < 0 ? Math.atan2(-xp, -yp) : Math.atan2(xp, yp);
  const lng = (LON0 + theta / N) / RAD;

  const q = (C - (rho * rho * N * N) / (A * A)) / N;
  if (!Number.isFinite(q) || Math.abs(q) > 2.1) return null;
  // φ a partir de q não tem forma fechada: Newton de Snyder (3-16), converge em
  // poucas voltas nas latitudes do Brasil.
  let phi = Math.asin(Math.min(1, Math.max(-1, q / 2)));
  for (let i = 0; i < 30; i++) {
    const s = Math.sin(phi);
    const d =
      ((1 - E2 * s * s) ** 2 / (2 * Math.cos(phi))) *
      (q / (1 - E2) -
        s / (1 - E2 * s * s) +
        (1 / (2 * ECC)) * Math.log((1 - ECC * s) / (1 + ECC * s)));
    phi += d;
    if (Math.abs(d) < 1e-12) break;
  }
  const lat = phi / RAD;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** lat/lon → plano Albers do IBGE. Serve para conferir a volta nos testes. */
export function latLngToAlbers(lat: number, lng: number): { x: number; y: number } {
  const phi = lat * RAD;
  const rho = (A * Math.sqrt(C - N * authalic(phi))) / N;
  const theta = N * (lng * RAD - LON0);
  return { x: X0 + rho * Math.sin(theta), y: Y0 + RHO0 - rho * Math.cos(theta) };
}

// ---- Identificador de célula ---------------------------------------------

/** Lado da célula em metros por prefixo — vocabulário fechado da grade. */
const CELL_SIZES: Record<string, number> = {
  "200M": 200,
  "1KM": 1000,
  "5KM": 5000,
  "10KM": 10000,
  "50KM": 50000,
  "100KM": 100000,
  "500KM": 500000,
};

/**
 * Gate. O prefixo de tamanho é literal e fechado, o que dá zero ruído no
 * fan-out: nenhum CEP, CPF, telefone ou data começa com "1KME".
 */
const GRADE_RE = /^(200M|1KM|5KM|10KM|50KM|100KM|500KM)_?E(\d{3,7})N(\d{3,8})$/i;

/** Área de abrangência declarada pelo IBGE para a grade (plano Albers, metros). */
const COVER = { xMin: 2_800_000, xMax: 8_210_000, yMin: 7_350_000, yMax: 12_200_000 };

export interface GradeHit extends GeoPoint {
  /** Lado da célula em metros. */
  cell: number;
  /** Canto sudoeste no plano Albers. */
  x: number;
  y: number;
}

/** Identificador de célula da grade estatística → centro da célula. */
export function decodeGradeIbge(raw: string): GradeHit | null {
  const s = raw.trim().replace(/\s+/g, "").toUpperCase();
  const m = s.match(GRADE_RE);
  if (!m) return null;
  const cell = CELL_SIZES[m[1]];
  if (!cell) return null;

  // Quilômetros ou metros: quem decide é a contagem de dígitos, porque a área
  // da grade tem 7 dígitos em E e 7–8 em N — nada abaixo disso é metro.
  const toMeters = (d: string) => (d.length <= 5 ? Number(d) * 1000 : Number(d));
  const x = toMeters(m[2]);
  const y = toMeters(m[3]);
  if (x < COVER.xMin || x > COVER.xMax || y < COVER.yMin || y > COVER.yMax) return null;

  const pt = albersToLatLng(x + cell / 2, y + cell / 2);
  return pt ? { ...pt, cell, x, y } : null;
}

export const parseGradeIbge = (raw: string): GeoPoint | null => {
  const hit = decodeGradeIbge(raw);
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
};

/** "1 km" / "200 m" — o lado da célula em texto. */
export const gradeCellLabel = (cell: number): string =>
  cell >= 1000 ? `${cell / 1000} km` : `${cell} m`;
