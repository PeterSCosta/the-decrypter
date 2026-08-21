import { PARECE_ESTRUTURA } from "@/features/bridge/match";
import type { BridgesData } from "@/features/bridge/types";
import { type EixosData, PARECE_QUADRA } from "@/features/eixos/types";
import type { EstacoesData } from "@/features/estacao/types";
import type { FichasData } from "@/features/ficha/types";
import type { ArticulacaoData } from "@/features/location/articulacao";
import { PARECE_FOLHA } from "@/features/location/articulacao";
import { aoCarregarH3 } from "@/features/location/formats";
import type { LojasData } from "@/features/loja/types";
import type { PixData } from "@/features/pix/types";
import type { StreetsData } from "@/features/street-guide/types";
import type { VotacoesData } from "@/features/votacao/types";
import {
  getArticulacao,
  getBridges,
  getEixos,
  getEstacoes,
  getFichas,
  getLojas,
  getPix,
  getStreets,
  getVotacoes,
  loadArticulacao,
  loadBridges,
  loadEixos,
  loadEstacoes,
  loadFichas,
  loadLojas,
  loadPix,
  loadStreets,
  loadVotacoes,
} from "@/lib/data";
import { normalizaDigitos } from "@/lib/digitos";
import {
  type LookupHits,
  cancelarSuperadas,
  consultar,
  motivoSemConsulta,
  valeConsultar,
} from "@/lib/lookup-cache";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PARECE_FICHA } from "./engine/decoders/ficha-cp";
import { PARECE_UNIDADE } from "./engine/decoders/loja";
import { decoders } from "./engine/registry";
import { partition, runDecoders } from "./engine/run";
import { setWordSet } from "./engine/score";
import { type Hint, sniff } from "./engine/sniff";
import { aoCarregarQuadgramas } from "./engine/substituicao";
import { titleHints } from "./engine/title-hints";
import { loadWordLookup } from "./engine/words";
import { type TrailStep, popStep, pushStep, truncateTo } from "./trail";

/**
 * `entradaInicial` serve às outras abas: a Matriz manda a string extraída da
 * grade para cá. Funciona como valor inicial (e não por efeito) porque a
 * bancada é desmontada ao trocar de aba — ao voltar, ela nasce com o valor novo.
 */
