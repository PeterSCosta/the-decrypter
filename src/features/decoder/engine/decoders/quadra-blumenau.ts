import { type QuadraBlumenau, normalizarQuadra, porQuadra } from "@/features/eixos/types";
import { defineDecoder } from "../define";
import type { LocationData } from "./location";

/**
 * Quadra de Blumenau (`3-4-10-3`) → as ruas que a cercam, e onde ela fica.
 *
 * ── O QUE ESTE NÚMERO É, E POR QUE NÃO É O DECODER DE LOTE ──────────────────
 * A inscrição imobiliária tem cinco grupos (`4-1-24-20-2`): distrito, setor,
 * subsetor, QUADRA e lote. Tirando o último, sobra o endereço do QUARTEIRÃO
 * inteiro — 917 deles na cidade. O decoder `lote-blumenau` responde pelos cinco
 * grupos e não reage a quatro; até aqui, quem digitasse a quadra sozinha (é o
 * que sobra quando a prova entrega meia inscrição, ou quando o carnê está
 * rasgado) não recebia nada.
 *
 * ── POR QUE A RESPOSTA SÃO AS RUAS, E NÃO UM POLÍGONO ───────────────────────
 * A camada de eixos não desenha a quadra: ela diz, para cada TRECHO de rua, que
 * quadra fica de cada lado. Então a quadra se descreve pelo avesso — pelas ruas
 * que a margeiam. O que é bom para uma gincana: "a quadra cercada por
 * Gervásio João de Sena, Franz Müller e José Reuter" é uma instrução que se
 * cumpre a pé, coisa que um polígono não é.
 *
 * ── O LADO É INFORMAÇÃO DE VERDADE (MEDIDO) ─────────────────────────────────
 * Em 50,9% dos 9.370 trechos a quadra da direita difere da quadra da esquerda,
 * então dizer de que lado a quadra está não é enfeite: é o que distingue os
 * dois quarteirões que dividem a mesma rua. (O CEP por lado, na mesma camada,
 * NÃO tem essa propriedade — difere em 1,1% dos trechos —, e por isso não virou
 * decoder nenhum.)
 *
 * ── "QUADRA" NEM SEMPRE É QUARTEIRÃO, E O CARD NÃO PODE FINGIR QUE É ────────
 * Medido nas 917: a MEDIANA tem 4 ruas em volta e 23 lotes dentro — isso é um
 * quarteirão, e é o caso de 61,5% delas (≤4 ruas). Só que a cauda é longa: 7,3%
 * passam de 20 ruas, e a maior tem 97 ruas e 2.476 lotes. Essas não são
 * quarteirão nenhum — são as zonas grandes da borda da cidade, onde o cadastro
 * fiscal desenhou uma quadra do tamanho de um bairro. Prometer "o quarteirão
 * cercado por" para uma delas seria mandar a equipe procurar um quarteirão que
 * não existe, então o card muda de palavra conforme o tamanho: quarteirão
 * quando é quarteirão, "área" quando é área.
 *
 * ── A NOTA ──────────────────────────────────────────────────────────────────
 * Quatro números pequenos com hífen não são uma assinatura forte: cabem numa
 * data mal digitada ou num placar. Quem decide é a base — o portão de forma
 * segue a grade real do cadastro e, mesmo assim, só existe card se a quadra
 * EXISTIR entre as 917. Daí uma nota média, não uma nota de chave única. E cai
 * junto com a precisão da resposta: um ponto no meio de uma zona de 97 ruas
 * localiza muito menos que um no meio de um quarteirão de duas, e a nota tem de
 * dizer isso em vez de deixar as duas parecerem a mesma coisa.
 */
function confianca(q: QuadraBlumenau): number {
  const n = q.ruas.length;
  if (n > 20) return 0.5; // zona grande: o ponto localiza um bairro, não um lugar
  if (n > 8) return 0.6;
  if (n > 4) return 0.68;
  return 0.75; // quarteirão de verdade — a mediana do cadastro
}

function cartao(q: QuadraBlumenau) {
  const ruas = q.ruas.slice(0, 6).join(", ");
  const resto = q.ruas.length > 6 ? ` +${q.ruas.length - 6}` : "";
  const cep = q.ceps.length === 1 ? ` · CEP ${q.ceps[0]}` : "";
  // Acima de 8 ruas em volta já se saiu do p80 do cadastro: 15 ruas não é
  // quarteirão que alguém contorna a pé, é área. A palavra troca junto com a
  // faixa de nota, para o texto e o número contarem a mesma história.
  const zona = q.ruas.length > 8;
  const verbo = zona ? "área do cadastro, com ruas" : "quarteirão cercado por";
  const ponto = zona
    ? "centro da ÁREA — ela é grande, então isto aponta a região, não um lugar"
    : "centro aproximado, calculado pelas ruas em volta";

  const data: LocationData = {
    lat: q.lat,
    lng: q.lng,
    label: `Quadra ${q.quadra}${q.bairro ? ` — ${q.bairro}` : ""}`,
    // A precisão do ponto é dita em palavras, porque o mapa não a mostra: o
    // marcador de uma quadra de 97 ruas tem a mesma cara do de uma de duas. E a
    // dica de encadeamento: com o número do lote, esta mesma chave vira a
    // inscrição imobiliária inteira.
    detail:
      `${verbo} ${ruas}${resto}${cep} — ${ponto}. ` +
      `Os lotes desta quadra têm inscrição ${q.quadra}-<lote>`,
    format: "Quadra (Blumenau)",
  };

  return {
    decoderId: "quadra-blumenau",
    decoderName: "Quadra (Blumenau)",
    category: "lookup" as const,
    label: `quadra ${q.quadra} · ${q.ruas.length} rua(s)`,
    output: `Quadra ${q.quadra}${q.bairro ? ` (${q.bairro})` : ""} — ${verbo} ${ruas}${resto}`,
    forcedScore: confianca(q),
    render: "map" as const,
    chainValue: `${q.lat}, ${q.lng}`,
    data,
  };
}

export const decoders = defineDecoder({
  id: "quadra-blumenau",
  name: "Quadra (Blumenau)",
  category: "lookup",
  decode(input, ctx) {
    // Portão barato antes de varrer 9.370 trechos: quatro grupos na grade do
    // cadastro. Sem base carregada não há o que responder.
    if (!ctx.eixos || !normalizarQuadra(input)) return [];
    const q = porQuadra(ctx.eixos, input);
    return q ? [cartao(q)] : [];
  },
});
