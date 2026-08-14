import { parseTituloEleitor } from "@/features/reference/titulo-eleitor";
import { defineDecoder } from "../define";

/**
 * Título de eleitor → estado de emissão. O "o nome já é o número" mais barato
 * do catálogo: os dígitos 9–10 do título dizem em qual UF a pessoa vota.
 *
 * GATE ANTI-RUÍDO (três travas em série):
 *  1. só dígitos e espaços, exatamente 12 dígitos. Nada de ponto, vírgula,
 *     traço ou sinal — é o que impede uma coordenada ("-26.9081 -48.6612",
 *     12 dígitos quando se limpa a pontuação) de virar título;
 *  2. o código de UF tem de existir (01–28) — corta 72% do espaço;
 *  3. os DOIS verificadores em módulo 11 têm de fechar.
 * Medido em 500 mil números aleatórios de 12 dígitos: dispara 1 em 349 (0,3%).
 * Na sonda de ruído real — CEP, CPF, telefone com e sem DDI, coordenada, data,
 * EAN-13, Base64, prosa — não dispara em nada: nenhum desses tem 12 dígitos.
 *
 * A colisão de comprimento que existe de verdade é o UPC-A (código de barras
 * de 12 dígitos, já coberto por `barcode`), e ela é benigna: o UPC-A tem
 * verificador próprio, então os dois só aparecem juntos quando o número
 * satisfaz módulo 10 E módulo 11 duas vezes — 1 UPC-A em 346, medido. Nesse
 * caso mostrar as duas leituras é exatamente o que a bancada existe para fazer.
 *
 * Título inválido NÃO gera cartão. Emitir "inválido" transformaria todo número
 * de 12 dígitos num resultado, que é o oposto do gate.
 */
export const decoders = defineDecoder({
  id: "titulo-eleitor",
  name: "Título de eleitor (UF)",
  category: "lookup",
  decode(input) {
    const raw = input.trim();
    if (!/^\d[\d ]*\d$/.test(raw)) return [];

    const digits = raw.replace(/ /g, "");
    const titulo = parseTituloEleitor(digits);
    if (!titulo) return [];

    const { uf } = titulo;
    return [
      {
        decoderId: "titulo-eleitor",
        decoderName: "Título de eleitor (UF)",
        category: "lookup",
        label: `${titulo.formatted} · DVs conferem`,
        output: `${uf.name} (${uf.sigla})`,
        notes: `Inscrição ${titulo.inscricao} · UF ${uf.code} · verificadores ${titulo.dv}`,
        forcedScore: 0.95,
        // Encadeia a sigla: é a resposta curta que a próxima etapa costuma
        // pedir (e o nome por extenso está no cartão, para copiar).
        chainValue: uf.sigla,
        render: "code-list",
        data: [{ code: uf.code, name: uf.name, detail: `${uf.sigla} · ${titulo.formatted}` }],
      },
    ];
  },
});
