import type { AirportsData } from "@/features/airport/types";
import type { CepsData } from "@/features/cep/types";
import type { MunicipiosData } from "@/features/ibge/types";
import type { PixData } from "@/features/pix/types";
import type { StreetsData } from "@/features/street-guide/types";
import { api } from "./api";

/**
 * Lazy, cached loaders for the bundled datasets (served from /public/data).
 * Each dataset is fetched at most once; `getX()` returns the cached value
 * synchronously (or null before the first load resolves).
 */

/** Estado de um dataset carregado sob demanda. */
interface Slot<T> {
  promise: Promise<T> | null;
  value: T | null;
}

/**
 * Carrega uma vez, com cache — e **esquece a falha**.
 *
 * Memoizar a promessa REJEITADA era um defeito silencioso caro: um 502 de dois
 * segundos durante o próprio deploy, ou o 4G piscando no meio da gincana,
 * desligava aquele dataset pelo resto da sessão. Sem mensagem, sem nova
 * tentativa — a pessoa concluía que a bancada não sabia buscar CEP. Zerando o
 * memo no erro, a próxima chamada tenta de novo.
 *
 * O `res.ok` também não é firula: sem backend, o servidor responde a página de
 * erro com status 200, e o corpo HTML chegava a `JSON.parse` como
 * "Unexpected token '<'" — ou, pior, era fatiado em linhas e entregue ao score
 * como se fosse vocabulário (ver `engine/words.ts`).
 */
function loadOnce<T>(slot: Slot<T>, url: string, parse: (r: Response) => Promise<T>): Promise<T> {
  if (!slot.promise) {
    slot.promise = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Consulta indisponível (HTTP ${r.status}).`);
        return parse(r);
      })
      .then((d) => {
        slot.value = d;
        return d;
      })
      .catch((e) => {
        slot.promise = null; // a próxima tentativa recomeça do zero
        throw e;
      });
  }
  return slot.promise;
}

const asJson = <T>(r: Response) => r.json() as Promise<T>;

const streets: Slot<StreetsData> = { promise: null, value: null };

export function loadStreets(): Promise<StreetsData> {
  return loadOnce(streets, "/data/streets.json", asJson<StreetsData>);
}

export function getStreets(): StreetsData | null {
  return streets.value;
}

const ceps: Slot<CepsData> = { promise: null, value: null };

export function loadCeps(): Promise<CepsData> {
  return loadOnce(ceps, "/data/ceps.json", asJson<CepsData>);
}

export function getCeps(): CepsData | null {
  return ceps.value;
}

const municipios: Slot<MunicipiosData> = { promise: null, value: null };

export function loadMunicipios(): Promise<MunicipiosData> {
  return loadOnce(municipios, "/data/municipios.json", asJson<MunicipiosData>);
}

export function getMunicipios(): MunicipiosData | null {
  return municipios.value;
}

const airports: Slot<AirportsData> = { promise: null, value: null };

export function loadAirports(): Promise<AirportsData> {
  return loadOnce(airports, "/data/airports.json", asJson<AirportsData>);
}

export function getAirports(): AirportsData | null {
  return airports.value;
}

// Participantes PIX (~900 instituições) via backend /api/pix. Carregado sob
// demanda e cacheado; indexado por ISPB no decoder. O backend já entrega no
// formato {ispb, nome, nomeReduzido, tipo}, então não há mapeamento aqui.
const pix: Slot<PixData> = { promise: null, value: null };

export function loadPix(): Promise<PixData> {
  return loadOnce(pix, api("/pix"), asJson<PixData>);
}

export function getPix(): PixData | null {
  return pix.value;
}

export type WordLang = "pt" | "en";
const words: Record<WordLang, Slot<string[]>> = {
  pt: { promise: null, value: null },
  en: { promise: null, value: null },
};

/** Carrega a lista de palavras (uma por linha) do idioma, com cache. */
export function loadWords(lang: WordLang): Promise<string[]> {
  return loadOnce(words[lang], `/data/words-${lang}.txt`, (r) =>
    r.text().then((t) => t.split("\n").filter(Boolean)),
  );
}
