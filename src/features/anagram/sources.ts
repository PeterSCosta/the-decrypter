import type { StreetsData } from "@/features/street-guide/types";
import { fold } from "./solve";

/**
 * Conectivos que aparecem soltos nos nomes de logradouro ("R. Sete de Setembro").
 * Como token isolado só geram ruído; dentro do nome completo continuam contando.
 */
const CONECTIVOS = new Set(["das", "dos", "com", "sem", "por", "sob", "sobre", "para"]);

/** Tamanho mínimo de um token de nome de rua para virar entrada do dicionário. */
const MIN_TOKEN = 3;

/**
 * Vocabulário local de Blumenau: bairros, nomes de logradouro inteiros e os
 * termos de cada nome. É o que filtra bem quando o destino do enigma é nome
 * próprio local — a wordlist genérica não tem "Itoupava" nem "Garcia".
 */
export function streetVocabulary(data: StreetsData): string[] {
  // O rol traz o mesmo nome em caixas diferentes ("Garcia" no bairro, "GARCIA"
  // no logradouro). Guarda uma grafia só por palavra, preferindo a que não é
  // toda maiúscula — duas fichas idênticas na tela são ruído sem informação.
  const out = new Map<string, string>();
  const add = (value: string) => {
    const k = fold(value);
    const atual = out.get(k);
    if (!atual || (atual === atual.toUpperCase() && value !== value.toUpperCase())) {
      out.set(k, value);
    }
  };

  for (const row of data.rows) {
    const bairro = row.bairro?.trim();
    if (bairro) add(bairro);
    const nome = row.nome?.trim();
    if (!nome) continue;
    add(nome);
    for (const raw of nome.split(/[\s.,;/\-–—()]+/)) {
      const tok = raw.trim();
      if (tok.length < MIN_TOKEN) continue;
      if (CONECTIVOS.has(fold(tok))) continue;
      add(tok);
    }
  }
  return [...out.values()];
}
