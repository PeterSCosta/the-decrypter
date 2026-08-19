/**
 * Parsers de formatos de coordenadas geográficas → { lat, lng } em graus
 * decimais (WGS84). Cobre os formatos mais comuns; `detectLocation` tenta todos
 * e devolve o primeiro que casar, com o nome do formato.
 */
import { getCellByCode, getCellByLocation } from "geohex";
import { ANCHORS, VALE_BBOX, inBBox, scopeLabel } from "./anchors";
import { cartaScaleLabel, decodeCartaIbge } from "./carta-ibge";
import { decodeCSquares } from "./csquares";
import { decodeGars, garsCellLabel } from "./gars";
import { decodeGeoUri, decodeIso6709, decodeOsmShortlink } from "./geo-uri";
import { decodeGeoref, decodeGeorefLocal } from "./georef";
import { decodeGeoTude } from "./geotude";
import { decodeGradeIbge, gradeCellLabel } from "./grade-ibge";
import { decodeMgrs, decodeMgrsLocal, mgrsPrecisionLabel } from "./mgrs";
import { placekeyParaH3 } from "./placekey";
import { decodePlusCodeLib, recoverPlusCodeLib } from "./plus-code";
import { utmToLatLng } from "./utm";

export interface GeoPoint {
  lat: number;
  lng: number;
}
export interface DetectedLocation extends GeoPoint {
  format: string;
  /**
   * O quanto a leitura merece confiança — e ela NÃO é a mesma em toda a
   * cascata.
   *
   * A ordem do `detectLocation` sempre soube disso (os frouxos vêm por último,
   * e o comentário diz o porquê), mas a nota emitida era 0,90 para todos. O
   * efeito medido: `1400M` saía como Geohash na Antártida com 0,90, acima de
   * uma estação geodésica REAL de Blumenau; e `g7rpj` saía na Islândia acima do
   * atalho local que a própria Ajuda documenta.
   *
   * Agora a nota acompanha o degrau:
   *   0,95  assinatura literal (prefixo, pontuação própria) — quase impossível
   *         ser outra coisa;
   *   0,90  forma própria (DD, MGRS, Plus Code cheio…);
   *   0,50  frouxos (Geohash e GeoTude aceitam quase todo alfanumérico curto).
   */
  confianca: number;
}

/** Os três degraus de confiança da cascata. Ver `DetectedLocation`. */
export const CONFIANCA = {
  literal: 0.95,
  forma: 0.9,
  atalho: 0.75,
  /**
   * Atalho de PORTÃO FRACO — hoje só a cauda de Geohash.
   *
   * Os outros atalhos exigem assinatura: o Plus Code tem o `+`, o MGRS e o
   * GEOREF exigem maiúscula e forma própria, o GeoHex é numérico com prefixo.
   * A cauda de Geohash é qualquer coisa de 4 a 8 caracteres alfanuméricos com
   * ao menos uma letra — e ela dispara em cima de código de OUTRO sistema:
   * medido, `MD2005` (um GEOREF legítimo) também sai como cauda de geohash em
   * −27,01/−48,98. A leitura fica, pela regra da casa, mas não pode empatar com
   * quem tem assinatura.
   *
   * 0,62 e não 0,50 porque o atalho AINDA se auto-valida (só emite dentro da
   * caixa do Vale) — evidência que o Geohash global não tem. Com os dois em
   * 0,50 dava empate e `g7rpj` voltava a sair na Islândia.
   */
  atalhoFraco: 0.62,
  frouxa: 0.5,
} as const;

function valid(lat: number, lng: number): GeoPoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// ---- DD: "-26.9906, -48.6356" --------------------------------------------
export function parseDD(raw: string): GeoPoint | null {
  const m = raw.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  return valid(Number(m[1]), Number(m[2]));
}

