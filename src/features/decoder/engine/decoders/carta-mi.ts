import { MI_SEM_CONVERSAO, decodeMiSheet } from "@/features/location/carta-ibge";
import { defineDecoder } from "../define";

/**
 * Número do Mapa Índice (MI) da carta topográfica IBGE/DSG.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ─────────────────────────────────────────────
 * O `decodeMiSheet` foi escrito, testado e ficou MORTO: a revisão mediu e
 * achou zero referências a ele fora do próprio módulo. Ou seja, digitar
 * `MI 2868-1` na bancada não mostrava nada, enquanto a ficha do formato anuncia
 * "articulação MI" na aba de Geolocalização. Código que funciona e não é
 * alcançável pela tela é o mesmo que código que não existe.
 *
 * ── POR QUE ELE NÃO DEVOLVE COORDENADA, E ISSO É A PARTE CERTA ──────────────
 * A correspondência entre o MI e a nomenclatura da carta é uma TABELA de ~3.036
 * folhas, não uma fórmula — o próprio Mapa Índice Digital guarda as duas como
 * colunas separadas. Inventar a conversão daria ponto errado com cara de certo,
 * que é o pior defeito que esta bancada pode ter. Então o card afirma só o que
 * dá para afirmar: que aquilo é um MI, em que escala, e onde procurar.
 *
 * ── A NOTA ──────────────────────────────────────────────────────────────────
 * `MI` na frente é assinatura literal — nenhum outro identificador daqui se
 * escreve assim. Mas o card entrega meia resposta (nomeia, não localiza), e
 * 0,55 é onde a casa põe meia resposta: acima do corte, longe do topo.
 */
export const decoders = defineDecoder({
  id: "carta-mi",
  name: "Carta IBGE/DSG (número MI)",
  category: "lookup",
  decode(input) {
    const hit = decodeMiSheet(input);
    if (!hit) return [];

    const escalas = hit.scales.map((s) => `1:${s.toLocaleString("pt-BR")}`).join(" ou ");
    return [
      {
        decoderId: "carta-mi",
        decoderName: "Carta IBGE/DSG (número MI)",
        category: "lookup" as const,
        label: hit.label,
        output: `Folha ${hit.label} — ${escalas}`,
        notes: MI_SEM_CONVERSAO,
        forcedScore: 0.55,
      },
    ];
  },
});
