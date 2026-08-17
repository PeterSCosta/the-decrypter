import { achaPonte } from "@/features/bridge/match";
import { type GeoPoint, detectLocation, prepararDeteccao } from "@/features/location/formats";
import type { StreetRow } from "@/features/street-guide/types";
import { fetchCep } from "@/lib/brasilapi";
import { loadBridges, loadStreets } from "@/lib/data";
import { geocode } from "@/lib/geocode";

/**
 * Uma linha digitada vira um ponto no mapa. A ordem das tentativas é a ordem da
 * certeza: primeiro o que se decide sozinho (uma coordenada é uma coordenada),
 * por último o que depende da rede e de um palpite (o geocodificador).
 */

export type Origem = "coordenada" | "cep" | "ponte" | "rua" | "endereço";

export interface PontoResolvido extends GeoPoint {
  /**
   * Posição na lista de caixas de texto.
   *
   * Sem ela, o índice de um marcador no mapa NÃO correspondia ao da caixa: os
   * vazios eram descartados antes de resolver e as falhas somem de `pontos`.
   * Arrastar o terceiro marcador escreveria na terceira caixa — que podia ser
   * outra. Agora a resolução preserva as posições e cada ponto sabe de onde veio.
   */
  indice: number;
  /** O que a pessoa digitou. */
  entrada: string;
  /** Nome legível do que foi encontrado. */
  rotulo: string;
  origem: Origem;
  /** Detalhe da procedência ("Graus decimais", "Lei 8492/2017", "Nominatim"…). */
  detalhe: string;
}

export interface FalhaResolucao {
  indice: number;
  entrada: string;
  motivo: string;
}

export type Resultado = PontoResolvido | FalhaResolucao;
export const resolveu = (r: Resultado): r is PontoResolvido => "lat" in r;

const CIDADE_PADRAO = "Blumenau, Santa Catarina, Brasil";

function normaliza(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Índice de nomes de rua já normalizados, por dataset.
 *
 * `normaliza` faz NFD + quatro `replace` de regex; sem cache, achar uma rua
 * custava até 8.852 execuções dela (dois `find` sobre 4.426 linhas), todas
 * recalculando exatamente os mesmos nomes. É o mesmo `WeakMap` que
 * `engine/lookups.ts` já usa para o índice dobrado.
 */
const ruasNormalizadas = new WeakMap<StreetRow[], { row: StreetRow; nome: string }[]>();

function comGeoNormalizado(rows: StreetRow[]): { row: StreetRow; nome: string }[] {
  let idx = ruasNormalizadas.get(rows);
  if (!idx) {
    idx = rows
      .filter((r) => r.lat != null && r.lng != null)
      .map((row) => ({ row, nome: normaliza(row.nome) }));
    ruasNormalizadas.set(rows, idx);
  }
  return idx;
}

function achaRua(alvo: string, rows: StreetRow[]): StreetRow | null {
  const q = normaliza(alvo).replace(/^(RUA|R|AVENIDA|AV|TRAVESSA|TV|ESTRADA|RODOVIA|ALAMEDA) /, "");
  if (q.length < 4) return null;
  const comGeo = comGeoNormalizado(rows);
  return (
    comGeo.find((e) => e.nome === q)?.row ?? comGeo.find((e) => e.nome.includes(q))?.row ?? null
  );
}

/** Tem número de porta? Então só o geocodificador resolve — o rol de ruas não. */
const TEM_NUMERO = /,\s*n?º?\s*\d+|\s\d{1,5}\s*$/i;

export async function resolvePonto(entrada: string, indice = 0): Promise<Resultado> {
  const texto = entrada.trim();
  if (!texto) return { indice, entrada, motivo: "vazio" };

  // 1. Coordenada em qualquer dos formatos que a bancada já conhece. Aqui dá
  // para esperar a lib sob demanda (H3), ao contrário do fan-out síncrono.
  await prepararDeteccao(texto);
  const coord = detectLocation(texto);
  if (coord) {
    return {
      indice,
      entrada,
      lat: coord.lat,
      lng: coord.lng,
      rotulo: texto,
      origem: "coordenada",
      detalhe: coord.format,
    };
  }

  // 2. CEP — 8 dígitos, base local.
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 8 && /^\d{5}-?\d{3}$/.test(texto.replace(/\s/g, ""))) {
    // Pela API: os 40.445 CEPs deixaram de ser baixados pelo navegador. Aqui
    // dá para esperar — a Triangulação já resolve em `async`.
    const hit = await fetchCep(digitos).catch(() => null);
    if (hit?.lat != null && hit.lng != null) {
      return {
        indice,
        entrada,
        lat: hit.lat,
        lng: hit.lng,
        rotulo: `${hit.logradouro || hit.cep} — ${hit.localidade ?? ""}`,
        origem: "cep",
        detalhe: `CEP ${hit.cep}`,
      };
    }
  }

  // 3. Ponte pelo nome ou pelo apelido — a base local sabe onde cada uma está.
  if (/\b(ponte|passarela|viaduto)\b/i.test(texto)) {
    const base = await loadBridges().catch(() => null);
    const acerto = base && achaPonte(texto, base.rows, { exigirGeo: true });
    const p = acerto?.ponte;
    if (p?.lat != null && p.lng != null) {
      return {
        indice,
        entrada,
        lat: p.lat,
        lng: p.lng,
        rotulo: p.nome,
        origem: "ponte",
        detalhe: p.lei ? `Lei ${p.lei}` : "OpenStreetMap",
      };
    }
  }

  // 4. Endereço com número: só a geocodificação resolve. Sem cidade escrita, a
  // consulta assume Blumenau — é a cidade de todo o resto da bancada.
  if (TEM_NUMERO.test(texto)) {
    const q = /blumenau|itaja|,\s*sc\b/i.test(texto) ? texto : `${texto}, ${CIDADE_PADRAO}`;
    const g = await geocode(q).catch(() => null);
    if (g) {
      return { indice, entrada, ...g, rotulo: texto, origem: "endereço", detalhe: "Nominatim/OSM" };
    }
  }

  // 5. Rua sem número: o centroide do logradouro, do rol de ruas local.
  const ruas = await loadStreets().catch(() => null);
  const rua = ruas && achaRua(texto, ruas.rows);
  if (rua?.lat != null && rua.lng != null) {
    return {
      indice,
      entrada,
      lat: rua.lat,
      lng: rua.lng,
      rotulo: `${rua.tipo} ${rua.nome}`,
      origem: "rua",
      detalhe: `${rua.bairro} · centro do logradouro`,
    };
  }

  // 6. Última tentativa: joga no geocodificador do jeito que veio.
  const g = await geocode(
    /blumenau|itaja|,\s*sc\b/i.test(texto) ? texto : `${texto}, ${CIDADE_PADRAO}`,
  ).catch(() => null);
  if (g)
    return { indice, entrada, ...g, rotulo: texto, origem: "endereço", detalhe: "Nominatim/OSM" };

  return { indice, entrada, motivo: "não foi possível localizar" };
}

/**
 * Resolve a lista toda **sem descartar as vazias**, para que o índice de cada
 * resultado seja o índice da caixa de texto que o originou. Quem consome filtra
 * depois; quem escreve de volta (o arraste no mapa) depende dessa correspondência.
 */
export function resolveTodos(entradas: string[]): Promise<Resultado[]> {
  return Promise.all(entradas.map((e, i) => resolvePonto(e, i)));
}
