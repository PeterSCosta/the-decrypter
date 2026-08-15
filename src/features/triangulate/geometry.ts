import type { GeoPoint } from "@/features/location/formats";

/**
 * Geometria de um punhado de pontos: o centro entre eles e a rota que os liga
 * na ordem dada.
 *
 * Tudo aqui trabalha em metros sobre uma **projeção equirretangular local**
 * ancorada no primeiro ponto — a 0,1° de distância (uns 11 km) o erro dessa
 * aproximação fica abaixo de 1 m, e a alternativa (esférica de verdade) só
 * complicaria contas que existem para responder "onde é o meio disso aqui".
 * A exceção é `distancia`, que é haversine de verdade e vale em qualquer escala.
 */

const R = 6371008.8; // raio médio da Terra (IUGG), metros
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Distância em metros pela fórmula de haversine. */
export function distancia(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rumo inicial de `a` para `b`, em graus a partir do norte (0–360). */
export function rumo(a: GeoPoint, b: GeoPoint): number {
  const dLng = rad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const ROSA = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
/** "NE", "SO"… a partir do rumo em graus. */
export function rosaDosVentos(graus: number): string {
  return ROSA[Math.round((((graus % 360) + 360) % 360) / 45) % 8];
}

// ── projeção local ──────────────────────────────────────────────────────────

interface Plano {
  /** metros a leste / ao norte da âncora */
  para(p: GeoPoint): [number, number];
  de(x: number, y: number): GeoPoint;
}

function plano(ancora: GeoPoint): Plano {
  const mPorGrauLat = (Math.PI / 180) * R;
  const mPorGrauLng = mPorGrauLat * Math.cos(rad(ancora.lat));
  return {
    para: (p) => [(p.lng - ancora.lng) * mPorGrauLng, (p.lat - ancora.lat) * mPorGrauLat],
    de: (x, y) => ({ lat: ancora.lat + y / mPorGrauLat, lng: ancora.lng + x / mPorGrauLng }),
  };
}

// ── centros ─────────────────────────────────────────────────────────────────

/**
 * Média das posições — o "centro de massa" dos pontos. É o que quase todo mundo
 * quer dizer com "o ponto central entre eles", e o único que tem sentido para
 * qualquer quantidade de pontos.
 */
export function centroide(pts: GeoPoint[]): GeoPoint | null {
  if (!pts.length) return null;
  // Soma vetorial em 3D: numa cidade daria no mesmo que a média das coordenadas,
  // mas isso aqui também atravessa o antimeridiano sem inventar um ponto no
  // meio do Pacífico.
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of pts) {
    const la = rad(p.lat);
    const lo = rad(p.lng);
    x += Math.cos(la) * Math.cos(lo);
    y += Math.cos(la) * Math.sin(lo);
    z += Math.sin(la);
  }
  const n = pts.length;
  x /= n;
  y /= n;
  z /= n;
  const hyp = Math.sqrt(x * x + y * y);
  if (hyp < 1e-12 && Math.abs(z) < 1e-12) return null; // pontos antípodas: sem centro
  return { lat: deg(Math.atan2(z, hyp)), lng: deg(Math.atan2(y, x)) };
}

/**
 * O ponto **equidistante** dos três — o circuncentro do triângulo. É o centro
 * que a palavra "triangulação" costuma querer dizer: o lugar de onde os três
 * ficam à mesma distância.
 *
 * `null` quando os três são colineares (não há circunferência que passe pelos
 * três) — inclusive quando dois deles coincidem.
 */
export function circuncentro(a: GeoPoint, b: GeoPoint, c: GeoPoint): GeoPoint | null {
  const pl = plano(a);
  const [ax, ay] = pl.para(a);
  const [bx, by] = pl.para(b);
  const [cx, cy] = pl.para(c);
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-6) return null;
  const a2 = ax * ax + ay * ay;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
  const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  return pl.de(ux, uy);
}

/** Incentro: o ponto equidistante dos três **lados** (centro do círculo inscrito). */
export function incentro(a: GeoPoint, b: GeoPoint, c: GeoPoint): GeoPoint | null {
  const la = distancia(b, c);
  const lb = distancia(a, c);
  const lc = distancia(a, b);
  const soma = la + lb + lc;
  if (soma < 1e-9) return null;
  const pl = plano(a);
  const pa = pl.para(a);
  const pb = pl.para(b);
  const pc = pl.para(c);
  return pl.de(
    (la * pa[0] + lb * pb[0] + lc * pc[0]) / soma,
    (la * pa[1] + lb * pb[1] + lc * pc[1]) / soma,
  );
}

/**
 * O ponto que **minimiza a soma das distâncias** a todos (mediana geométrica,
 * ponto de Fermat/Weber) — o encontro mais justo quando cada pessoa sai de um
 * lugar. Diferente do centroide, ele não é puxado por um ponto muito distante.
 *
 * Weiszfeld: itera até o passo ficar abaixo de 10 cm ou 128 voltas.
 */
