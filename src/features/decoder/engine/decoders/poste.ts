import { enderecoDoPoste } from "@/features/poste/types";
import type { DecodeCandidate, DecodeContext, Decoder } from "../types";

/**
 * Plaqueta de poste → o poste.
 *
 * `docs/PLANO-CIFRAS.md:439` concluiu, com razão, que isto não podia ser um
 * decoder: *"uma plaqueta de poste é um número. Não existe regex, DV ou faixa
 * que os distinga de qualquer número — um decoder disparando em '4 dígitos'
 * seria ruído puro"*. Continua verdade **para um decoder que chuta pela forma**.
 *
 * O que mudou é que ele não chuta mais: a consulta acontece **antes** do
 * fan-out (`/api/lookup`), e este decoder só emite quando existe um poste de
 * verdade com aquela plaqueta. Não é palpite de forma, é acerto confirmado.
 *
 * O score varia com o comprimento porque a informação varia: plaquetas de 5-6
 * dígitos são 78% da base e discriminam quase tanto quanto um CEP; uma de 2
 * dígitos casa com quase qualquer número curto que alguém digite, e ficar acima
 * de `street-code` (0,97) com isso seria voltar a mentir no ranking.
 */
function confianca(plaqueta: string): number {
  if (plaqueta.length >= 5) return 0.9;
  if (plaqueta.length === 4) return 0.7;
  return 0.5;
}

const poste: Decoder = {
  id: "poste",
  name: "Poste (Cidade Iluminada)",
  category: "lookup",
  decode(input: string, ctx: DecodeContext): DecodeCandidate[] {
    const p = ctx.hits?.poste;
    if (!p) return [];
    // O acerto tem de ser da entrada atual: `hits` pode ser de uma tecla atrás.
    if (ctx.hits?.q !== input.trim()) return [];

    const plaqueta = p.plaqueta ?? String(p.id);
    const endereco = enderecoDoPoste(p);
    return [
      {
        decoderId: "poste",
        decoderName: "Poste (Cidade Iluminada)",
        category: "lookup",
        label: `plaqueta ${plaqueta}`,
        // A plaqueta entra na saída de propósito: o motor deduplica por texto
        // exato, e um endereço solto colidiria com o card de rua.
        output: `Poste ${plaqueta} — ${endereco}${p.bairro ? ` · ${p.bairro}` : ""}`,
        forcedScore: confianca(plaqueta),
        render: "poste",
        data: p,
        // Sem isto o botão "usar como entrada" não aparece: `chainValueOf`
        // devolve null para todo render não-textual sem `chainValue`.
        chainValue: `${p.lat}, ${p.lng}`,
      },
    ];
  },
};

export const decoders = [poste];
