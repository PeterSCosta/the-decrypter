import type { AirportsData } from "@/features/airport/types";
import type { CepsData } from "@/features/cep/types";
import type { MunicipiosData } from "@/features/ibge/types";
import type { StreetsData } from "@/features/street-guide/types";
import {
  getAirports,
  getCeps,
  getMunicipios,
  getStreets,
  loadAirports,
  loadCeps,
  loadMunicipios,
  loadStreets,
} from "@/lib/data";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useEffect, useMemo, useState } from "react";
import { partition, runDecoders } from "./engine/run";

export function useDecoder() {
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  const [streets, setStreets] = useState<StreetsData | null>(getStreets);
  const [ceps, setCeps] = useState<CepsData | null>(getCeps);
  const [municipios, setMunicipios] = useState<MunicipiosData | null>(getMunicipios);
  const [airports, setAirports] = useState<AirportsData | null>(getAirports);

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

  // The CEP dataset is heavier — only fetch it once the input could be an exact CEP.
  const digits = debInput.replace(/\D/g, "");
  useEffect(() => {
    if (digits.length === 8 && !ceps) {
      loadCeps()
        .then(setCeps)
        .catch(() => {});
    }
  }, [digits, ceps]);

  // Airports: only fetch when the input is a lone 3 (IATA) or 4 (ICAO) letters.
  const isCode = /^[a-z]{3,4}$/i.test(debInput.trim());
  useEffect(() => {
    if (isCode && !airports) {
      loadAirports()
        .then(setAirports)
        .catch(() => {});
    }
  }, [isCode, airports]);

  const run = useMemo(() => {
    if (!debInput.trim()) return { results: [], hitCount: 0 };
    return runDecoders(debInput, { key: debKey, streets, ceps, municipios, airports });
  }, [debInput, debKey, streets, ceps, municipios, airports]);

  const { likely, unlikely } = useMemo(() => partition(run.results), [run.results]);

  return {
    input,
    setInput,
    key,
    setKey,
    likely,
    unlikely,
    hitCount: run.hitCount,
    total: run.results.length,
  };
}
