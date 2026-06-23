import type { AirportsData } from "@/features/airport/types";
import { parseCepPattern } from "@/features/cep/cep-pattern";
import type { CepsData } from "@/features/cep/types";
import type { MunicipiosData } from "@/features/ibge/types";
import type { PixData } from "@/features/pix/types";
import type { StreetsData } from "@/features/street-guide/types";
import {
  getAirports,
  getCeps,
  getMunicipios,
  getPix,
  getStreets,
  loadAirports,
  loadCeps,
  loadMunicipios,
  loadPix,
  loadStreets,
} from "@/lib/data";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useEffect, useMemo, useState } from "react";
import { decoders } from "./engine/registry";
import { partition, runDecoders } from "./engine/run";

export function useDecoder() {
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  /** Quando setado, roda só esse decoder (modo "testar uma cifra"). */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [streets, setStreets] = useState<StreetsData | null>(getStreets);
  const [ceps, setCeps] = useState<CepsData | null>(getCeps);
  const [municipios, setMunicipios] = useState<MunicipiosData | null>(getMunicipios);
  const [airports, setAirports] = useState<AirportsData | null>(getAirports);
  const [pix, setPix] = useState<PixData | null>(getPix);

  const debInput = useDebouncedValue(input, 160);
  const debKey = useDebouncedValue(key, 160);

  // Street + município data are small — load eagerly so número→lookup is instant.
  useEffect(() => {
    let alive = true;
    loadStreets()
      .then((d) => alive && setStreets(d))
      .catch(() => {});
    loadMunicipios()
      .then((d) => alive && setMunicipios(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // CEP dataset (pesado): busca quando a entrada é um CEP exato (8 dígitos) OU
  // um padrão com curinga (ex.: 88xxx500), p/ a busca curinga rodar no decoder.
  const digits = debInput.replace(/\D/g, "");
  const isCepWildcard = /[xX*_?]/.test(debInput) && parseCepPattern(debInput) !== null;
  useEffect(() => {
    if ((digits.length === 8 || isCepWildcard) && !ceps) {
      loadCeps()
        .then(setCeps)
        .catch(() => {});
    }
  }, [digits, isCepWildcard, ceps]);

  // Airports: only fetch when the input is a lone 3 (IATA) or 4 (ICAO) letters.
  const isCode = /^[a-z]{3,4}$/i.test(debInput.trim());
  useEffect(() => {
    if (isCode && !airports) {
      loadAirports()
        .then(setAirports)
        .catch(() => {});
    }
  }, [isCode, airports]);

  // Participantes PIX (BrasilAPI): buscar quando a entrada for um ISPB (8 dígitos).
  useEffect(() => {
    if (digits.length === 8 && !pix) {
      loadPix()
        .then(setPix)
        .catch(() => {});
    }
  }, [digits, pix]);

  const run = useMemo(() => {
    if (!debInput.trim()) return { results: [], hitCount: 0 };
    const list = selectedId ? decoders.filter((d) => d.id === selectedId) : undefined;
    return runDecoders(debInput, { key: debKey, streets, ceps, municipios, airports, pix }, list);
  }, [debInput, debKey, streets, ceps, municipios, airports, pix, selectedId]);

  const { likely, unlikely } = useMemo(() => partition(run.results), [run.results]);

  return {
    input,
    setInput,
    key,
    setKey,
    selectedId,
    setSelectedId,
    likely,
    unlikely,
    results: run.results,
    hitCount: run.hitCount,
    total: run.results.length,
  };
}
