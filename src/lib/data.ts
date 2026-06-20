import type { CepsData } from "@/features/cep/types";
import type { MunicipiosData } from "@/features/ibge/types";
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