// ---- DMS / DDM: "26°59'26.2\"S 48°38'08.2\"W" / "26°59.436'S 48°38.136'W" --
function angleComponents(raw: string, withSeconds: boolean): GeoPoint | null {
  const re = withSeconds
    ? /(\d{1,3})\s*[°:\s]\s*(\d{1,2})\s*['′:\s]\s*([\d.]+)\s*["″]?\s*([NSEWnsew])/g
    : /(\d{1,3})\s*[°:\s]\s*([\d.]+)\s*['′]?\s*([NSEWnsew])/g;
  const found: { value: number; hemi: string }[] = [];
  for (const m of raw.matchAll(re)) {
    const deg = Number(m[1]);
    const min = Number(m[2]);
    const sec = withSeconds ? Number(m[3]) : 0;
    const hemi = (withSeconds ? m[4] : m[3]).toUpperCase();
    found.push({ value: deg + min / 60 + sec / 3600, hemi });
  }
  if (found.length < 2) return null;
  const lat = found.find((f) => f.hemi === "N" || f.hemi === "S");
  const lng = found.find((f) => f.hemi === "E" || f.hemi === "W");
  if (!lat || !lng) return null;
  return valid(
    lat.hemi === "S" ? -lat.value : lat.value,
    lng.hemi === "W" ? -lng.value : lng.value,
  );
}
export const parseDMS = (raw: string) => angleComponents(raw, true);
export const parseDDM = (raw: string) => angleComponents(raw, false);

// ---- Geohash --------------------------------------------------------------
const GEOHASH_B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
export function decodeGeohash(raw: string): GeoPoint | null {
  const h = raw.trim().toLowerCase();
  // exige >=4 chars válidos e ao menos 1 letra (p/ não confundir com Quadkey/CEP)
  if (h.length < 4 || !/[a-z]/.test(h) || ![...h].every((c) => GEOHASH_B32.includes(c)))
    return null;
  let even = true;
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  for (const c of h) {
    const idx = GEOHASH_B32.indexOf(c);
    for (let b = 4; b >= 0; b--) {
      const bit = (idx >> b) & 1;
      if (even) {
        const mid = (lngMin + lngMax) / 2;
        if (bit) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (bit) latMin = mid;
        else latMax = mid;
      }
      even = !even;
    }
  }
  return valid((latMin + latMax) / 2, (lngMin + lngMax) / 2);
}

// ---- Maidenhead grid locator ---------------------------------------------
export function decodeMaidenhead(raw: string): GeoPoint | null {
  const g = raw.trim();
  if (!/^[A-Ra-r]{2}\d{2}([A-Xa-x]{2}(\d{2})?)?$/.test(g)) return null;
  const U = g.toUpperCase();
  let lng = -180;
  let lat = -90;
  let lngSize = 20;
  let latSize = 10;
  lng += (U.charCodeAt(0) - 65) * lngSize;
  lat += (U.charCodeAt(1) - 65) * latSize;
  lngSize = 2;
  latSize = 1;
  lng += Number(U[2]) * lngSize;
  lat += Number(U[3]) * latSize;
  if (U.length >= 6) {
    lngSize = 5 / 60;
    latSize = 2.5 / 60;
    lng += (U.charCodeAt(4) - 65) * lngSize;
    lat += (U.charCodeAt(5) - 65) * latSize;
  }
  if (U.length >= 8) {
    lngSize = 5 / 600;
    latSize = 2.5 / 600;
    lng += Number(U[6]) * lngSize;
    lat += Number(U[7]) * latSize;
  }
  return valid(lat + latSize / 2, lng + lngSize / 2);
}

// ---- Plus Code (Open Location Code) — precisão de pares (~14 m) -----------
const OLC = "23456789CFGHJMPQRVWX";

/** Decoder offline (sem dependência), precisão de pares (~14 m). */
export function decodePlusCodeOffline(raw: string): GeoPoint | null {
  const s = raw.trim().toUpperCase();
  // Exige o separador "+" (sempre presente num Plus Code) p/ não confundir com
  // ISBN/outros números que só usem dígitos do alfabeto OLC (2–9).
  if (!/^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/.test(s)) return null;
  const c = s.replace("+", "");
  let lat = -90;
  let lng = -180;
  let latUnit = 20;
  let lngUnit = 20;
  for (let d = 0; d < 5 && 2 * d + 1 < c.length; d++) {
    lat += OLC.indexOf(c[2 * d]) * latUnit;
    lng += OLC.indexOf(c[2 * d + 1]) * lngUnit;
    if (d < 4) {
      latUnit /= 20;
      lngUnit /= 20;
    }
  }
  return valid(lat + latUnit / 2, lng + lngUnit / 2);
}

/**
 * Plus Code → coordenada. Offline primeiro (sem dependência); se ele recusar
 * (refinamento de grade, código mais longo), cai na lib oficial `open-location-code`.
 */
export function decodePlusCode(raw: string): GeoPoint | null {
  return decodePlusCodeOffline(raw) ?? decodePlusCodeLib(raw);
}

/**
 * O código está COMPLETO, ou é uma cauda lida como se fosse?
 *
 * ── POR QUE ISTO DECIDE UMA NOTA, E NÃO UM SIM/NÃO ──────────────────────────
 * `decodePlusCodeOffline` aceita de 4 a 8 caracteres antes do `+`. Um Plus Code
 * COMPLETO tem oito; com quatro, o que existe é a cauda, e decodificá-la como
 * se fosse completa joga o ponto onde a grade truncada calhar de cair.
 *
 * Medido: `38HQ+J3` sai em −58,3987 / −44,9488 — Atlântico Sul, 2.900 km de
 * Blumenau — enquanto a mesma cauda ancorada em Itajaí dá −26,9209 / −48,6623,
 * que é a resposta da prova gabaritada da ITC 2017.
 *
 * A regra da casa é que uma localização longe **continua válida** e não se
 * apaga. O que não pode é ela passar por evidência que não tem: ler cauda como
 * código inteiro é palpite, então cai para a camada frouxa, e a leitura
 * ancorada — que se auto-valida contra a caixa do Vale — fica em cima.
 */
export function plusCodeEhCompleto(raw: string): boolean {
  return /^[23456789CFGHJMPQRVWX]{8}\+/.test(raw.trim().toUpperCase());
}

// ---- UTM (inverso, WGS84): "22J 734643E 7012408N" ------------------------
/**
 * A conta mora em `utm.ts` porque o MGRS é a mesma projeção com outra grafia e
 * precisa dela sem importar este módulo de volta (ciclo).
 */
export function parseUTM(raw: string): GeoPoint | null {
  const m = raw
    .trim()
    .match(/^(\d{1,2})\s*([C-HJ-NP-Xc-hj-np-x])\s+(\d{3,7})\s*E?\s+(\d{3,8})\s*N?$/);
  if (!m) return null;
  const band = m[2].toUpperCase();
  const pt = utmToLatLng(Number(m[1]), band >= "N", Number(m[3]), Number(m[4]));
  return pt ? valid(pt.lat, pt.lng) : null;
}

// ---- Quadkey (Bing tile) → centro do tile --------------------------------
export function decodeQuadkey(raw: string): GeoPoint | null {
  const q = raw.trim();
  // min. 12 (zoom 12) p/ evitar falsos positivos com NCM/CEP que só tenham 0–3.
  if (!/^[0-3]{12,23}$/.test(q)) return null;
  const zoom = q.length;
  let tileX = 0;
  let tileY = 0;
  for (const ch of q) {
    tileX <<= 1;
    tileY <<= 1;
    const d = Number(ch);
    if (d & 1) tileX |= 1;
    if (d & 2) tileY |= 1;
  }
  const n = 2 ** zoom;
  const lng = ((tileX + 0.5) / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (tileY + 0.5)) / n)));
  return valid((latRad * 180) / Math.PI, lng);
}

