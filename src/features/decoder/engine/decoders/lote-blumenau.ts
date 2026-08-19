import type { LoteBlumenau } from "@/lib/lookup-cache";
import { defineDecoder } from "../define";
import type { LocationData } from "./location";

/**
 * Inscrição imobiliária de Blumenau → o lote no mapa.
 *
 * ── POR QUE ESTE NÚMERO INTERESSA A UMA PROVA ───────────────────────────────
 * É a mesma família do VM da planta de valores, que a GIA-20 e a GIA-34 usaram:
 * um número burocrático, estável e público, que identifica um pedaço específico
 * da cidade. A diferença é que o VM está zerado na publicação e este não — os
 * 84.539 lotes vieram inteiros do geoportal.
 *
 * ── AS QUATRO GRAFIAS ───────────────────────────────────────────────────────
 * `412400160028000` (a chave) · `4.1.24.16.28.0` (o carnê) · `4-1-24-16-28` (a
 * tela do geoportal) · `41241628` (quem copia a tela à mão). As três primeiras
 * dizem sozinhas onde cada grupo termina; a quarta, **não**.
 *
 * ── A NOTA SEGUE A GRAFIA, PORQUE A GRAFIA É A EVIDÊNCIA ────────────────────
 * Pontuado é assinatura: seis grupos com aquele desenho não são outra coisa.
 * Os 15 dígitos crus também se bastam — nenhum outro identificador da bancada
 * tem esse comprimento. Já o IQ colado PISA em cima do que a bancada lê, e o
 * peso tem de reconhecer isso. Medido nas 82.603 chaves do cadastro:
 *
 *   10 e 9 dígitos → não colidem com nada, e são raros (1.038 lotes)
 *    8 dígitos     → é o comprimento do CEP, mas ZERO deles é CEP existente
 *    7 dígitos     → 81 são geocódigo do IBGE de verdade → tem de ficar abaixo
 *                    do card de município (0,95), senão o ranking mente
 *    6 e 5 dígitos → 1.166 são plaqueta de poste; aqui o número quase não
 *                    discrimina, e a nota diz isso
 */
function confianca(texto: string, ambiguo: boolean): number {
  const n = texto.replace(/\D/g, "").length;
  const base = /[.\-/ ]/.test(texto)
    ? 0.92
    : n >= 12
      ? 0.9
      : n >= 9
        ? 0.85
        : n === 8
          ? 0.82
          : n === 7
            ? 0.7
            : n === 6
              ? 0.55
              : 0.45;
  // Dois ou três lotes reais respondem ao mesmo número: cada card é metade de
  // uma resposta, e a nota não pode fingir que é inteira.
  return ambiguo ? Number((base * 0.8).toFixed(2)) : base;
}

/**
 * "00" é o vazio disfarçado do cadastro — e ele também escreve "000", "0000" e
 * "0". Nenhum é número de porta, e imprimir "7 DE SETEMBRO, 00" seria inventar
 * um endereço que não existe.
 */
const numeroDeVerdade = (n: string | null | undefined): boolean => !!n && /[1-9]/.test(n);

/**
 * Os endereços do lote, do mais completo para o mais pobre.
 *
 * O campo `enderecos` existe quando o conjunto não cabe em `logradouro` +
 * `numero`: lote de ESQUINA (mais de uma porta) ou endereço de outra rua. Ele
 * já vem com o conjunto inteiro, então quando existe ele SUBSTITUI o par — não
 * se soma a ele, senão o endereço principal apareceria duas vezes.
 */
function enderecos(l: LoteBlumenau): string[] {
  const conjunto = (l.enderecos ?? "")
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean);
  if (conjunto.length) return conjunto;
  const um = [l.logradouro, numeroDeVerdade(l.numero) ? l.numero : null].filter(Boolean).join(", ");
  return um ? [um] : [];
}

function cartao(l: LoteBlumenau, score: number, ambiguo: boolean) {
  const lista = enderecos(l);
  const endereco = lista.join(" · ");
  const detalhe = [
    l.bairro,
    l.areaM2 ? `${l.areaM2.toLocaleString("pt-BR")} m²` : null,
    // A esquina é a informação, não um detalhe de formatação: é ela que
    // responde "a casa da esquina da X com a Y".
    lista.length > 1 ? `esquina — ${lista.length} endereços` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const grafia = l.iq ?? l.inscricao ?? "";

  const data: LocationData = {
    lat: l.lat as number,
    lng: l.lng as number,
    label: endereco || `Lote ${grafia}`,
    // O centroide não é a porta, e quem for até lá precisa saber disso.
    detail: ambiguo
      ? `${detalhe} — leitura ${grafia}; o hífen desempata. Ponto no centro do lote`
      : `${detalhe} — ponto no centro do lote, não na entrada`,
    format: "Inscrição imobiliária (Blumenau)",
  };

  return {
    decoderId: "lote-blumenau",
    decoderName: "Inscrição imobiliária (Blumenau)",
    category: "lookup" as const,
    label: grafia,
    // A grafia entra na saída quando há mais de um candidato: o motor deduplica
    // por texto exato, e dois lotes da mesma rua sem número colidiriam.
    output: ambiguo ? `${grafia} → ${endereco} — ${detalhe}` : `${endereco} — ${detalhe}`,
    forcedScore: score,
    render: "map" as const,
    // Encadeia a coordenada: é ela que vira entrada de outra camada.
    chainValue: `${l.lat}, ${l.lng}`,
    data,
  };
}

export const decoders = defineDecoder({
  id: "lote-blumenau",
  name: "Inscrição imobiliária (Blumenau)",
  category: "lookup",
  decode(input, ctx) {
    const texto = input.trim();
    if (ctx.hits?.q !== texto) return [];

    // Um acerto exato, ou os candidatos do número colado — nunca os dois.
    const achados = ctx.hits.lote ? [ctx.hits.lote] : (ctx.hits.lotes ?? []);
    const ambiguo = achados.length > 1;
    const score = confianca(texto, ambiguo);

    return achados
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => cartao(l, score, ambiguo));
  },
});