export function medianaGeometrica(pts: GeoPoint[]): GeoPoint | null {
  if (!pts.length) return null;
  if (pts.length <= 2) return centroide(pts);
  const pl = plano(pts[0]);
  const xy = pts.map(pl.para);
  let [cx, cy] = xy
    .reduce(([sx, sy], [x, y]) => [sx + x, sy + y], [0, 0])
    .map((v) => v / xy.length);

  for (let i = 0; i < 128; i++) {
    let sx = 0;
    let sy = 0;
    let peso = 0;
    for (const [x, y] of xy) {
      const d = Math.hypot(x - cx, y - cy);
      // Cair exatamente sobre um dos pontos zera o denominador; ele já é o
      // mínimo local, então esse ponto simplesmente não vota nesta volta.
      if (d < 1e-6) continue;
      sx += x / d;
      sy += y / d;
      peso += 1 / d;
    }
    if (peso === 0) break;
    const nx = sx / peso;
    const ny = sy / peso;
    const passo = Math.hypot(nx - cx, ny - cy);
    cx = nx;
    cy = ny;
    if (passo < 0.1) break;
  }
  return pl.de(cx, cy);
}

// ── medidas ─────────────────────────────────────────────────────────────────

export interface Triangulo {
  /** Lados opostos a cada vértice, em metros: [a (oposto ao 1º), b, c]. */
  lados: [number, number, number];
  /** Ângulos internos em graus, na ordem dos vértices. */
  angulos: [number, number, number];
  /** Área em m². */
  area: number;
  /** Perímetro em metros. */
  perimetro: number;
}

/** Lados, ângulos e área do triângulo formado por três pontos. */
export function triangulo(a: GeoPoint, b: GeoPoint, c: GeoPoint): Triangulo | null {
  const la = distancia(b, c);
  const lb = distancia(a, c);
  const lc = distancia(a, b);
  if (la < 1e-6 || lb < 1e-6 || lc < 1e-6) return null;
  const ang = (op: number, x: number, y: number) =>
    deg(Math.acos(Math.min(1, Math.max(-1, (x * x + y * y - op * op) / (2 * x * y)))));
  const s = (la + lb + lc) / 2;
  return {
    lados: [la, lb, lc],
    angulos: [ang(la, lb, lc), ang(lb, la, lc), ang(lc, la, lb)],
    area: Math.sqrt(Math.max(0, s * (s - la) * (s - lb) * (s - lc))),
    perimetro: la + lb + lc,
  };
}

export interface Perna {
  de: number; // índice do ponto de origem
  para: number;
  metros: number;
  rumo: number;
  direcao: string;
}

export interface Rota {
  pernas: Perna[];
  total: number;
  /** Fechando o circuito de volta ao primeiro ponto. */
  totalFechado: number;
}

/** A rota que passa por todos os pontos **na ordem dada**. */
export function rota(pts: GeoPoint[]): Rota {
  const pernas: Perna[] = [];
  for (let i = 1; i < pts.length; i++) {
    const g = rumo(pts[i - 1], pts[i]);
    pernas.push({
      de: i - 1,
      para: i,
      metros: distancia(pts[i - 1], pts[i]),
      rumo: g,
      direcao: rosaDosVentos(g),
    });
  }
  const total = pernas.reduce((s, p) => s + p.metros, 0);
  const volta = pts.length > 2 ? distancia(pts[pts.length - 1], pts[0]) : 0;
  return { pernas, total, totalFechado: total + volta };
}

/**
 * Reordena os pontos para encurtar o percurso — vizinho mais próximo a partir do
 * primeiro, depois 2-opt até não melhorar. **O primeiro ponto fica fixo**: é o
 * de onde se sai. Devolve os índices na nova ordem.
 *
 * Não é o ótimo (isso é o caixeiro-viajante), mas com uma dúzia de pontos o
 * 2-opt costuma chegar a poucos por cento dele.
 */
export function ordemMaisCurta(pts: GeoPoint[]): number[] {
  const n = pts.length;
  if (n < 3) return pts.map((_, i) => i);
  const d = pts.map((p) => pts.map((q) => distancia(p, q)));

  const ordem = [0];
  const falta = new Set(pts.map((_, i) => i).slice(1));
  while (falta.size) {
    const atual = ordem[ordem.length - 1];
    let melhor = -1;
    for (const i of falta) if (melhor < 0 || d[atual][i] < d[atual][melhor]) melhor = i;
    ordem.push(melhor);
    falta.delete(melhor);
  }

  const comprimento = (o: number[]) => o.slice(1).reduce((s, v, i) => s + d[o[i]][v], 0);
  let melhorou = true;
  while (melhorou) {
    melhorou = false;
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const cand = [
          ...ordem.slice(0, i),
          ...ordem.slice(i, j + 1).reverse(),
          ...ordem.slice(j + 1),
        ];
        if (comprimento(cand) < comprimento(ordem) - 1e-6) {
          ordem.splice(0, n, ...cand);
          melhorou = true;
        }
      }
    }
  }
  return ordem;
}

/** "1,4 km" / "820 m" */
export function formataDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km`;
}

/** "12,3 ha" / "450 m²" / "2,1 km²" */
export function formataArea(m2: number): string {
  if (m2 < 10_000) return `${Math.round(m2).toLocaleString("pt-BR")} m²`;
  if (m2 < 1_000_000)
    return `${(m2 / 10_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha`;
  return `${(m2 / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km²`;
}