// ---- H3 (índice hexagonal da Uber) — "8928308280fffff" -------------------

/**
 * O `h3-js` é uma compilação Emscripten da libh3: **87 KB gzip**, mais de um
 * quarto do chunk de entrada — carregado por toda sessão para atender um formato
 * que quase ninguém cola. Fica sob demanda.
 *
 * `detectLocation` é síncrono (os decoders exigem isso), então o parser não pode
 * esperar: quando a entrada tem cara de H3 e a lib ainda não chegou, ele dispara
 * a carga e devolve `null`. Quem observa `aoCarregarH3` refaz a rodada — é o
 * mesmo trato que os datasets já têm com o fan-out.
 */
type H3Api = { cellToLatLng: (h: string) => number[]; isValidCell: (h: string) => boolean };
let h3: H3Api | null = null;
let h3Carregando: Promise<void> | null = null;
const ouvintesH3 = new Set<() => void>();

/** Formato bruto de um índice H3 — pré-filtro barato antes de tocar na lib. */
const FORMA_H3 = /^[0-9a-f]{15,16}$/;

function carregarH3(): Promise<void> {
  if (h3) return Promise.resolve();
  if (!h3Carregando) {
    h3Carregando = import("h3-js")
      .then((m) => {
        h3 = { cellToLatLng: m.cellToLatLng, isValidCell: m.isValidCell };
        for (const cb of ouvintesH3) cb();
      })
      .catch(() => {
        h3Carregando = null; // não memoiza falha: a próxima entrada tenta de novo
      });
  }
  return h3Carregando;
}

