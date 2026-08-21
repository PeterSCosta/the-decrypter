import {
  type IndexSpec,
  type ZipResult,
  constIndex,
  pairIndex,
  parseIndexSpecs,
  tripleIndex,
  zipIndex,
} from "@/features/positions/zip";
import { defineDecoder } from "../define";
import type { DecodeCandidate } from "../types";
import { isUseful } from "../util";

/**
 * "Letra por posição indexada" — a mecânica nº 1 do acervo (15 das 41 fichas da
 * GIA de 2026). A entrada multi-linha são as FONTES (um imperador, um candidato,
 * uma cor por linha) e a chave são os ÍNDICES, aceitando romanos porque a prova
 * dos imperadores traz "I V II IV IV III" esculpido nos bustos.
 *
 * Porta de entrada: a chave tem que ser SÓ índices (`parseIndexSpecs` devolve
 * null se um pedaço qualquer não for) — uma chave de Vigenère nunca acende este
 * decoder, então ele não custa nada ao fan-out. Por isso também o `forcedScore`
 * fixo: a saída é um pedaço de resposta ("TITULOELEITOR"), que o scorer de
 * texto puniria pela sequência de consoantes.
 */

const ID = "letter-index";
const NAME = "Letra por posição";

function cand(label: string, r: ZipResult, score: number, note?: string): DecodeCandidate | null {
  // Índice pedido que não achou letra é leitura errada, não resposta parcial.
  if (r.misses > 0 || r.picks.length === 0 || !r.result) return null;
  const trilha = r.picks
    .slice(0, 8)
    .map((p) => `${p.source.slice(0, 18)}[${p.fromEnd ? "-" : ""}${p.position}]=${p.char}`)
    .join(" · ");
  return {
    decoderId: ID,
    decoderName: NAME,
    category: "transform",
    label,
    output: r.result,
    notes: [note, r.picks.length > 8 ? `${trilha} …` : trilha].filter(Boolean).join(" — "),
    forcedScore: score,
  };
}

/** Cada linha não vazia é uma fonte; uma linha só = o texto corrido clássico. */
const splitSources = (input: string) =>
  input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

function modes(sources: string[], specs: IndexSpec[]): (DecodeCandidate | null)[] {
  const forward = specs.map((s) => (s.fromEnd ? -s.position : s.position));
  const backward = specs.map((s) => -s.position);
  // Só oferece a leitura do fim quando a chave não escolheu a direção.
  const reversible = specs.every((s) => !s.fromEnd);

  if (specs.some((s) => s.sub !== undefined)) {
    // Trinca fonte→palavra→letra (a cifra de livro, `8-4-3`). Mesma regra do
    // par: misturar trinca com o resto seria adivinhação.
    if (!specs.every((s) => s.sub !== undefined)) return [];
    return [cand("trincas fonte → palavra → letra", tripleIndex(sources, specs), 0.6)];
  }

  if (specs.some((s) => s.source !== undefined)) {
    // Par fonte→letra (A3L6 do estatuto, 33.9 do mapa da Oktoberfest): misturar
    // par com índice solto seria adivinhação, então exige-se o par em todos.
    if (!specs.every((s) => s.source !== undefined)) return [];
    const out = [cand("pares fonte → letra", pairIndex(sources, specs), 0.6)];
    // `7-3` admite as DUAS leituras e a folha não diz qual — então saem as duas,
    // rotuladas, e quem lê decide. `A3L6` e `33.9` não são ambíguos e seguem com
    // um cartão só. A leitura que não fechar morre sozinha no `cand` (misses>0).
    if (specs.every((s) => s.viaHifen)) {
      const soltos = specs.flatMap((s) => [s.source as number, s.position]);
      const base = sources.length === 1 ? soltos.map(() => sources[0]) : sources;
      out.push(
        cand(
          `${soltos.length} índices soltos (o hífen lido como separador)`,
          zipIndex(base, soltos),
          0.5,
        ),
      );
    }
    return out;
  }

  if (sources.length === 1) {
    const um = specs.map(() => sources[0]);
    return [
      cand(`${specs.length} posições no texto`, zipIndex(um, forward), 0.6),
      reversible ? cand("posições contadas do fim", zipIndex(um, backward), 0.55) : null,
    ];
  }

  if (specs.length === 1) {
    const k = specs[0].position;
    return [
      cand("mesmo índice em todas as fontes", constIndex(sources, k, specs[0].fromEnd), 0.6),
      reversible ? cand("mesmo índice, contado do fim", constIndex(sources, k, true), 0.55) : null,
    ];
  }

  const nota =
    sources.length === specs.length
      ? undefined
      : `${sources.length} fontes para ${specs.length} índices`;
  return [
    cand(
      `zip: ${sources.length} fontes × ${specs.length} índices`,
      zipIndex(sources, forward),
      0.6,
      nota,
    ),
    reversible ? cand("zip, contado do fim", zipIndex(sources, backward), 0.55) : null,
  ];
}

export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "transform",
  inputs: {
    key: {
      label: "Índices",
      placeholder: "1 5 2 4 4 3  ·  I V II IV  ·  -5  ·  A3L6  ·  7-3  ·  8-4-3",
    },
  },
  decode(input, ctx) {
    const specs = parseIndexSpecs(ctx.key ?? "");
    if (!specs) return [];
    const sources = splitSources(input);
    if (sources.length === 0) return [];

    const out: DecodeCandidate[] = [];
    for (const c of modes(sources, specs)) {
      if (!c || !isUseful(c.output, input)) continue;
      // Variante do fim que repete a do início não vale um segundo cartão.
      if (out.some((prev) => prev.output === c.output)) continue;
      out.push(c);
    }
    return out;
  },
});
