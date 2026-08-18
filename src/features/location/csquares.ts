/**
 * O par, declarado aqui em vez de importado de `formats.ts`: aquele módulo
 * importa este, e fechar o ciclo quebraria a ordem de carga. Mesma solução que
 * o `utm.ts` já usa.
 */
interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * C-squares — a grade hierárquica da CSIRO, usada em dado oceanográfico e de
 * biodiversidade (é o que o OBIS e o GBIF publicam).
 *
 * ── COMO SE LÊ ──────────────────────────────────────────────────────────────
 * O primeiro grupo tem 4 dígitos e vale uma célula de 10°:
 *
 *   `5204`  →  5 = quadrante global · 20 = dezena de latitude · 4 = dezena de
 *              longitude (o "4" aqui são as centenas+dezenas, ver abaixo)
 *
 * O quadrante é o dígito que carrega os SINAIS: 1 = NE, 3 = SE, 5 = SW, 7 = NW.
 * Blumenau é sul e oeste, então começa com 5.
 *
 * Cada ciclo seguinte, separado por `:`, divide a célula por 10 — e o primeiro
 * dígito do ciclo (1..4) diz em qual QUADRANTE da célula anterior se está,
 * seguido de um dígito de latitude e um de longitude:
 *
 *   `5204:469`      célula de 1°
 *   `5204:469:390`  célula de 0,1°
 *
 * ── A ARMADILHA DA SPEC ─────────────────────────────────────────────────────
 * O ciclo NEM SEMPRE tem 3 dígitos. A spec 1.1 admite o ciclo cortado no
 * primeiro dígito (`7307:4`), que representa a célula intermediária de 5°.
 * Um regex que exija três dígitos por ciclo recusa código válido.
 *
 * ── ASSINATURA ──────────────────────────────────────────────────────────────
 * Os `:`. Quatro dígitos nus são "quadrado da OMM" e não têm forma própria —
 * por isso este decoder EXIGE ao menos um ciclo.
 */

export interface CSquare extends GeoPoint {
  /** Lado da célula em graus: 10, 5, 1, 0.5, 0.1… */
  resolucao: number;
}

const QUADRANTE: Record<string, [number, number]> = {
  // [sinal da latitude, sinal da longitude]
  "1": [1, 1],
  "3": [-1, 1],
  "5": [-1, -1],
  "7": [1, -1],
};

export function decodeCSquares(raw: string): CSquare | null {
  const t = raw.trim();
  if (!/^\d{4}(?::\d{1,3})+$/.test(t)) return null;

  const [inicial, ...ciclos] = t.split(":");
  const sinais = QUADRANTE[inicial[0]];
  if (!sinais) return null;

  // A célula de 10°: dezena de latitude (1 dígito) e dezenas de longitude (2).
  let lat = Number(inicial[1]) * 10;
  let lng = Number(inicial.slice(2)) * 10;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let resolucao = 10;

  for (const ciclo of ciclos) {
    // 1º dígito: quadrante DENTRO da célula (1 = NO, 2 = NE, 3 = SO, 4 = SE em
    // valor absoluto — ou seja, soma meia célula em cada eixo).
    const q = Number(ciclo[0]);
    if (q < 1 || q > 4) return null;
    const meia = resolucao / 2;
    if (q === 2 || q === 4) lng += meia;
    if (q === 3 || q === 4) lat += meia;
    resolucao = meia;

    // Sem os dois dígitos seguintes, o código para na célula intermediária.
    if (ciclo.length === 1) break;
    if (ciclo.length !== 3) return null;

    resolucao = meia / 5;
    lat += Number(ciclo[1]) * resolucao;
    lng += Number(ciclo[2]) * resolucao;
  }

  const pt = { lat: lat * sinais[0], lng: lng * sinais[1] };
  if (Math.abs(pt.lat) > 90 || Math.abs(pt.lng) > 180) return null;
  return { ...pt, resolucao };
}

/** Gera o código — existe para o teste provar a volta, e para a aba mostrar. */
export function encodeCSquares(lat: number, lng: number, ciclos = 2): string {
  const q = lat >= 0 ? (lng >= 0 ? 1 : 7) : lng >= 0 ? 3 : 5;
  let rLat = Math.abs(lat);
  let rLng = Math.abs(lng);

  const dezLat = Math.floor(rLat / 10);
  const dezLng = Math.floor(rLng / 10);
  let saida = `${q}${dezLat}${String(dezLng).padStart(2, "0")}`;
  rLat -= dezLat * 10;
  rLng -= dezLng * 10;

  let resolucao = 10;
  for (let i = 0; i < ciclos; i++) {
    const meia = resolucao / 2;
    const norte = rLat >= meia;
    const leste = rLng >= meia;
    const quad = norte ? (leste ? 4 : 3) : leste ? 2 : 1;
    if (leste) rLng -= meia;
    if (norte) rLat -= meia;
    const passo = meia / 5;
    const dLat = Math.floor(rLat / passo);
    const dLng = Math.floor(rLng / passo);
    saida += `:${quad}${dLat}${dLng}`;
    rLat -= dLat * passo;
    rLng -= dLng * passo;
    resolucao = passo;
  }
  return saida;
}