/** Avisa quando a lib do H3 chega, para quem precisa refazer a detecção. */
export function aoCarregarH3(cb: () => void): () => void {
  ouvintesH3.add(cb);
  return () => {
    ouvintesH3.delete(cb);
  };
}

/**
 * Garante as libs sob demanda que `raw` vai precisar. Para quem **pode** esperar
 * (a Triangulação resolve em `async`), evita perder o H3 na primeira tentativa.
 */
export async function prepararDeteccao(raw: string): Promise<void> {
  const t = raw.trim();
  // O Placekey também precisa do H3 — ele É um H3, escrito de outro jeito. Sem
  // este ramo, colar um Placekey devolvia "não reconheci" na primeira vez e só
  // funcionava na tecla seguinte.
  if (FORMA_H3.test(t.toLowerCase()) || placekeyParaH3(t) !== null) await carregarH3();
}

export function parseH3(raw: string): GeoPoint | null {
  const h = raw.trim().toLowerCase();
  if (!FORMA_H3.test(h)) return null;
  if (!h3) {
    carregarH3(); // chega no próximo passe
    return null;
  }
  if (!h3.isValidCell(h)) return null;
  try {
    const [lat, lng] = h3.cellToLatLng(h);
    return valid(lat, lng);
  } catch {
    return null;
  }
}

// ---- GeoHex (geohex.net, @sa2da) — "Nb11458750330" -----------------------

/** Decodifica um código GeoHex (2 letras + dígitos) validando por ida-e-volta. */
function decodeGeohexCode(code: string): GeoPoint | null {
  try {
    const cell = getCellByCode(code);
    if (!Number.isFinite(cell.lat) || !Number.isFinite(cell.lon)) return null;
    // o centro da célula tem que re-codificar exatamente no mesmo código (canônico)
    if (getCellByLocation(cell.lat, cell.lon, code.length - 2).code !== code) return null;
    return valid(cell.lat, cell.lon);
  } catch {
    return null;
  }
}

/** Código GeoHex completo: 2 letras + dígitos (ex.: "Nb11458750330"). */
export function parseGeoHex(raw: string): GeoPoint | null {
  const s = raw.trim();
  if (!/^[A-Za-z]{2}\d{2,}$/.test(s)) return null;
  return decodeGeohexCode(s);
}

/**
 * Atalho do Vale do Itajaí: os códigos GeoHex de Blumenau E Itajaí começam com
 * "Nb" (prefixo regional comum). Um número puro pode ser só a "cauda" — tenta
 * "Nb" + número e só aceita se cair dentro da caixa do Vale (qualquer das duas
 * cidades). Mantém o nome `parseGeoHexBlumenau` por compatibilidade.
 */