export function useDecoder(
  entradaInicial = "",
  /**
   * A cifra isolada e quem a troca vêm de FORA — da rota.
   *
   * Primeira tentativa foi espelhar: estado local aqui, efeito sincronizando os
   * dois lados. Deu a corrida clássica, medida no navegador: depois do VOLTAR a
   * URL dizia `/cifra/atbash` e a faixa continuava em "Rodando só: Código
   * Morse". Dois donos do mesmo valor sempre discordam em algum quadro.
   *
   * Agora há um dono só. Sem os parâmetros (nos testes, e em qualquer uso fora
   * do App), o hook cai no estado local de sempre.
   */
  cifra?: { id: string | null; trocar: (id: string | null) => void },
) {
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
  const [selecaoLocal, setSelecaoLocal] = useState<string | null>(null);
  const selectedId = cifra ? cifra.id : selecaoLocal;
  const setSelectedId = cifra ? cifra.trocar : setSelecaoLocal;
  const [trail, setTrail] = useState<TrailStep[]>([]);
  const [streets, setStreets] = useState<StreetsData | null>(getStreets);
  const [pix, setPix] = useState<PixData | null>(getPix);
  const [bridges, setBridges] = useState<BridgesData | null>(getBridges);
  const [votacoes, setVotacoes] = useState<VotacoesData | null>(getVotacoes);
  const [lojas, setLojas] = useState<LojasData | null>(getLojas);
  const [fichas, setFichas] = useState<FichasData | null>(getFichas);
  const [estacoes, setEstacoes] = useState<EstacoesData | null>(getEstacoes);
  const [eixos, setEixos] = useState<EixosData | null>(getEixos);
  const [articulacao, setArticulacao] = useState<ArticulacaoData | null>(getArticulacao);

  // A entrada passa por UMA normalização antes de qualquer decoder ver: dígito
  // decimal não-ASCII vira `0`..`9`. Sem isso, `replace(/\D/g, "")` — que este
  // repositório usa em 17 lugares — **apaga** o dígito estrangeiro em vez de
  // deixá-lo de fora, e todo decoder numérico cala sem motivo visível. Ver
  // `lib/digitos.ts`. Entrada já em ASCII volta idêntica.
  const debInput = normalizaDigitos(useDebouncedValue(input, 160));
  const debKey = useDebouncedValue(key, 160);
  const debAux = useDebouncedValue(aux, 160);
  const debTitle = useDebouncedValue(title, 250);

  // O parser de H3 carrega a lib sob demanda e não pode esperar (o fan-out é
  // síncrono): quando ela chega, refaz a rodada, senão a célula colada só
  // resolveria na tecla seguinte.
  const [h3Pronto, setH3Pronto] = useState(0);
  useEffect(() => aoCarregarH3(() => setH3Pronto((v) => v + 1)), []);
  /**
   * A tabela de quadrigramas do solver de substituição entra por `import()`
   * quando o texto passa nos portões. Sem refazer a rodada aqui, a primeira
   * entrada longa que chegasse ficaria sem card até a próxima tecla — o mesmo
   * problema que o H3 já teve, e o mesmo conserto.
   */
  useEffect(() => aoCarregarQuadgramas(() => setH3Pronto((v) => v + 1)), []);

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

  // Pontes: mesmo desenho preguiçoso das ruas. O gate é a palavra escrita
  // ("ponte", "passarela", "viaduto"), e não a forma do texto — é o que
  // impede o decoder de virar ruído, e é o mesmo gate que o decoder aplica.
  const pareceEstrutura = PARECE_ESTRUTURA.test(debInput);
  useEffect(() => {
    if (!pareceEstrutura || bridges) return;
    let alive = true;
    loadBridges()
      .then((d) => alive && setBridges(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pareceEstrutura, bridges]);

  // Votações: o gate é a FORMA (número de 3 a 7 dígitos), porque aqui não há
  // palavra que anuncie. São 10 KB, e o decoder só emite se o número bater com
  // a votação exata de alguém — o carregamento é barato e o ruído é zero.
  const pareceVotacao = /^\d{3,7}$/.test(debInput.trim());
  useEffect(() => {
    if (!pareceVotacao || votacoes) return;
    let alive = true;
    loadVotacoes()
      .then((d) => alive && setVotacoes(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pareceVotacao, votacoes]);

  /**
   * Lojas de shopping: o MESMO portão do decoder, escrito uma vez e usado nos
   * dois lugares.
   *
   * A armadilha já mordeu esta casa duas vezes — alargar o portão do decoder e
   * esquecer o da carga faz a base nunca descer, e o decoder cala sem dizer por
   * quê. Aqui os dois são literalmente a mesma constante, importada.
   */
  const pareceUnidade = PARECE_UNIDADE.test(debInput.trim());
  useEffect(() => {
    if (!pareceUnidade || lojas) return;
    let alive = true;
    loadLojas()
      .then((d) => alive && setLojas(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pareceUnidade, lojas]);

  /**
   * Fichas da CP: o MESMO portão do decoder, importado — a mesma disciplina das
   * lojas, logo acima, e pelo mesmo motivo.
   *
   * Este portão é largo de propósito (qualquer punhado de palavras passa),
   * porque quem decide de verdade é o casamento EXATO lá dentro. O custo do
   * portão largo é 17 KB uma vez por sessão; o de um portão estreito seria a
   * base não descer quando alguém digita o codinome — e o decoder calar sem
   * dizer por quê.
   */
  const pareceFicha = PARECE_FICHA.test(debInput.trim());
  useEffect(() => {
    if (!pareceFicha || fichas) return;
    let alive = true;
    loadFichas()
      .then((d) => alive && setFichas(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pareceFicha, fichas]);

  /**
   * Estações geodésicas: dígitos com uma letra opcional (`1400M`, `8121288`).
   * Forma fraquíssima, então quem decide é a base — e ela tem 49 KB.
   *
   * ── DOIS PORTÕES, E ELES TÊM DE CONCORDAR ──────────────────────────────────
   * Este aqui decide se o DADO carrega; o do `estacao-ibge.ts` decide se o
   * decoder emite. Alargar só o segundo não serve de nada: a Onda 0 levou o
   * portão do decoder de 4 para 7 dígitos e mediu "100% da base alcançável",
   * mas este continuou em `\d{1,4}` — então `8121288`, que EXISTE na base,
   * seguia sem card, porque o arquivo nunca era buscado. Conferido no navegador.
   *
   * ── E A COORDENADA TAMBÉM CARREGA ──────────────────────────────────────────
   * O card de mapa mostra os marcos geodésicos por perto (ver
   * `LocationData.perto`), e para isso a base precisa estar na memória quando a
   * entrada é uma COORDENADA — que não se parece nada com um código de estação.
   */
  const t0 = debInput.trim();
  const pareceEstacao = /^[A-Za-z]?\d{1,7}[A-Za-z]?$/.test(t0) || /-?\d{1,3}[.,]\d{3,}/.test(t0);
  useEffect(() => {
    if (!pareceEstacao || estacoes) return;
    let alive = true;
    loadEstacoes()
      .then((d) => alive && setEstacoes(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pareceEstacao, estacoes]);

  /**
   * Articulação municipal de Blumenau (70 KB). O portão é a FORMA da folha —
   * ela estende a nomenclatura nacional, então começa igual e vai mais fundo.
   * Quem decide é o casamento exato, dentro do decoder.
   */
  const pareceFolha = PARECE_FOLHA.test(debInput.trim());
  useEffect(() => {
    if (!pareceFolha || articulacao) return;
    let alive = true;
    loadArticulacao()
      .then((d) => alive && setArticulacao(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pareceFolha, articulacao]);

  // Eixos (quadra de Blumenau): o gate é a FORMA — quatro grupos de números na
  // grade do cadastro (`3-4-10-3`). É a base preguiçosa mais cara (197 KB gz),
  // então o portão aqui é o mais estreito de todos: sem os quatro grupos, nem
  // se pergunta. Quem confere se a quadra existe é o decoder.
  const pareceQuadra = PARECE_QUADRA.test(debInput);
  useEffect(() => {
    if (!pareceQuadra || eixos) return;
    let alive = true;
    loadEixos()
      .then((d) => alive && setEixos(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pareceQuadra, eixos]);

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
  const debLookup = normalizaDigitos(useDebouncedValue(input, 300));

  useEffect(() => {
    const q = debLookup.trim();
    if (!valeConsultar(q)) {
      setHits(null);
      setHitsCarregando(false);
      setHitsErro(null);
      return;
    }
    cancelarSuperadas(q, "bancada");
    let vivo = true;
    setHitsCarregando(true);
    consultar(q, "bancada")
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
      bridges,
      votacoes,
      lojas,
      fichas,
      estacoes,
      eixos,
      articulacao,
    }),
    [
      debKey,
      debAux,
      selectedId,
      hits,
      hitsCarregando,
      hitsErro,
      streets,
      pix,
      bridges,
      votacoes,
      lojas,
      fichas,
      estacoes,
      eixos,
      articulacao,
    ],
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
    // `setSelectedId` deixou de ser o setter estável de um `useState`: quando a
    // rota é a dona da seleção, ele é o `irParaCifra` dela e muda junto. Omitir
    // congelaria a limpeza da cifra numa versão velha da rota.
    [input, setSelectedId],
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
    /**
     * Consulta online fora do ar vira CHIP, não silêncio.
     *
     * O estado já era calculado e passado no contexto — e nenhum componente o
     * lia. Na prática, com a API fora, com o token vencido ou no 429, os cards
     * de CEP, poste, município e aeroporto simplesmente não apareciam, sem
     * distinguir "não encontrei" de "não consegui perguntar". É o que o plano
     * chamava de devolver `[]` calado, e é a mesma regra que o outro repo
     * escreve como "nunca mascarar falha de backend como estado vazio".
     *
     * O aviso diz também o que CONTINUA funcionando, porque quase tudo
     * continua: as 106 cifras, o realce de palavra real e os anagramas são
     * todos locais.
     */
    const daRede: Hint[] = hitsErro
      ? [
          {
            id: "consulta-fora",
            label: "Consultas online indisponíveis",
            detail: `${hitsErro} — cifras, transformações e anagramas seguem funcionando; só CEP, município, aeroporto e poste dependem da rede.`,
            tone: "warn" as const,
          },
        ]
      : [];

    /**
     * O OUTRO jeito de a metade online sumir — e este era CALADO.
     *
     * O portão do `lookup-cache` recusa entrada com quebra de linha ou acima de
     * 64 caracteres. É um portão de custo legítimo, mas o efeito na tela era
     * indistinguível de "não encontrei nada": colar uma lista desligava CEP,
     * município, aeroporto, poste e CID de uma vez, sem uma palavra.
     *
     * O aviso diz o motivo E o que fazer, porque as duas saídas existem hoje:
     * uma linha por vez resolve, e o texto longo tem a Extração.
     */
    const motivo = motivoSemConsulta(debLookup);
    const doPortao: Hint[] =
      motivo === "lista"
        ? [
            {
              id: "consulta-lista",
              label: "Consultas online pausadas: isto é uma lista",
              detail:
                "Enquanto houver mais de uma linha, CEP, município, aeroporto e poste não são consultados aqui — as cifras seguem rodando normalmente. A aba Lote consulta as N linhas de uma vez e devolve uma resposta por linha.",
              tone: "warn" as const,
            },
          ]
        : motivo === "longo"
          ? [
              {
                id: "consulta-longa",
                label: "Consultas online pausadas: texto longo",
                detail: `Acima de 64 caracteres a bancada não consulta CEP, município, aeroporto nem poste (são ${debLookup.trim().length}). As cifras seguem rodando; para isolar um código dentro do texto, a aba Texto separa números e padrões.`,
                tone: "warn" as const,
              },
            ]
          : [];
    // O título pode repetir o que a entrada já disse por caminho independente
    // ("Ask Me" e "84 79 80 79" apontam ambos para ASCII) — uma dica só.
    const seen = new Set(fromInput.map((h) => h.id));
    return [...daRede, ...doPortao, ...fromInput, ...fromTitle.filter((h) => !seen.has(h.id))];
  }, [debInput, debTitle, ctx, hitsErro, debLookup]);

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
