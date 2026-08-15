import type { BridgeRow } from "@/features/bridge/types";
import type { CepHit } from "@/features/cep/types";
import { toHit } from "@/features/cep/types";
import { type GeoPoint, detectLocation } from "@/features/location/formats";
import type { StreetRow } from "@/features/street-guide/types";
import { loadBridges, loadCeps, loadStreets } from "@/lib/data";
import { geocode } from "@/lib/geocode";

/**
 * Uma linha digitada vira um ponto no mapa. A ordem das tentativas é a ordem da
 * certeza: primeiro o que se decide sozinho (uma coordenada é uma coordenada),
 * por último o que depende da rede e de um palpite (o geocodificador).
 */

export type Origem = "coordenada" | "cep" | "ponte" | "rua" | "endereço";

export interface PontoResolvido extends GeoPoint {
  /** O que a pessoa digitou. */
  entrada: string;
  /** Nome legível do que foi encontrado. */
  rotulo: string;
  origem: Origem;
  /** Detalhe da procedência ("Graus decimais", "Lei 8492/2017", "Nominatim"…). */
  detalhe: string;
}

export interface FalhaResolucao {
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

/** Casa "ponte de ferro" com "Ponte Aldo Pereira de Andrade (Ponte de Ferro)". */
function achaPonte(alvo: string, rows: BridgeRow[]): BridgeRow | null {
  const q = normaliza(alvo);
  if (q.length < 4) return null;
  const comGeo = rows.filter((r) => r.lat !== null && r.lng !== null);
  const candidatos = comGeo.filter((r) =>
    [r.nome, r.nomeOsm ?? "", ...r.apelidos].some((n) => n && normaliza(n).includes(q)),
  );
  if (!candidatos.length) return null;
  // Empate ("ponte" casa com tudo): o nome mais curto é o mais específico.
  return candidatos.sort((a, b) => a.nome.length - b.nome.length)[0];
}

function achaCep(digitos: string, rows: CepHit[]): CepHit | null {
  return rows.find((r) => r.cep === digitos && r.lat !== null && r.lng !== null) ?? null;
}

function achaRua(alvo: string, rows: StreetRow[]): StreetRow | null {
  const q = normaliza(alvo).replace(/^(RUA|R|AVENIDA|AV|TRAVESSA|TV|ESTRADA|RODOVIA|ALAMEDA) /, "");
  if (q.length < 4) return null;
  const comGeo = rows.filter((r) => r.lat != null && r.lng != null);
  return (
    comGeo.find((r) => normaliza(r.nome) === q) ??
    comGeo.find((r) => normaliza(r.nome).includes(q)) ??
    null
  );
}

/** Tem número de porta? Então só o geocodificador resolve — o rol de ruas não. */
const TEM_NUMERO = /,\s*n?º?\s*\d+|\s\d{1,5}\s*$/i;

export async function resolvePonto(entrada: string): Promise<Resultado> {
  const texto = entrada.trim();
  if (!texto) return { entrada, motivo: "vazio" };

  // 1. Coordenada em qualquer dos formatos que a bancada já conhece.
  const coord = detectLocation(texto);
  if (coord) {
    return {
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
    const base = await loadCeps().catch(() => null);
    const hit =
      base &&
      achaCep(
        digitos,
        base.rows.map((r) => toHit(r, base.municipios)),
      );
    if (hit?.lat != null && hit.lng != null) {
      return {
        entrada,
        lat: hit.lat,
        lng: hit.lng,
        rotulo: `${hit.logradouro || hit.cep} — ${hit.municipio}`,
        origem: "cep",
        detalhe: `CEP ${hit.cep}`,
      };
    }
  }

  // 3. Ponte pelo nome ou pelo apelido — a base local sabe onde cada uma está.
  if (/\b(ponte|passarela|viaduto)\b/i.test(texto)) {
    const base = await loadBridges().catch(() => null);
    const p = base && achaPonte(texto, base.rows);
    if (p?.lat != null && p.lng != null) {
      return {
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
      return { entrada, ...g, rotulo: texto, origem: "endereço", detalhe: "Nominatim/OSM" };
    }
  }

  // 5. Rua sem número: o centroide do logradouro, do rol de ruas local.
  const ruas = await loadStreets().catch(() => null);
  const rua = ruas && achaRua(texto, ruas.rows);
  if (rua?.lat != null && rua.lng != null) {
    return {
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
  if (g) return { entrada, ...g, rotulo: texto, origem: "endereço", detalhe: "Nominatim/OSM" };

  return { entrada, motivo: "não foi possível localizar" };
}

/** Resolve a lista toda, preservando a ordem digitada. */
export function resolveTodos(entradas: string[]): Promise<Resultado[]> {
  return Promise.all(entradas.map(resolvePonto));
}