export function parseGeoHexBlumenau(raw: string): GeoPoint | null {
  const s = raw.trim();
  if (!/^\d{4,}$/.test(s)) return null;
  const pt = decodeGeohexCode(`Nb${s}`);
  if (!pt) return null;
  return inBBox(pt, VALE_BBOX) ? pt : null;
}

// ---- Atalhos de cauda local (Plus Code curto, Geohash) -------------------
export interface LocalGeoHit extends GeoPoint {
  /** Cidade-âncora assumida ("Blumenau" / "Itajaí"). */
  anchor: string;
  /** Código completo reconstruído com o prefixo local. */
  full: string;
}

/**
 * Plus Code CURTO (sem o "area code" de 4 chars, ex.: "3WJM+6H"): reconstrói
 * antepondo o prefixo de Blumenau ("585G") ou Itajaí ("585H") e aceita o que
 * cair dentro da cidade. É a recuperação por âncora que o OLC.recoverNearest faz.
 */
export function decodePlusCodeLocal(raw: string): LocalGeoHit | null {
  const s = raw.trim().toUpperCase();
  // 1) Caso comum (4 chars antes do "+"): atalho por âncora, offline.
  if (/^[23456789CFGHJMPQRVWX]{4}\+[23456789CFGHJMPQRVWX]{2,3}$/.test(s)) {
    for (const a of ANCHORS) {
      const full = a.plusPrefix + s;
      const pt = decodePlusCode(full);
      if (pt && inBBox(pt, a.bbox)) return { ...pt, anchor: a.name, full };
    }
  }
  // 2) Fallback: recoverNearest oficial perto de cada cidade (cobre outros curtos).
  for (const a of ANCHORS) {
    const r = recoverPlusCodeLib(s, a.lat, a.lng);
    if (r && inBBox(r, a.bbox)) return { lat: r.lat, lng: r.lng, anchor: a.name, full: r.full };
  }
  return null;
}

/**
 * Cauda de Geohash (ex.: "g7rpj"): antepõe o prefixo da cidade ("6gjn" Blumenau
 * / "6gjq" Itajaí) e aceita o que cair dentro dela. Auto-validante: só passa a
 * cauda que de fato cai na caixa da cidade.
 */
export function decodeGeohashLocal(raw: string): LocalGeoHit | null {
  const s = raw.trim().toLowerCase();
  // exige ≥1 letra (lookahead) p/ não colidir com entradas puramente numéricas
  // (CEP, NCM, códigos de rua, etc.), que são as colisões mais comuns.
  if (!/^(?=.*[bcdefghjkmnpqrstuvwxyz])[0-9bcdefghjkmnpqrstuvwxyz]{4,8}$/.test(s)) return null;
  for (const a of ANCHORS) {
    const full = a.geohashCity + s;
    const pt = decodeGeohash(full);
    if (pt && inBBox(pt, a.bbox)) return { ...pt, anchor: a.name, full };
  }
  return null;
}

/**
 * Mapcode (mapcode.com): a DETECÇÃO é síncrona e barata (só a forma), mas a
 * coordenada é assíncrona — um mapcode local não decodifica sem território e a
 * lib que resolve isso pesa mais que o bundle inteiro, então entra por
 * `import()` dinâmico. Mesmo arranjo do what3words: aqui só se reconhece,
 * `resolveMapcode` é que resolve.
 */
export { detectMapcode, resolveMapcode } from "./mapcode";
export type { DetectedMapcode, MapcodeResolution, MapcodeScope } from "./mapcode";

/**
 * Os geocódigos de grade militar/oficial moram em arquivo próprio (cada um tem
 * sua aritmética), mas saem por aqui: `formats.ts` continua sendo a porta única
 * de quem só quer "código → coordenada".
 */
export { decodeMgrs, decodeMgrsLocal, parseMgrs } from "./mgrs";
export { decodeGeoref, decodeGeorefLocal, parseGeoref } from "./georef";
export { decodeGars, parseGars } from "./gars";
export { decodeCartaIbge, parseCartaIbge } from "./carta-ibge";
export { albersToLatLng, decodeGradeIbge, latLngToAlbers, parseGradeIbge } from "./grade-ibge";
export { utmToLatLng } from "./utm";

