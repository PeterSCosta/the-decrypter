/**
 * Pontes, passarelas e viadutos de Blumenau.
 *
 * Uma linha é uma *estrutura*, não um registro de uma fonte só: a lei dá o nome
 * e a data, o OSM dá a geometria, e as duas quase nunca cobrem o mesmo conjunto.
 * `fonte` diz de onde a linha veio — e, portanto, quais campos podem estar nulos.
 */
export type BridgeFonte = "lei" | "osm" | "lei+osm";

export interface BridgeRow {
  /** Nome oficial: o da lei quando existe, senão o do OSM. */
  nome: string;
  /** Grafia do OSM quando difere da legal (Victorino/Vitorino, Klock/Kloch). */
  nomeOsm: string | null;
  /** "Ponte de Ferro", "Ponte do Salto", "Ponte dos Arcos". */
  apelidos: string[];
  tipo: "ponte" | "passarela" | "viaduto" | "pontilhão";
  fonte: BridgeFonte;

  // ── lei de denominação ────────────────────────────────────────────────────
  /** "8492/2017" */
  lei: string | null;
  numLei: number | null;
  anoLei: number | null;
  /** dd/mm/aaaa (data de protocolo na Câmara). */
  dataLei: string | null;
  ementa: string | null;
  /** Texto integral quando o portal o publica. */
  textoLei: string | null;
  urlLei: string | null;
  /** Curso d'água como a lei o nomeia ("Ribeirão da Velha"). */
  cursoDaguaLei: string | null;
  bairrosLei: string[];
  /** Vias citadas na lei (a ponte liga X a Y). */
  ruasLei: string[];
  /** "em construção" / "projetada" / "denominação revogada…". */
  situacao: string | null;
  /** Ressalva sobre a procedência do dado, quando a fonte não fecha. */
  nota: string | null;

  // ── geometria (OSM) ───────────────────────────────────────────────────────
  lat: number | null;
  lng: number | null;
  /** Metros, do maior segmento mapeado. */
  comprimento: number | null;
  /** [início, fim] do maior segmento — útil p/ rumo e para desenhar. */
  extremos: [[number, number], [number, number]] | null;
  /** Rua que passa por cima. */
  via: string | null;
  /** primary / secondary / residential / footway / railway… */
  classeVia: string | null;
  material: string | null;
  camada: number | null;
  pistas: number | null;
  maoUnica: boolean;
  osmIds: number[];

  // ── cruzamentos espaciais ─────────────────────────────────────────────────
  /** Cursos d'água que a geometria efetivamente cruza. */
  transpoe: string[];
  /** Bairro pelo polígono do geoportal (ou o da lei, quando não há geometria). */
  bairros: string[];
}

export interface BridgesData {
  source: string;
  generatedAt: string;
  count: number;
  rows: BridgeRow[];
}

export const TIPO_LABEL: Record<BridgeRow["tipo"], string> = {
  ponte: "Ponte",
  passarela: "Passarela",
  viaduto: "Viaduto",
  pontilhão: "Pontilhão",
};
