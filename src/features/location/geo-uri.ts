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
 * Geo URI (RFC 5870), ISO 6709 e o atalho do OpenStreetMap.
 *
 * Três formatos que a bancada não lia e que são, dos sete levantados, os que
 * uma pessoa de fato COLA: o Geo URI é o que sai de QR de local e do botão
 * "abrir no mapa" do Android; o ISO 6709 é o que está no EXIF e no XMP de uma
 * foto; e o link do OSM é o que sai quando alguém compartilha um ponto.
 *
 * Os três têm assinatura de PREFIXO LITERAL, que é a única espécie imune ao
 * Geohash frouxo lá no fim do `detectLocation` — por isso entram cedo na
 * cascata, junto com as grades nomeadas.
 */

const valido = (lat: number, lng: number): GeoPoint | null =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180
    ? { lat, lng }
    : null;

/**
 * `geo:-26.9194,-49.0661;u=35` → ponto (e a incerteza, quando vem).
 *
 * A RFC permite um terceiro número (altitude) e parâmetros depois de `;`. O
 * `u=` é a incerteza em METROS, e ela é informação de prova: "u=35" quer dizer
 * que o aparelho não sabia onde estava com mais precisão que isso.
 */
export function decodeGeoUri(raw: string): (GeoPoint & { incerteza?: number }) | null {
  const m = raw.trim().match(/^geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(.*)$/i);
  if (!m) return null;
  const pt = valido(Number(m[1]), Number(m[2]));
  if (!pt) return null;
  const u = m[3].match(/[;&]\s*u\s*=\s*(\d+(?:\.\d+)?)/i);
  return u ? { ...pt, incerteza: Number(u[1]) } : pt;
}

/**
 * ISO 6709 na forma canônica: `-26.9194-049.0661/`.
 *
 * ── O QUE O SEPARA DE UM PAR DE NÚMEROS QUALQUER ────────────────────────────
 * Três coisas ao mesmo tempo, e é a combinação que dá a assinatura:
 *  1. **sinal obrigatório nos dois** — nunca `26.91`, sempre `+` ou `-`;
 *  2. **longitude com três dígitos de grau** (`-049`, não `-49`);
 *  3. **barra no fim**.
 * O DD comum não tem nenhuma das três, então não há disputa entre eles.
 *
 * A altitude vem como um terceiro campo com sinal, antes da barra, e pode
 * carregar `CRSwgs_84` no meio — o formato do EXIF costuma trazer isso.
 */
export function decodeIso6709(raw: string): (GeoPoint & { altitude?: number }) | null {
  const t = raw.trim();
  // Graus decimais (a forma que aparece em metadado). As variantes em
  // grau-minuto-segundo do padrão ficam de fora: quem escreve DMS no mundo real
  // usa `°`, e isso o `parseDMS` já lê.
  const m = t.match(
    /^([+-]\d{2}(?:\.\d+)?)([+-]\d{3}(?:\.\d+)?)([+-]\d+(?:\.\d+)?)?(?:CRS[\w_]+)?\/$/i,
  );
  if (!m) return null;
  const pt = valido(Number(m[1]), Number(m[2]));
  if (!pt) return null;
  return m[3] ? { ...pt, altitude: Number(m[3]) } : pt;
}

/**
 * Link curto do OpenStreetMap: `osm.org/go/M_NHnvWM`.
 *
 * ── COMO ELE FUNCIONA ───────────────────────────────────────────────────────
 * É o par lat/lng entrelaçado bit a bit (ordem de Morton, o mesmo "zigue-zague"
 * do quadkey) e escrito num base64 PRÓPRIO — o alfabeto termina em `_` e `~`,
 * não em `+` e `/`. Cada caractere carrega 3 bits de cada eixo. Os `-` no fim
 * não são enchimento: cada um subtrai um nível de zoom.
 *
 * ── POR QUE EXIGIR O PREFIXO ────────────────────────────────────────────────
 * `M_NHnvWM` sozinho é oito caracteres alfanuméricos — a forma de metade do
 * mundo. Exigir `osm.org/go/` (ou `openstreetmap.org/go/`) é o que transforma
 * isto numa assinatura em vez de num gerador de ruído.
 */
const OSM_ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_~";

export function decodeOsmShortlink(raw: string): (GeoPoint & { zoom: number }) | null {
  const m = raw.trim().match(/(?:osm\.org|openstreetmap\.org)\/go\/([A-Za-z0-9_~@]+)(-*)/i);
  if (!m) return null;

  const codigo = m[1];
  let x = 0;
  let y = 0;
  let bits = 0;
  for (const ch of codigo) {
    const v = OSM_ALFABETO.indexOf(ch);
    if (v < 0) return null;
    // Cada caractere traz 6 bits: 3 pares (x,y), do mais significativo ao menos.
    for (let i = 0; i < 3; i++) {
      const par = (v >> (4 - 2 * i)) & 3;
      x = (x << 1) | ((par >> 1) & 1);
      y = (y << 1) | (par & 1);
      bits++;
    }
  }
  if (bits === 0) return null;

  // Os bits acumulados descrevem uma célula; o ponto é o CANTO da célula, que é
  // o que o próprio OSM usa ao abrir o link.
  const lng = (x / 2 ** bits) * 360 - 180;
  const lat = (y / 2 ** bits) * 180 - 90;
  const pt = valido(lat, lng);
  if (!pt) return null;
  // ── O ZOOM É A PARTE QUE QUASE SAIU ERRADA ────────────────────────────────
  // O encoder do OSM faz `len = ceil((z+8)/3)` e acrescenta `(z+8)%3` hífens. O
  // `ceil` PERDE informação: um mesmo comprimento serve a três zooms, e são os
  // hífens que desempatam. Inverter ingenuamente (`3*len - 8 - hífens`) devolve
  // 8 onde o exemplo publicado diz 9 — conferido contra os zooms 0..19.
  const hifens = m[2].length;
  return { ...pt, zoom: Math.max(0, codigo.length * 3 - ((3 - hifens) % 3) - 8) };
}
