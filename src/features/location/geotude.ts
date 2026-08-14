/**
 * GeoTude / "GeoCoding ###" (geotude.com) — o 6º geocódigo da GIA-2026, usado na
 * prova 27 (*Engenheiro Foragido*). Apesar de vir de um site, o esquema é
 * aritmética pura: uma grade decimal aninhada, decodificável offline.
 *
 * Forma: `ÍNDICE.pp.pp.…`, com o índice de 4–6 dígitos e pares de dois dígitos.
 *  - do índice N vem a célula de 1°: `A = ⌊N/500⌋`, `B = N mod 500`;
 *    `lat0 = 110 − A` (borda norte) e `lng0 = B − 180` (borda oeste);
 *  - cada par seguinte refina a célula em 10×10: o 1º dígito desce a latitude,
 *    o 2º avança a longitude, um decimal por par.
 *
 * O serviço devolve o CANTO da célula, não o centro — por isso, ao contrário de
 * `decodeMaidenhead`/`decodePlusCode`, aqui não se soma meia célula.
 *
 * Procedência: engenharia reversa sobre amostras conferidas contra a API pública
 * do serviço, não especificação publicada. O teste colocado é o contrato: se o
 * serviço mudar o esquema, ele quebra antes do usuário.
 */
import type { GeoPoint } from "./formats";

const GEOTUDE_RE = /^(\d{4,6})((?:\.\d{2})+)$/;

/** Arredonda ao mesmo número de casas que o código carrega — some o pó do float. */
const roundTo = (value: number, places: number): number =>
  Number(value.toFixed(Math.min(places, 12)));

/** Código GeoTude → canto noroeste da célula. `null` quando não é um código. */
export function decodeGeoTude(raw: string): GeoPoint | null {
  const m = raw.trim().match(GEOTUDE_RE);
  if (!m) return null;
  const pairs = m[2].slice(1).split(".");
  // Um par sozinho não se distingue de um decimal comum ("15586.77" é preço, não
  // lugar) e daria 0,1° (~11 km) de precisão — nem o serviço emite código assim.
  if (pairs.length < 2) return null;

  const index = Number(m[1]);
  const lat0 = 110 - Math.floor(index / 500);
  const lng0 = (index % 500) - 180;

  let latFrac = 0;
  let lngFrac = 0;
  for (let i = 0; i < pairs.length; i++) {
    const unit = 10 ** -(i + 1);
    latFrac += Number(pairs[i][0]) * unit;
    lngFrac += Number(pairs[i][1]) * unit;
  }

  const lat = roundTo(lat0 - latFrac, pairs.length);
  const lng = roundTo(lng0 + lngFrac, pairs.length);
  // A faixa é o portão que descarta as colisões restantes: toda data "AAAA.MM.DD"
  // cai aqui (ano de 4 dígitos ⇒ lat0 entre 91 e 108).
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
