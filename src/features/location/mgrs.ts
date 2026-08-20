/**
 * MGRS / USNG — a forma alfanumérica da UTM.
 *
 * `22J FR 92030 21024` = fuso 22, banda de latitude J, quadrado de 100 km "FR",
 * easting 92030 e northing 21024 dentro dele. É o que está impresso nas cartas
 * topográficas do Exército/DSG, e o USNG americano é o mesmo esquema com outro
 * nome. Decodificar é montar o easting/northing completos e cair no inverso da
 * UTM (`utm.ts`) — daí a coordenada sair idêntica à do formato UTM já suportado.
 *
 * Convenção: devolve o CENTRO da célula (como `decodeMaidenhead` e
 * `decodePlusCode`, ao contrário do GeoTude). Um `22JFR92` (2 dígitos) é uma
 * célula de 10 km e apontar o canto seria 7 km fora do que a pessoa quis dizer.
 *
 * Verificado contra duas implementações independentes: o GeoConvert do
 * GeographicLib e o pacote npm `mgrs` devolvem "22JFR9203021024" para
 * -26.9194,-49.0661 (Blumenau), nas 6 precisões.
 */
import { type BBox, VALE_BBOX, ZONA_UTM_DO_VALE, inBBox } from "./anchors";
import type { GeoPoint } from "./formats";
import { utmToLatLng } from "./utm";

/** Bandas de latitude, 8° cada a partir de -80 (X tem 12°). Sem I e O. */
const BANDS = "CDEFGHJKLMNPQRSTUVWX";
/** Colunas de 100 km: o alfabeto reinicia a cada 3 fusos. */
const COL_SETS = ["ABCDEFGH", "JKLMNPQR", "STUVWXYZ"];
/** Linhas de 100 km: 20 letras (sem I e O), ciclo de 2.000 km. */
const ROWS = "ABCDEFGHJKLMNPQRSTUV";

/**
 * Gate. Maiúsculas obrigatórias (MGRS se escreve assim) — é o que impede o
 * decoder de sequestrar um Geohash, que é lexicalmente compatível e se escreve
 * em minúsculas. Espaços entre os grupos são tolerados.
 */
const MGRS_RE = /^(\d{1,2})([C-HJ-NP-X])([A-HJ-NP-Z])([A-HJ-NP-V])(\d{2,10})$/;

export interface MgrsParts {
  zone: number;
  band: string;
  square: string;
  /** Dígitos por eixo (1 = 10 km … 5 = 1 m). */
  digits: number;
}

/** Faixa de latitude coberta pela banda (a X vai até 84°, não 88°). */
function bandRange(band: string): [number, number] | null {
  const i = BANDS.indexOf(band);
  if (i < 0) return null;
  const min = -80 + i * 8;
  return [min, band === "X" ? 84 : min + 8];
}

export interface MgrsHit extends GeoPoint {
  parts: MgrsParts;
}

/**
 * MGRS/USNG → centro da célula. `null` quando não é um código (ou quando o
 * quadrado de 100 km não existe naquele fuso — checagem barata que descarta
 * quase todo falso positivo).
 */
export function decodeMgrs(raw: string): MgrsHit | null {
  const s = raw.trim().replace(/\s+/g, "");
  const m = s.match(MGRS_RE);
  if (!m) return null;

  const zone = Number(m[1]);
  if (zone < 1 || zone > 60) return null;
  const band = m[2];
  const range = bandRange(band);
  if (!range) return null;

  // A coluna só é válida no terço de fusos a que pertence: filtro de 1/3 que
  // sozinho já derruba a maior parte do ruído alfanumérico.
  const col = COL_SETS[(zone - 1) % 3].indexOf(m[3]);
  const row = ROWS.indexOf(m[4]);
  if (col < 0 || row < 0) return null;

  const digits = m[5];
  // Número ímpar de dígitos não parte ao meio: não é MGRS.
  if (digits.length % 2 !== 0) return null;
  const d = digits.length / 2;
  const step = 10 ** (5 - d);
  const easting = (col + 1) * 100000 + Number(digits.slice(0, d)) * step + step / 2;

  // Linha 0 do fuso PAR começa 500 km acima — é a pegadinha aritmética do MGRS.
  const rowIndex = (((row - (zone % 2 === 0 ? 5 : 0)) % 20) + 20) % 20;
  const cell = rowIndex * 100000 + Number(digits.slice(d)) * step + step / 2;

  // A letra de linha se repete a cada 2.000 km: a banda de latitude é que diz
  // QUAL das repetições. Testa cada uma e fica com a que cai dentro da banda.
  const isNorth = band >= "N";
  for (let k = 0; k * 2000000 + cell <= 10000000; k++) {
    const pt = utmToLatLng(zone, isNorth, easting, cell + k * 2000000);
    if (!pt) continue;
    // Folga de 0,5° absorve o arredondamento de uma célula grossa na borda da
    // banda; as repetições distam ~18°, então continua sem ambiguidade.
    if (pt.lat >= range[0] - 0.5 && pt.lat <= range[1] + 0.5) {
      return { ...pt, parts: { zone, band, square: m[3] + m[4], digits: d } };
    }
  }
  return null;
}

/** Só a coordenada, para encaixar em `detectLocation`. */
export const parseMgrs = (raw: string): GeoPoint | null => {
  const hit = decodeMgrs(raw);
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
};

/** Rótulo de precisão pela contagem de dígitos por eixo. */
export function mgrsPrecisionLabel(digits: number): string {
  return ["10 km", "1 km", "100 m", "10 m", "1 m"][digits - 1] ?? "";
}

/**
 * Atalho de cauda do Vale do Itajaí: Blumenau e Itajaí estão inteiras no fuso
 * "22J" (medido: 5.268/5.268 dos CEPs com coordenada das duas cidades), então
 * um código sem o "22J" — "FR9203021024" — se completa sozinho. Só passa se o
 * ponto cair na caixa do Vale, que é o que torna o atalho auto-validante.
 */
export function decodeMgrsLocal(raw: string, bbox: BBox = VALE_BBOX): GeoPoint | null {
  const s = raw.trim().replace(/\s+/g, "");
  if (!/^[A-HJ-NP-Z][A-HJ-NP-V]\d{2,10}$/.test(s)) return null;
  const pt = parseMgrs(`${ZONA_UTM_DO_VALE}${s}`);
  return pt && inBBox(pt, bbox) ? pt : null;
}