/**
 * Endereço what3words: 3 palavras separadas por ponto, com "///" opcional
 * (ex.: "filled.count.soap"). Resolução em coordenada é assíncrona (API).
 */
export function detectWhat3Words(raw: string): string | null {
  const m = raw.trim().match(/^(?:\/{3})?\s*(\p{L}{2,}\.\p{L}{2,}\.\p{L}{2,})$/u);
  return m ? m[1].toLowerCase() : null;
}

// ---- Detecção -------------------------------------------------------------

/** Nomeia a folha/célula junto do formato: "MGRS/USNG · 1 m". */
const withDetail = (format: string, detail: string) => `${format} · ${detail}`;

/**
 * Formatos com identificador próprio (grade e carta), avaliados antes da lista
 * genérica porque o rótulo carrega a escala/tamanho da célula — o código nomeia
 * uma ÁREA, e esconder isso faria o card parecer mais preciso do que é.
 */
function detectNamedGrid(input: string): DetectedLocation | null {
  // ── Prefixo literal primeiro ────────────────────────────────────────────
  // Geo URI, ISO 6709 e link do OSM têm assinatura de PREFIXO, que é a única
  // espécie imune ao Geohash frouxo lá no fim da cascata. E o Geo URI precisa
  // vir antes do `parseDD`: os números dele são um par de graus decimais
  // legítimo, e o DD engoliria a leitura perdendo a incerteza.
  const uri = decodeGeoUri(input);
  if (uri) {
    return {
      lat: uri.lat,
      lng: uri.lng,
      format: uri.incerteza
        ? withDetail("Geo URI", `precisão declarada de ${uri.incerteza} m`)
        : "Geo URI",
      confianca: CONFIANCA.literal,
    };
  }
  const iso = decodeIso6709(input);
  if (iso) {
    return {
      lat: iso.lat,
      lng: iso.lng,
      format:
        iso.altitude != null ? withDetail("ISO 6709", `altitude ${iso.altitude} m`) : "ISO 6709",
      confianca: CONFIANCA.literal,
    };
  }
  const osm = decodeOsmShortlink(input);
  if (osm) {
    return {
      lat: osm.lat,
      lng: osm.lng,
      format: withDetail("Link do OSM", `zoom ${osm.zoom}`),
      confianca: CONFIANCA.literal,
    };
  }
  // Placekey: o `@` é a assinatura, e o "Onde" vira um hexágono H3 — que a lib
  // já carregada resolve. Sem o `@`, os três trios colidiriam com ID de vídeo.
  const pk = placekeyParaH3(input);
  if (pk) {
    // `parseH3` dispara o carregamento da lib quando ela ainda não chegou e
    // devolve null nesse passe — o ouvinte `aoCarregarH3` refaz a detecção.
    const pt = parseH3(pk);
    if (pt) return { ...pt, format: "Placekey", confianca: CONFIANCA.literal };
  }
  const cs = decodeCSquares(input);
  if (cs) {
    return {
      lat: cs.lat,
      lng: cs.lng,
      format: withDetail("C-squares", `célula de ${cs.resolucao}°`),
      confianca: CONFIANCA.literal,
    };
  }

  const grade = decodeGradeIbge(input);
  if (grade) {
    return {
      lat: grade.lat,
      lng: grade.lng,
      format: withDetail("Grade estatística IBGE", `célula de ${gradeCellLabel(grade.cell)}`),
      confianca: CONFIANCA.literal,
    };
  }
  const carta = decodeCartaIbge(input);
  if (carta) {
    return {
      lat: carta.lat,
      lng: carta.lng,
      format: withDetail("Carta IBGE/DSG", cartaScaleLabel(carta.scale)),
      /**
       * ── A NOTA SEGUE O TAMANHO DA FOLHA ─────────────────────────────────
       * O nível ao milionésimo entrou hoje, e com ele um vizinho incômodo:
       * `SC-22` é nomenclatura CIM legítima (S + faixa C, fuso 22) **e** é a
       * sigla rodoviária de Santa Catarina, o estado desta bancada. Medido:
       * `SC-22` saía como carta em −10 / −51 com 0,95 — a nota máxima — e o
       * mesmo vale para `SA-22`, `SB-20`, `SD-20`, `SE-25`, `SF-23`…
       *
       * Não se apaga a leitura: pela regra da casa, localização longe continua
       * válida. O que não se sustenta é a NOTA. Uma folha de 4°×6° tem ~440 por
       * 600 km — ela nomeia uma região do tamanho de um estado, não um lugar.
       * Chamar isso de assinatura literal, no mesmo degrau de uma quadrícula de
       * 7,5′, é o ranking exagerando.
       *
       * Do 1:500.000 para baixo a sequência de vocabulários fechados
       * (V/X/Y/Z → A/D → I..VI → 1..4 → NO/NE/SO/SE) torna o falso positivo
       * quase impossível, e ali a nota literal continua certa.
       */
      confianca: carta.scale >= 1_000_000 ? CONFIANCA.frouxa : CONFIANCA.literal,
    };
  }
  return null;
}

