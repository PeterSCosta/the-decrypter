import type { AirportsData } from "@/features/airport/types";
import type { CepsData } from "@/features/cep/types";
import type { MunicipiosData } from "@/features/ibge/types";
import type { PixData } from "@/features/pix/types";
import type { StreetsData } from "@/features/street-guide/types";

/**
 * Lazy, cached loaders for the bundled datasets (served from /public/data).
 * Each dataset is fetched at most once; `getX()` returns the cached value
 * synchronously (or null before the first load resolves).
 */

let streetsPromise: Promise<StreetsData> | null = null;
let streetsCache: StreetsData | null = null;

export function loadStreets(): Promise<StreetsData> {
  if (!streetsPromise) {
    streetsPromise = fetch("/data/streets.json")
      .then((r) => r.json() as Promise<StreetsData>)
      .then((d) => {
        streetsCache = d;
        return d;
      });
  }
  return streetsPromise;
}

export function getStreets(): StreetsData | null {
  return streetsCache;
}

let cepsPromise: Promise<CepsData> | null = null;
let cepsCache: CepsData | null = null;

export function loadCeps(): Promise<CepsData> {
  if (!cepsPromise) {
    cepsPromise = fetch("/data/ceps.json")
      .then((r) => r.json() as Promise<CepsData>)
      .then((d) => {
        cepsCache = d;
        return d;
      });
  }
  return cepsPromise;
}

export function getCeps(): CepsData | null {
  return cepsCache;
}

let municipiosPromise: Promise<MunicipiosData> | null = null;
let municipiosCache: MunicipiosData | null = null;

export function loadMunicipios(): Promise<MunicipiosData> {
  if (!municipiosPromise) {
    municipiosPromise = fetch("/data/municipios.json")
      .then((r) => r.json() as Promise<MunicipiosData>)
      .then((d) => {
        municipiosCache = d;
        return d;
      });
  }
  return municipiosPromise;
}

export function getMunicipios(): MunicipiosData | null {
  return municipiosCache;
}

let airportsPromise: Promise<AirportsData> | null = null;
let airportsCache: AirportsData | null = null;

export function loadAirports(): Promise<AirportsData> {
  if (!airportsPromise) {
    airportsPromise = fetch("/data/airports.json")
      .then((r) => r.json() as Promise<AirportsData>)
      .then((d) => {
        airportsCache = d;
        return d;
      });
  }
  return airportsPromise;
}

export function getAirports(): AirportsData | null {
  return airportsCache;
}

// Participantes PIX (BrasilAPI, ~900 instituições). Carregado sob demanda e
// cacheado; indexado por ISPB no decoder.
interface RawPixParticipant {
  ispb: string;
  nome: string;
  nome_reduzido: string;
  tipo_participacao: string;
}
let pixPromise: Promise<PixData> | null = null;
let pixCache: PixData | null = null;

export function loadPix(): Promise<PixData> {
  if (!pixPromise) {
    pixPromise = fetch("https://brasilapi.com.br/api/pix/v1/participants")
      .then((r) => r.json() as Promise<RawPixParticipant[]>)
      .then((rows) => {
        pixCache = rows.map((r) => ({
          ispb: r.ispb,
          nome: r.nome,
          nomeReduzido: r.nome_reduzido,
          tipo: r.tipo_participacao,
        }));
        return pixCache;
      });
  }
  return pixPromise;
}

export function getPix(): PixData | null {
  return pixCache;
}

export type WordLang = "pt" | "en";
const wordsPromise: Partial<Record<WordLang, Promise<string[]>>> = {};

/** Carrega a lista de palavras (uma por linha) do idioma, com cache. */
export function loadWords(lang: WordLang): Promise<string[]> {
  if (!wordsPromise[lang]) {
    wordsPromise[lang] = fetch(`/data/words-${lang}.txt`)
      .then((r) => r.text())
      .then((t) => t.split("\n").filter(Boolean));
  }
  return wordsPromise[lang] as Promise<string[]>;
}
