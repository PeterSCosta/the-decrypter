import { aoCarregarH3 } from "@/features/location/formats";
import type { PixData } from "@/features/pix/types";
import type { StreetsData } from "@/features/street-guide/types";
import { getPix, getStreets, loadPix, loadStreets } from "@/lib/data";
import { type LookupHits, cancelarSuperadas, consultar, valeConsultar } from "@/lib/lookup-cache";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCallback, useEffect, useMemo, useState } from "react";
import { decoders } from "./engine/registry";
import { partition, runDecoders } from "./engine/run";
import { setWordSet } from "./engine/score";
import { sniff } from "./engine/sniff";
import { titleHints } from "./engine/title-hints";
import { loadWordLookup } from "./engine/words";
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
  const [pix, setPix] = useState<PixData | null>(getPix);

  const debInput = useDebouncedValue(input, 160);
  const debKey = useDebouncedValue(key, 160);
  const debAux = useDebouncedValue(aux, 160);
  const debTitle = useDebouncedValue(title, 250);

  // O parser de H3 carrega a lib sob demanda e não pode esperar (o fan-out é
  // síncrono): quando ela chega, refaz a rodada, senão a célula colada só
  // resolveria na tecla seguinte.
  const [h3Pronto, setH3Pronto] = useState(0);
  useEffect(() => aoCarregarH3(() => setH3Pronto((v) => v + 1)), []);

  // Vocabulário do realce de palavra real: carrega ocioso e alimenta o
  // singleton do score. Até chegar, `setWordSet` nunca é chamado e o ranking é
  // o de antes.
  const [wordsReady, setWordsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const start = () => {
      loadWordLookup()
        .then((lookup) => {
          if (!alive) return;
          setWordSet(lookup);
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

  /**
   * Ruas: continuam LOCAIS, e agora preguiçosas.
   *
   * Não foram para a API junto com CEP e município por quatro razões medidas: a
   * tabela `street` do banco não tem `bairroNum`, `atas`, `lat` nem `lng` (que o
   * card e a Triangulação usam); a chave primária engole 415 das 4.426 linhas
   * (uma rua em três bairros vira uma); `/api/streets/search` não distingue
   * código de nº da lei, que são dois decoders com pontuações diferentes; e o
   * ranking por posição do acerto teria de virar SQL. Mantendo-as aqui, as
   * quatro consultas de rua seguem instantâneas e funcionam com a API fora.
   *
   * O que mudou é o "eager": 204 KB gzip saíram do caminho crítico de toda
   * sessão e passam a chegar quando a entrada tem cara de rua.
   */
  const pareceRua = /[a-zà-ú]{4,}/i.test(debInput);
  useEffect(() => {
    if (!pareceRua || streets) return;
    let alive = true;
    loadStreets()
      .then((d) => alive && setStreets(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pareceRua, streets]);

  const digits = debInput.replace(/\D/g, "");

  // Participantes PIX (BrasilAPI): buscar quando a entrada for um ISPB (8 dígitos).
  useEffect(() => {
    if (digits.length === 8 && !pix) {
      loadPix()
        .then(setPix)
        .catch(() => {});
    }
  }, [digits, pix]);

  /**
   * Consulta as bases que moram na API **antes** do fan-out.
   *
   * Debounce próprio, mais folgado que os 160 ms do decode local: aquele é
   * cálculo em memória, este é round-trip. E a resposta só entra se ainda for da
   * entrada atual — comparar com o `q` de agora, e não só com um flag de vida,
   * é o que evita um acerto de duas teclas atrás aparecer como se fosse deste.
   */
  const [hits, setHits] = useState<LookupHits | null>(null);
  const [hitsCarregando, setHitsCarregando] = useState(false);
  const [hitsErro, setHitsErro] = useState<string | null>(null);
  const debLookup = useDebouncedValue(input, 300);

  useEffect(() => {
    const q = debLookup.trim();
    if (!valeConsultar(q)) {
      setHits(null);
      setHitsCarregando(false);
      setHitsErro(null);
      return;
    }
    cancelarSuperadas(q);
    let vivo = true;
    setHitsCarregando(true);
    consultar(q)
      .then((r) => {
        if (!vivo) return;
        setHits(r);
        setHitsErro(null);
      })
      .catch((e: Error) => {
        if (!vivo || e.name === "AbortError") return;
        setHits(null);
        // Nunca devolver lista vazia calada: "não alcancei o servidor" tem de
        // ser distinto de "não encontrei".
        setHitsErro(e.message);
      })
      .finally(() => {
        if (vivo) setHitsCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [debLookup]);

  // Um único contexto para as duas travessias (decodificar e codificar). Montá-lo
  // duas vezes era como um campo novo sumia silenciosamente no modo codificar.
  const ctx = useMemo(
    () => ({
      key: debKey,
      aux: debAux,
      only: selectedId ?? undefined,
      hits,
      hitsCarregando,
      hitsErro,
      streets,
      pix,
    }),
    [debKey, debAux, selectedId, hits, hitsCarregando, hitsErro, streets, pix],
  );

  // `wordsReady` está nas dependências de propósito: o vocabulário do realce
  // vive num singleton do score, fora do `ctx`. Sem ele, os scores calculados
  // antes da carga ficavam congelados até a próxima tecla — o selo "palavra
  // real" acendia no card e a barra de confiança não se mexia, que é exatamente
  // o sintoma de um ranking mentindo. O Biome não enxerga a dependência porque
  // ela passa por um módulo, não por um valor lido aqui.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o vocabulário chega por singleton
  const run = useMemo(() => {
    if (!debInput.trim()) return { results: [], hitCount: 0 };
    // Decoder que exige o 2º campo fica fora da corrida enquanto ele está vazio.
    // O filtro mora aqui, nunca em `runDecoders` — senão os testes do motor
    // mudariam de comportamento.
    const usable = (d: (typeof decoders)[number]) => !d.inputs?.aux?.required || !!ctx.aux?.trim();
    const list = selectedId ? decoders.filter((d) => d.id === selectedId) : decoders.filter(usable);
    return runDecoders(debInput, ctx, list);
  }, [debInput, ctx, selectedId, wordsReady, h3Pronto]);

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