/**
 * Todas as leituras que a entrada admite, da mais confiável para a menos.
 *
 * ── POR QUE UMA LISTA, E NÃO A PRIMEIRA QUE CASAR ───────────────────────────
 * A cascata sempre soube ordenar, mas ela PARAVA no primeiro acerto — e isso
 * escondia leitura verdadeira. Medido: `g7rpj` é ao mesmo tempo um Geohash
 * global (Islândia) e a cauda de um Geohash daqui (`6gjng7rpj`, Blumenau); a
 * bancada mostrava só o primeiro que a ordem alcançasse, e a outra resposta
 * simplesmente não existia para quem estava olhando.
 *
 * A regra desta casa: **se existe uma localização, mesmo longe, ela é válida.**
 * Um código de outra parte do mundo não é erro — é a leitura que aquele
 * sistema dá. O que não pode acontecer é a leitura de perto ficar de fora, ou
 * ficar abaixo de uma leitura mais frouxa. Por isso a lista sai ORDENADA pela
 * camada de confiança, e não pela ordem em que a cascata tentou.
 *
 * ── OS DOIS ATALHOS QUE FALTAVAM ────────────────────────────────────────────
 * Plus Code curto e cauda de Geohash já existiam (`decodePlusCodeLocal`,
 * `decodeGeohashLocal`) mas só o decoder `local-geocode` os consumia — quem
 * chamava `detectLocation`, como a aba Geolocalização, nunca os via. Resultado
 * medido: `38HQ+J3` respondia −58,40/−44,95 (Atlântico Sul, 2.900 km fora) com
 * a nota MAIS ALTA da cascata, enquanto a ficha ao lado, na mesma tela,
 * prometia que a bancada completava o prefixo da cidade. Agora as duas
 * leituras saem, com a de Blumenau em cima.
 */
