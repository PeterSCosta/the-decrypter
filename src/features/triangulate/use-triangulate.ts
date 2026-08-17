import type { GeoPoint } from "@/features/location/formats";
import { useCallback, useMemo, useState } from "react";
import {
  type Rota,
  type Triangulo,
  centroide,
  circuncentro,
  incentro,
  medianaGeometrica,
  ordemMaisCurta,
  rota as rotaDe,
  triangulo as trianguloDe,
} from "./geometry";
import { type Resultado, resolveTodos, resolveu } from "./resolve";

export interface Centros {
  centroide: GeoPoint | null;
  /** Equidistante dos três — só existe com exatamente 3 pontos não alinhados. */
  circuncentro: GeoPoint | null;
  incentro: GeoPoint | null;
  /** Menor soma de distâncias (ponto de encontro mais justo). */
  mediana: GeoPoint | null;
}

const VAZIO = ["", "", ""];

export function useTriangulate() {
  const [entradas, setEntradas] = useState<string[]>(VAZIO);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [desenharRota, setDesenharRota] = useState(true);
  const [fechar, setFechar] = useState(false);

  const troca = useCallback((i: number, valor: string) => {
    setEntradas((cur) => cur.map((v, j) => (j === i ? valor : v)));
  }, []);
  const adiciona = useCallback(() => setEntradas((cur) => [...cur, ""]), []);
  const remove = useCallback((i: number) => {
    setEntradas((cur) => (cur.length <= 2 ? cur : cur.filter((_, j) => j !== i)));
  }, []);
  const limpa = useCallback(() => {
    setEntradas(VAZIO);
    setResultados(null);
  }, []);

  /**
   * `resultados` guarda a resposta da última resolução, não das entradas atuais
   * — quem digita continua vendo o mapa anterior enquanto edita, e o botão é que
   * confirma. Reconsultar a cada tecla derrubaria o Nominatim.
   */
  const resolver = useCallback(async () => {
    if (entradas.filter((e) => e.trim()).length < 2) return;
    setCarregando(true);
    try {
      // A lista inteira, vazias inclusive: é o que mantém `resultado.indice`
      // igual ao índice da caixa de texto. As vazias voltam como falha "vazio"
      // e são filtradas na exibição.
      setResultados(await resolveTodos(entradas));
    } finally {
      setCarregando(false);
    }
  }, [entradas]);

  /** Aplica a ordem mais curta às caixas de texto — a rota se redesenha sozinha. */
  const otimizar = useCallback(() => {
    if (!resultados) return;
    const pts = resultados.filter(resolveu);
    if (pts.length < 3) return;
    const ordem = ordemMaisCurta(pts);
    // Reordenar renumera: o índice tem de acompanhar a nova posição, senão o
    // arraste passaria a escrever na caixa errada logo depois de otimizar.
    setEntradas(ordem.map((i) => pts[i].entrada));
    setResultados(ordem.map((i, novo) => ({ ...pts[i], indice: novo })));
  }, [resultados]);

  /**
   * Arrastou o marcador: a coordenada volta para a caixa de texto.
   *
   * Gravar `lat, lng` em `entradas[indice]` fecha o ciclo — aquele texto
   * reentra pelo ramo 1 do `resolvePonto` (graus decimais) e vira o mesmo ponto.
   * É o mesmo padrão que `otimizar` já usava para manter texto e resultado em
   * sincronia; sem ele, o mapa e as caixas contariam histórias diferentes.
   */
  const moverPonto = useCallback((indice: number, lat: number, lng: number) => {
    const texto = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setEntradas((cur) => cur.map((v, j) => (j === indice ? texto : v)));
    setResultados((cur) =>
      (cur ?? []).map((r) =>
        r.indice === indice && resolveu(r)
          ? {
              ...r,
              lat,
              lng,
              entrada: texto,
              rotulo: texto,
              origem: "coordenada",
              detalhe: "movido no mapa",
            }
          : r,
      ),
    );
  }, []);

  /**
   * Escolheu uma sugestão: ela **já traz a coordenada**, então entra direto
   * como ponto resolvido em vez de voltar para a escada do `resolvePonto`.
   * Redescobrir pelo texto seria jogar fora a certeza que a escolha deu — e o
   * "Rua Progresso" que a pessoa clicou poderia virar outro "Progresso".
   */
  const escolherSugestao = useCallback(
    (
      indice: number,
      item: {
        texto: string;
        rotulo: string;
        detalheOrigem: string;
        origem: "rua" | "ponte";
        lat: number;
        lng: number;
      },
    ) => {
      setEntradas((cur) => cur.map((v, j) => (j === indice ? item.texto : v)));
      setResultados((cur) =>
        [
          ...(cur ?? []).filter((r) => r.indice !== indice),
          {
            indice,
            entrada: item.texto,
            lat: item.lat,
            lng: item.lng,
            rotulo: item.rotulo,
            origem: item.origem,
            detalhe: item.detalheOrigem,
          },
        ].sort((a, b) => a.indice - b.indice),
      );
    },
    [],
  );

  /** Clicou no mapa: entra como ponto novo no fim da lista, já resolvido. */
  const adicionarNoMapa = useCallback((lat: number, lng: number) => {
    const texto = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setEntradas((cur) => {
      // Aproveita a primeira caixa vazia; só cria uma nova se não houver.
      const vaga = cur.findIndex((v) => !v.trim());
      const indice = vaga >= 0 ? vaga : cur.length;
      const novas = vaga >= 0 ? cur.map((v, j) => (j === vaga ? texto : v)) : [...cur, texto];
      setResultados((res) =>
        [
          ...(res ?? []).filter((r) => r.indice !== indice),
          {
            indice,
            entrada: texto,
            lat,
            lng,
            rotulo: texto,
            origem: "coordenada" as const,
            detalhe: "marcado no mapa",
          },
        ].sort((a, b) => a.indice - b.indice),
      );
      return novas;
    });
  }, []);

  const pontos = useMemo(() => (resultados ?? []).filter(resolveu), [resultados]);
  const falhas = useMemo(
    // Campo em branco não é falha: ninguém precisa ser avisado de que não
    // digitou nada.
    () => (resultados ?? []).filter((r) => !resolveu(r) && r.motivo !== "vazio"),
    [resultados],
  );

  const centros: Centros = useMemo(() => {
    if (pontos.length < 2)
      return { centroide: null, circuncentro: null, incentro: null, mediana: null };
    const tres = pontos.length === 3 ? pontos : null;
    return {
      centroide: centroide(pontos),
      circuncentro: tres ? circuncentro(tres[0], tres[1], tres[2]) : null,
      incentro: tres ? incentro(tres[0], tres[1], tres[2]) : null,
      mediana: medianaGeometrica(pontos),
    };
  }, [pontos]);

  const triangulo: Triangulo | null = useMemo(
    () => (pontos.length === 3 ? trianguloDe(pontos[0], pontos[1], pontos[2]) : null),
    [pontos],
  );

  const rota: Rota | null = useMemo(() => (pontos.length > 1 ? rotaDe(pontos) : null), [pontos]);

  return {
    entradas,
    troca,
    adiciona,
    remove,
    limpa,
    resolver,
    otimizar,
    moverPonto,
    adicionarNoMapa,
    escolherSugestao,
    carregando,
    pontos,
    falhas,
    centros,
    triangulo,
    rota,
    desenharRota,
    setDesenharRota,
    fechar,
    setFechar,
  };
}
