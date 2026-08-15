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
    const lista = entradas.map((e) => e.trim()).filter(Boolean);
    if (lista.length < 2) return;
    setCarregando(true);
    try {
      setResultados(await resolveTodos(lista));
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
    setEntradas(ordem.map((i) => pts[i].entrada));
    setResultados(ordem.map((i) => pts[i]));
  }, [resultados]);

  const pontos = useMemo(() => (resultados ?? []).filter(resolveu), [resultados]);
  const falhas = useMemo(() => (resultados ?? []).filter((r) => !resolveu(r)), [resultados]);

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
