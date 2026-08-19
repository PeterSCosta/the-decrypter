/**
 * Âncoras locais de Blumenau e Itajaí. Para cada sistema de geocódigo, guarda o
 * prefixo/faixa fixo da cidade — a base dos "atalhos de cauda" (como o "Nb" do
 * GeoHex): um código parcial é auto-completado assumindo o prefixo local.
 *
 * Prefixos VERIFICADOS rodando encoders reais contra as coordenadas-âncora
 * (centro de cada cidade). Fonte única — não duplicar bbox/prefixo por aí.
 */

export interface BBox {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export const inBBox = (p: { lat: number; lng: number }, b: BBox): boolean =>
  p.lat >= b.latMin && p.lat <= b.latMax && p.lng >= b.lonMin && p.lng <= b.lonMax;

export const BRAZIL_BBOX: BBox = { latMin: -33.77, latMax: 5.27, lonMin: -73.99, lonMax: -28.84 };

export interface LocalAnchor {
  /** Nome legível da cidade. */
  name: string;
  /** Centro aproximado (WGS84). */
  lat: number;
  lng: number;
  /** Caixa justa da cidade (discrimina entre as âncoras — não se sobrepõem). */
  bbox: BBox;
  /** Código IBGE do município. */
  ibge: string;
  /** Prefixo de 2 letras do GeoHex (geohex.net) — comum às duas: "Nb". */
  geohex: string;
  /** "Area code" de 4 chars do Plus Code (OLC) p/ recuperar código curto. */
  plusPrefix: string;
  /** Exemplo de Plus Code completo no centro da cidade. */
  plusExample: string;
  /** Prefixo de Geohash da cidade (regional comum = "6gj"). */
  geohashCity: string;
  /** Zona UTM (banda inclusa) — comum às duas: "22J". */
  utmZone: string;
}

export const BLUMENAU: LocalAnchor = {
  name: "Blumenau",
  lat: -26.9194,
  lng: -49.0661,
  /**
   * ── A CAIXA ERA MENOR QUE O MUNICÍPIO ─────────────────────────────────────
   * Ela é o VALIDADOR do atalho de cauda: o código parcial só vira ponto se o
   * ponto reconstruído cair aqui dentro. Escrita à mão, ela cortava o próprio
   * município — e cortar o validador não devolve "não sei", devolve a leitura
   * ERRADA, porque sobra o Geohash global frouxo lá no fim da cascata.
   *
   * Medida contra o dado que este repositório JÁ EMBARCA — 84.539 lotes +
   * 3.703 CEPs, 88.242 pontos: Blumenau vai a −26,6215 ao norte, e a caixa
   * parava em −26,78. **~17 km de Blumenau ficavam de fora.**
   *
   * Agora é a união da caixa antiga com o dado medido, mais 1,5 km de folga.
   * O teste `anchors.test.ts` refaz essa conta e reprova se o dado passar a
   * cair fora — a caixa deixou de ser número escrito à mão e virou número
   * conferido.
   */
  bbox: { latMin: -27.077, latMax: -26.607, lonMin: -49.213, lonMax: -48.95 },
  ibge: "4202404",
  geohex: "Nb",
  plusPrefix: "585G",
  plusExample: "585G3WJM+6H",
  geohashCity: "6gjn",
  utmZone: "22J",
};

export const ITAJAI: LocalAnchor = {
  name: "Itajaí",
  lat: -26.9078,
  lng: -48.6618,
  /**
   * Mesma correção, e aqui está o caso que a expôs. O Plus Code gabaritado da
   * madrugada de 2024 é `25JR+P8` — Capela São Sebastião, em Laranjeiras, que é
   * ITAJAÍ. Ele cai em −26,9682 / −48,8092, e a caixa antiga parava em −48,78:
   * **8 km a leste do bairro.** Os dois ramos do atalho devolviam `null` e a
   * bancada respondia −77,30 / −103,70 — Antártida.
   *
   * Medida nos 1.565 CEPs de Itajaí (−27,0653..−26,8436 / −48,8619..−48,6290),
   * mais 1,5 km. Continua sem tocar a de Blumenau: −48,95 contra −48,877.
   */
  bbox: { latMin: -27.08, latMax: -26.82, lonMin: -48.877, lonMax: -48.58 },
  ibge: "4208203",
  geohex: "Nb",
  plusPrefix: "585H",
  plusExample: "585H38RQ+V7",
  geohashCity: "6gjq",
  utmZone: "22J",
};

export const ANCHORS: LocalAnchor[] = [BLUMENAU, ITAJAI];

/**
 * Caixa que cobre as DUAS cidades (e o trecho entre elas: Gaspar, Ilhota,
 * Navegantes, Balneário Camboriú). Usada pelos atalhos que compartilham prefixo
 * regional (GeoHex "Nb", Geohash "6gj") e aceitam tanto Blumenau quanto Itajaí.
 */
export const VALE_BBOX: BBox = { latMin: -27.3, latMax: -26.5, lonMin: -49.45, lonMax: -48.55 };

/** Âncora cuja caixa justa contém o ponto (ou null se cair fora das duas). */
export function anchorForPoint(p: { lat: number; lng: number }): LocalAnchor | null {
  return ANCHORS.find((a) => inBBox(p, a.bbox)) ?? null;
}

/** Rótulo de escopo de um ponto: cidade específica, "Vale do Itajaí", ou null. */
export function scopeLabel(p: { lat: number; lng: number }): string | null {
  const a = anchorForPoint(p);
  if (a) return a.name;
  return inBBox(p, VALE_BBOX) ? "Vale do Itajaí" : null;
}
