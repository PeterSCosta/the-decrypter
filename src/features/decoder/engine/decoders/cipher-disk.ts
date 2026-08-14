import { defineDecoder } from "../define";
import { scorePlaintext } from "../score";
import type { DecodeCandidate } from "../types";
import { mod } from "../util";

/**
 * Roda alfabética (GIA-17 "Círculos"): um disco de 26 casas com uma linha
 * vermelha marcando o começo — conta-se as casas até a marcada e lê-se a letra.
 * A entrada da prova é IMAGEM ("Prova sem t e x t o"), e contar setores pretos
 * não se automatiza; o que se automatiza é o passo seguinte, quando a equipe já
 * contou: **A1Z26 parametrizado**.
 *
 * A contagem sempre parte da linha vermelha; o que varia é como o disco foi
 * montado — qual letra está na linha vermelha (26 origens), para que lado o
 * alfabeto corre (horário/anti-horário) e se a primeira casa vale 0 ou 1.
 *
 *   letra(v) = alfabeto[(origem ± (v − base)) mod 26]
 *
 * A variante identidade (base 1, horário, origem A) é exatamente o decoder
 * `a1z26`, e a espelhada (base 1, anti-horário, origem Z) é o `a1z26-reverse`.
 * As duas são **puladas de propósito**: `runDecoders` deduplica por output
 * exato, então a roda e a cifra que já existe se matariam uma à outra na sorte
 * do score. Aqui a roda entra para o que a cifra pronta não cobre.
 */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const SECTORS = 26;

/** Sentido em que o ALFABETO corre no disco, relativo à contagem. */
export type CipherDiskDirection = "cw" | "ccw";

/** Uma casa do disco, na ordem de desenho (horário a partir da linha vermelha). */
export interface CipherDiskSector {
  /** 0…25 — posição de desenho; 0 é a casa colada na linha vermelha. */
  slot: number;
  /** Número que se conta nessa casa (`base + slot`). */
  value: number;
  /** Letra que a casa carrega, MAIÚSCULA (convenção de desenho). */
  letter: string;
}

/** Payload de `render: "wheel"` — tudo que o card SVG precisa para desenhar. */
export interface CipherDiskWheel {
  /** Quantas casas o disco tem. Sempre 26 — explícito para o card não supor. */
  sectorCount: number;
  /** Letra na linha vermelha, MAIÚSCULA. */
  origin: string;
  /** Índice da origem no alfabeto (0 = A). */
  originIndex: number;
  direction: CipherDiskDirection;
  /** Número da primeira casa depois da linha vermelha. */
  base: 0 | 1;
  /** As 26 casas, em ordem de desenho horária a partir da linha vermelha. */
  sectors: CipherDiskSector[];
  /** A leitura da entrada: cada número, a casa em que cai e a letra que sai. */
  reading: { value: number; slot: number; letter: string }[];
}

interface Variant {
  label: string;
  notes: string;
  output: string;
  wheel: CipherDiskWheel;
}

/**
 * Números da entrada. Porta de entrada: só dígitos, pelo menos 3 valores e todos
 * em faixa de casa (0…26) — texto, datas com ano e ASCII (>26) não acendem a
 * roda. A faixa exata (0…25 ou 1…26) é o que decide a base, logo abaixo.
 */
function parseCounts(input: string): number[] | null {
  const tokens = input
    .trim()
    .split(/[\s,;.\-_/]+/)
    .filter(Boolean);
  if (tokens.length < 3 || !tokens.every((t) => /^\d{1,2}$/.test(t))) return null;
  const nums = tokens.map(Number);
  return nums.every((n) => n >= 0 && n <= SECTORS) ? nums : null;
}

const DIRECTION_LABEL: Record<CipherDiskDirection, string> = {
  cw: "horário",
  ccw: "anti-horário",
};

function buildVariant(
  values: number[],
  base: 0 | 1,
  direction: CipherDiskDirection,
  originIndex: number,
): Variant {
  const step = direction === "cw" ? 1 : -1;
  const letterAt = (slot: number) => ALPHABET[mod(originIndex + step * slot, SECTORS)];

  const sectors: CipherDiskSector[] = [];
  for (let slot = 0; slot < SECTORS; slot++) {
    sectors.push({ slot, value: base + slot, letter: letterAt(slot).toUpperCase() });
  }

  const reading = values.map((value) => {
    const slot = value - base;
    return { value, slot, letter: letterAt(slot).toUpperCase() };
  });

  const origin = ALPHABET[originIndex].toUpperCase();
  return {
    label: `origem ${origin} · ${DIRECTION_LABEL[direction]} · 1ª casa = ${base}`,
    notes: `Roda de 26 casas: a linha vermelha vale ${base} e carrega ${origin}; daí o alfabeto corre no sentido ${DIRECTION_LABEL[direction]}.`,
    output: values.map((v) => letterAt(v - base)).join(""),
    wheel: { sectorCount: SECTORS, origin, originIndex, direction, base, sectors, reading },
  };
}

const ID = "cipher-disk";
const NAME = "Roda alfabética";
/** Faixa da tabela do `caesar-bruteforce`: visível, mas abaixo de um acerto real. */
const TOP_SCORE = 0.38;
const KEEP = 3;

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "classical",
  decode(input) {
    const values = parseCounts(input);
    if (!values) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    // Base é a numeração da primeira casa; só entra a que cabe na faixa lida.
    // Um 0 e um 26 na mesma lista não cabem no mesmo disco de 26 casas.
    const bases = ([1, 0] as const).filter((b) => min >= b && max <= b + SECTORS - 1);
    if (bases.length === 0) return [];

    const seen = new Set<string>();
    // Sementes do dedup: as leituras que `a1z26` e `a1z26-reverse` já entregam.
    // Elas só existem quando a lista cabe em 1…26 — é a mesma porta daqueles
    // dois decoders. Semear por OUTPUT (e não pular por parâmetro) é o que
    // importa: a mesma leitura reaparece na outra base com outra origem.
    if (min >= 1 && max <= SECTORS) {
      seen.add(values.map((v) => ALPHABET[mod(v - 1, SECTORS)]).join(""));
      seen.add(values.map((v) => ALPHABET[mod(-v, SECTORS)]).join(""));
    }

    const variants: Variant[] = [];
    for (const base of bases) {
      for (const direction of ["cw", "ccw"] as const) {
        for (let originIndex = 0; originIndex < SECTORS; originIndex++) {
          const v = buildVariant(values, base, direction, originIndex);
          // Base e origem são intercambiáveis (base 0 origem X = base 1 origem
          // X+1): varrer as duas bases é honesto, mas a segunda só sobrevive
          // quando a primeira não cobre a faixa.
          if (seen.has(v.output)) continue;
          seen.add(v.output);
          variants.push(v);
        }
      }
    }

    return variants
      .map((v) => ({ v, s: scorePlaintext(v.output) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, KEEP)
      .map<DecodeCandidate>(({ v }, i) => ({
        decoderId: ID,
        decoderName: NAME,
        category: "classical",
        label: v.label,
        output: v.output,
        notes: v.notes,
        // Degrau de 0.01 para a roda mais legível ficar no topo das próprias
        // irmãs — sem isso o desempate cai no comprimento da saída, que é igual.
        forcedScore: TOP_SCORE - i * 0.01,
        // `render` não é textual, então sem isto o cartão não encadeia.
        chainValue: v.output,
        render: "wheel",
        data: v.wheel,
      }));
  },
});