export function detectLocations(raw: string): DetectedLocation[] {
  const input = raw.trim();
  if (!input) return [];

  const saida: DetectedLocation[] = [];
  const juntar = (format: string, pt: GeoPoint | null, confianca: number) => {
    if (pt) saida.push({ ...pt, format, confianca });
  };

  // Prefixo literal / hífens: assinatura própria, não disputa com nada.
  const named = detectNamedGrid(input);
  if (named) saida.push(named);

  const mgrs = decodeMgrs(input);
  const gars = decodeGars(input);
  const georef = decodeGeoref(input);

  const attempts: [string, GeoPoint | null][] = [
    ["Graus decimais (DD)", parseDD(input)],
    ["DMS", parseDMS(input)],
    ["Graus e minutos (DDM)", parseDDM(input)],
    ["UTM", parseUTM(input)],
    [mgrs ? withDetail("MGRS/USNG", mgrsPrecisionLabel(mgrs.parts.digits)) : "MGRS/USNG", mgrs],
    ["Maidenhead", decodeMaidenhead(input)],
    ["GEOREF", georef],
    [gars ? withDetail("GARS", `célula de ${garsCellLabel(gars.cell)}`) : "GARS", gars],
    ["Quadkey", decodeQuadkey(input)],
    ["H3", parseH3(input)],
    ["GeoHex", parseGeoHex(input)],
  ];
  for (const [format, pt] of attempts) juntar(format, pt, CONFIANCA.forma);

  // O Plus Code fica fora da lista acima porque a nota dele depende do
  // COMPRIMENTO, não do formato: oito caracteres antes do `+` são um código
  // inteiro e valem forma própria; quatro são cauda lida como inteiro, e isso
  // é palpite (ver `plusCodeEhCompleto`).
  juntar(
    "Plus Code",
    decodePlusCode(input),
    plusCodeEhCompleto(input) ? CONFIANCA.forma : CONFIANCA.frouxa,
  );

  // ---- Atalhos de cauda local (o prefixo da cidade fica subentendido) -----
  // Todos se AUTO-VALIDAM: só emitem se o ponto reconstruído cair na caixa do
  // Vale. É essa auto-validação que os põe acima do Geohash global frouxo —
  // eles carregam evidência que o frouxo não tem.
  // Nem todos os atalhos devolvem o código reconstruído: MGRS, GEOREF e GeoHex
  // devolvem só o ponto. Por isso o tipo é o par com `full` OPCIONAL, e o
  // rótulo só cita a cauda quando ela existe.
  const local: [string, (GeoPoint & Partial<LocalGeoHit>) | null, number][] = [
    ["GeoHex", parseGeoHexBlumenau(input), CONFIANCA.atalho],
    ["MGRS/USNG", decodeMgrsLocal(input), CONFIANCA.atalho],
    ["GEOREF", decodeGeorefLocal(input), CONFIANCA.atalho],
    ["Plus Code", decodePlusCodeLocal(input), CONFIANCA.atalho],
    // A cauda de geohash tem o portão mais fraco da lista — ver `atalhoFraco`.
    ["Geohash", decodeGeohashLocal(input), CONFIANCA.atalhoFraco],
  ];
  for (const [format, pt, confianca] of local) {
    if (pt) {
      const cidade = scopeLabel(pt) ?? "Vale do Itajaí";
      saida.push({
        lat: pt.lat,
        lng: pt.lng,
        // "assumindo" está no rótulo de propósito: é SUPOSIÇÃO de prefixo, não
        // leitura inequívoca, e quem lê o card precisa saber disso sem abrir a
        // Ajuda. A palavra vem do decoder `local-geocode`, que dizia isso e foi
        // absorvido aqui.
        format: pt.full
          ? `${format} · cauda de ${pt.full}, assumindo ${cidade}`
          : `${format} · assumindo ${cidade}`,
        confianca,
      });
    }
  }

  // Os mais frouxos por último: o Geohash aceita quase todo alfanumérico curto,
  // e o GeoTude, todo decimal pontuado.
  juntar("Geohash", decodeGeohash(input), CONFIANCA.frouxa);
  juntar("GeoTude", decodeGeoTude(input), CONFIANCA.frouxa);

  // Duas leituras no MESMO ponto e do mesmo sistema são a mesma resposta dita
  // duas vezes — o atalho local e o código cheio caem aqui quando a pessoa
  // digita o código inteiro.
  const vistas = new Set<string>();
  const unicas = saida.filter((d) => {
    const chave = `${d.format.split(" (")[0]}|${d.lat.toFixed(5)}|${d.lng.toFixed(5)}`;
    if (vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });

  // `sort` é estável no JS moderno, então dentro da mesma camada a ordem da
  // cascata é preservada — e ela carrega a razão de MGRS vir antes de Geohash.
  return unicas.sort((a, b) => (b.confianca ?? 0) - (a.confianca ?? 0));
}

/** A melhor leitura. Existe porque quase todo chamador quer uma só. */
export function detectLocation(raw: string): DetectedLocation | null {
  return detectLocations(raw)[0] ?? null;
}
