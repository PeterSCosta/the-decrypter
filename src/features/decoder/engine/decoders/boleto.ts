import { type BoletoInfo, lerBoleto } from "@/features/reference/boleto";
import { defineDecoder } from "../define";

const ID = "boleto";
const NAME = "Boleto / conta de consumo";

/**
 * Boleto bancário e conta de consumo: 44 dígitos do código de barras, 47 da
 * linha digitável bancária ou 48 da arrecadação. Devolve banco, moeda, valor
 * e — o ponto alto numa gincana — o VENCIMENTO, que vem cifrado no "fator de
 * vencimento" de 4 dígitos. O fator é ambíguo desde o reinício de 22/02/2025,
 * então o painel mostra as duas leituras e deixa a escolha com a equipe.
 *
 * GATE ANTI-RUÍDO: só dígitos (admite ponto/espaço/hífen, que é como a linha
 * digitável é impressa), comprimento exatamente 44/47/48, moeda 9 no bancário
 * ou "8" inicial na arrecadação, E o dígito verificador tem de fechar (módulo
 * 11 no geral do bancário, módulo 10 nos campos da linha de 47, e módulo 10 ou
 * 11 na arrecadação conforme a 3ª posição). Com o DV obrigatório, CEP, CPF,
 * telefone, coordenada, data, Base64 e prosa não têm como disparar.
 */
export const decoders = defineDecoder({
  id: ID,
  name: NAME,
  category: "lookup",
  decode(input, ctx) {
    const solo = ctx.only === ID;
    const info = lerBoleto(input, solo);
    if (!info) return [];

    return [
      {
        decoderId: ID,
        decoderName: NAME,
        category: "lookup",
        label: rotulo(info),
        output: info.resumo,
        notes: notas(info),
        // Painel de leitura, não texto claro: acima do corte do partition
        // porque, quando o DV fecha, o resultado É a resposta. Sem DV o
        // decoder nem chega aqui (fora do modo "uma cifra só").
        forcedScore: info.dvOk ? 0.92 : 0.3,
        render: "code-list",
        data: info.campos,
        // Encadeia o campo livre: é a única parte que este decoder não
        // interpreta, e é onde a prova costuma esconder o próximo passo.
        chainValue: info.campoLivre,
      },
    ];
  },
});

function rotulo(info: BoletoInfo): string {
  const tipo = info.tipo === "bancario" ? "boleto bancário" : "arrecadação";
  return `${tipo} · ${info.origem}${info.dvOk ? "" : " · DV não confere"}`;
}

function notas(info: BoletoInfo): string {
  const partes: string[] = [];
  const v = info.vencimento;
  if (v?.atual && v.antiga) {
    partes.push(
      `Fator ${v.fator} é ambíguo: ${v.atual} pela contagem reiniciada em 22/02/2025 e ` +
        `${v.antiga} pela original (1000 = 03/07/2000). Confira as duas.`,
    );
  }
  if (info.tipo === "arrecadacao") {
    partes.push("Arrecadação não tem fator de vencimento: a data mora no campo livre.");
  }
  if (!info.dvOk) partes.push("O dígito verificador não fecha — código truncado ou inventado.");
  partes.push(`Código de barras: ${info.barras}`);
  return partes.join(" ");
}
