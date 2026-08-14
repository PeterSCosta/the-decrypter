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
import { useCallback, useEffect, useMemo, useState } from "react";
import { decoders } from "./engine/registry";
import { partition, runDecoders } from "./engine/run";
import { setWordSet } from "./engine/score";
import { sniff } from "./engine/sniff";
import { titleHints } from "./engine/title-hints";
import { loadWordSet } from "./engine/words";
import { type TrailStep, popStep, pushStep, truncateTo } from "./trail";

/**
 * `entradaInicial` serve às outras abas: a Matriz manda a string extraída da
 * grade para cá. Funciona como valor inicial (e não por efeito) porque a
 * bancada é desmontada ao trocar de aba — ao voltar, ela nasce com o valor novo.
 */
export function useDecoder(entradaInicial = "") {
  const [input, setInput] = useState(entradaInicial);
  const [key, setKey] = useState("");
  /** Segundo campo genérico (fonte a indexar, texto original, deslocamentos). */
  const [aux, setAux] = useState("");
  /**
   * Título da prova. Nunca entra em `decode()` e NÃO altera o score — só
   * levanta chips. Um título mal interpretado corromperia o ranking que o
   * realce de palavra real acabou de tornar confiável, e de forma invisível.
   */
  const [title, setTitle] = useState("");
  /** Quando setado, roda só esse decoder (modo "testar uma cifra"). */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trail, setTrail] = useState<TrailStep[]>([]);
  const [streets, setStreets] = useState<StreetsData | null>(getStreets);
  const [ceps, setCeps] = useState<CepsData | null>(getCeps);
  const [municipios, setMunicipios] = useState<MunicipiosData | null>(getMunicipios);
  const [airports, setAirports] = useState<AirportsData | null>(getAirports);
  const [pix, setPix] = useState<PixData | null>(getPix);

  const debInput = useDebouncedValue(input, 160);
  const debKey = useDebouncedValue(key, 160);
  const debAux = useDebouncedValue(aux, 160);
  const debTitle = useDebouncedValue(title, 250);

  // Wordlist do realce de palavra real: carrega ociosa e alimenta o singleton
  // do score. Até chegar, `setWordSet` nunca é chamado e o ranking é o de antes.
  const [wordsReady, setWordsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const start = () => {
      loadWordSet()
        .then((set) => {
          if (!alive) return;
          setWordSet(set);
          setWordsReady(true);
        })
        .catch(() => {});
    };
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    const id = ric ? ric(start) : setTimeout(start, 1200);
    return () => {
      alive = false;
      if (!ric) clearTimeout(id as ReturnType<typeof setTimeout>);
    };
  }, []);

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

  // Um único contexto para as duas travessias (decodificar e codificar). Montá-lo
  // duas vezes era como um campo novo sumia silenciosamente no modo codificar.
  const ctx = useMemo(
    () => ({
      key: debKey,
      aux: debAux,
      only: selectedId ?? undefined,
      streets,
      ceps,
      municipios,
      airports,
      pix,
    }),
    [debKey, debAux, selectedId, streets, ceps, municipios, airports, pix],
  );

  const run = useMemo(() => {
    if (!debInput.trim()) return { results: [], hitCount: 0 };
    // Decoder que exige o 2º campo fica fora da corrida enquanto ele está vazio.
    // O filtro mora aqui, nunca em `runDecoders` — senão os testes do motor
    // mudariam de comportamento.
    const usable = (d: (typeof decoders)[number]) => !d.inputs?.aux?.required || !!ctx.aux?.trim();
    const list = selectedId ? decoders.filter((d) => d.id === selectedId) : decoders.filter(usable);
    return runDecoders(debInput, ctx, list);
  }, [debInput, ctx, selectedId]);

  const { likely, unlikely } = useMemo(() => partition(run.results), [run.results]);

  // Codificar (modo "uma cifra só"): só pra cifras que têm o inverso `encode`.
  const [encodeInput, setEncodeInput] = useState("");
  const debEncodeInput = useDebouncedValue(encodeInput, 160);
  const selectedDecoder = useMemo(
    () => (selectedId ? (decoders.find((d) => d.id === selectedId) ?? null) : null),
    [selectedId],
  );
  const encoded = useMemo(() => {
    if (!selectedDecoder?.encode || !debEncodeInput.trim()) return null;
    try {
      return selectedDecoder.encode(debEncodeInput, ctx);
    } catch {
      return null;
    }
  }, [selectedDecoder, debEncodeInput, ctx]);

  /** Encadeia: o valor vira a entrada e o passo anterior entra na trilha. */
  const chainTo = useCallback(
    (value: string, via: string) => {
      setTrail((t) => pushStep(t, input, via));
      setInput(value);
      setSelectedId(null);
      setAux("");
    },
    [input],
  );

  const undoChain = useCallback(() => {
    setTrail((t) => {
      const { trail: next, input: prev } = popStep(t);
      if (prev != null) setInput(prev);
      return next;
    });
  }, []);

  const goToStep = useCallback((index: number) => {
    setTrail((t) => {
      const { trail: next, input: prev } = truncateTo(t, index);
      if (prev != null) setInput(prev);
      return next;
    });
  }, []);

  const clearTrail = useCallback(() => setTrail([]), []);

  const hints = useMemo(() => {
    const fromInput = debInput.trim() ? sniff(debInput, ctx) : [];
    const fromTitle = debTitle.trim() ? titleHints(debTitle) : [];
    // O título pode repetir o que a entrada já disse por caminho independente
    // ("Ask Me" e "84 79 80 79" apontam ambos para ASCII) — uma dica só.
    const seen = new Set(fromInput.map((h) => h.id));
    return [...fromInput, ...fromTitle.filter((h) => !seen.has(h.id))];
  }, [debInput, debTitle, ctx]);

  return {
    input,
    setInput,
    key,
    setKey,
    aux,
    setAux,
    title,
    setTitle,
    selectedId,
    setSelectedId,
    likely,
    unlikely,
    results: run.results,
    hitCount: run.hitCount,
    total: run.results.length,
    canEncode: !!selectedDecoder?.encode,
    encodeInput,
    setEncodeInput,
    encoded,
    selectedDecoder,
    trail,
    chainTo,
    undoChain,
    goToStep,
    clearTrail,
    hints,
    wordsReady,
  };
}
